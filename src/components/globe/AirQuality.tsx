"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { aqiColor, sampleAqi, useAirQuality } from "@/lib/airQuality";

const LIFT = GLOBE_RADIUS + 0.012;
const RENDER_STEP = 5; // degrees between rendered blobs (finer than the data grid)
const dummy = new THREE.Object3D();
const _c = new THREE.Color();

/** A soft radial blob so many overlapping instances read as a smooth heat field. */
function createBlobTexture(): THREE.CanvasTexture {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Live air quality (US AQI) as a global pollution heat field: soft, camera-facing
 * blobs on a fine lattice, sampled from the coarse Open-Meteo grid, coloured on
 * the EPA scale (green -> yellow -> orange -> red -> purple) and grown where the
 * air is worse, so hotspots like northern India and eastern China stand out.
 */
export default function AirQuality() {
  const { data } = useAirQuality(true);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createBlobTexture(), []);

  const points = useMemo(() => {
    if (!data || data.aqi.length === 0) return [];
    const out: { pos: THREE.Vector3; aqi: number }[] = [];
    for (let lat = -80; lat <= 80; lat += RENDER_STEP) {
      for (let lng = -180; lng < 180; lng += RENDER_STEP) {
        out.push({
          pos: latLngToVector3(lat, lng, LIFT),
          aqi: sampleAqi(data, lat, lng),
        });
      }
    }
    return out;
  }, [data]);

  const count = points.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) mesh.setColorAt(i, aqiColor(points[i].aqi, _c));
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, count]);

  useFrame(({ camera }) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    for (let i = 0; i < count; i++) {
      const p = points[i];
      dummy.position.copy(p.pos);
      dummy.lookAt(camera.position); // billboard toward the viewer
      const severity = Math.min(p.aqi / 170, 1.4); // 0 clean .. ~1.4 hazardous
      // Small/faint where air is clean, growing into a heat blob where it's bad,
      // so hotspots stand out instead of a uniform dotted field.
      dummy.scale.setScalar(0.035 + severity * severity * 0.18);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      key={`aqi-${count}`}
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
        toneMapped={false}
      />
    </instancedMesh>
  );
}
