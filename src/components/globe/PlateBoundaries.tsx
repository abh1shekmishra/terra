"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";

const RADIUS = GLOBE_RADIUS + 0.004;

interface PlateFeature {
  geometry: { type: string; coordinates: number[][] | number[][][] };
}
interface PlateCollection {
  features: PlateFeature[];
}

function usePlates() {
  return useQuery({
    queryKey: ["plate-boundaries"],
    staleTime: Infinity,
    queryFn: async (): Promise<PlateCollection> => {
      const res = await fetch("/data/plate-boundaries.json");
      if (!res.ok) throw new Error(`plate boundaries ${res.status}`);
      return res.json();
    },
  });
}

/** Tectonic plate boundaries as a faint line overlay — quakes trace them. */
export default function PlateBoundaries() {
  const { data } = usePlates();

  const geometry = useMemo(() => {
    if (!data) return null;
    const positions: number[] = [];
    const v = new THREE.Vector3();
    const addLine = (coords: number[][]) => {
      for (let i = 0; i < coords.length - 1; i++) {
        const a = coords[i];
        const b = coords[i + 1];
        v.copy(latLngToVector3(a[1], a[0], RADIUS));
        positions.push(v.x, v.y, v.z);
        v.copy(latLngToVector3(b[1], b[0], RADIUS));
        positions.push(v.x, v.y, v.z);
      }
    };
    for (const f of data.features) {
      if (f.geometry.type === "LineString") {
        addLine(f.geometry.coordinates as number[][]);
      } else if (f.geometry.type === "MultiLineString") {
        for (const line of f.geometry.coordinates as number[][][]) addLine(line);
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [data]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        color="#fb923c"
        transparent
        opacity={0.4}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
