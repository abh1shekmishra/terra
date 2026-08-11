"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { latLngToVector3 } from "@/lib/geo";
import { EARTH_RADIUS_KM } from "@/lib/earthquakes";
import { GLOBE_RADIUS } from "./constants";
import {
  satelliteColor,
  useSatellites,
  type SatelliteTle,
} from "@/lib/satellites";
import { useSelectionStore } from "@/store/useSelectionStore";

type SatRec = ReturnType<typeof satellite.twoline2satrec>;

// Compress true altitude so LEO sits just off the surface and GEO stays on-screen.
const ALT_SCALE = 0.35;
const UPDATE_INTERVAL = 0.08; // seconds between propagation passes
const dummy = new THREE.Object3D();

interface Rec {
  tle: SatelliteTle;
  satrec: SatRec;
  color: THREE.Color;
}

function orbitRadius(altKm: number): number {
  return GLOBE_RADIUS + (altKm / EARTH_RADIUS_KM) * GLOBE_RADIUS * ALT_SCALE;
}

/** Real satellites, propagated from TLEs with SGP4 each tick. */
export default function Satellites() {
  const { data } = useSatellites(true);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl } = useThree();
  const select = useSelectionStore((s) => s.select);
  const accum = useRef(0);

  const recs = useMemo<Rec[]>(() => {
    const sats = data?.satellites ?? [];
    const out: Rec[] = [];
    for (const tle of sats) {
      try {
        const satrec = satellite.twoline2satrec(tle.l1, tle.l2);
        if (satrec.error === 0) {
          out.push({
            tle,
            satrec,
            color: new THREE.Color(satelliteColor(tle.group)),
          });
        }
      } catch {
        // skip malformed elements
      }
    }
    return out;
  }, [data]);

  const count = recs.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    recs.forEach((r, i) => mesh.setColorAt(i, r.color));
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [recs, count]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    accum.current += delta;
    if (accum.current < UPDATE_INTERVAL) return;
    accum.current = 0;

    const now = new Date();
    const gmst = satellite.gstime(now);
    for (let i = 0; i < count; i++) {
      const pv = satellite.propagate(recs[i].satrec, now);
      const eci = pv.position;
      if (!eci || typeof eci === "boolean") {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const geo = satellite.eciToGeodetic(eci, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lng = satellite.degreesLong(geo.longitude);
      dummy.position.copy(latLngToVector3(lat, lng, orbitRadius(geo.height)));
      dummy.scale.setScalar(0.012);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const rec = recs[e.instanceId];
    const now = new Date();
    const pv = satellite.propagate(rec.satrec, now);
    if (!pv.position || typeof pv.position === "boolean") return;
    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const velocity =
      pv.velocity && typeof pv.velocity !== "boolean"
        ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z)
        : 0;
    select({
      kind: "satellite",
      data: {
        id: String(rec.satrec.satnum),
        name: rec.tle.name,
        group: rec.tle.group,
        altKm: geo.height,
        velKms: velocity,
        incDeg: satellite.radiansToDegrees(rec.satrec.inclo),
        periodMin: rec.satrec.no ? (2 * Math.PI) / rec.satrec.no : 0,
        lat: satellite.degreesLat(geo.latitude),
        lng: satellite.degreesLong(geo.longitude),
      },
    });
  };

  return (
    <instancedMesh
      key={`sats-${count}`}
      ref={meshRef}
      args={[undefined, undefined, count]}
      onClick={handleClick}
      onPointerOver={() => (gl.domElement.style.cursor = "pointer")}
      onPointerOut={() => (gl.domElement.style.cursor = "auto")}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
