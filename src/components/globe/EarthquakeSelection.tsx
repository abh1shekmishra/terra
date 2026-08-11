"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { EARTH_RADIUS_KM } from "@/lib/earthquakes";
import { GLOBE_RADIUS } from "./constants";
import { useSelectionStore } from "@/store/useSelectionStore";

const UP_Z = new THREE.Vector3(0, 0, 1);

/**
 * Marks the currently-selected earthquake on the globe: a pulsing ring at the
 * epicentre (so you can see which one you clicked) plus a "probe" descending to
 * the real hypocentre depth (a mini X-ray of how deep it was). Drawn over the
 * Earth so it reads clearly.
 */
export default function EarthquakeSelection() {
  const selected = useSelectionStore((s) => s.selected);
  const quake = selected?.kind === "earthquake" ? selected.data : null;
  const ringRef = useRef<THREE.Mesh>(null);

  const geo = useMemo(() => {
    if (!quake) return null;
    const dir = latLngToVector3(quake.lat, quake.lng, 1).normalize();
    const surface = dir.clone().multiplyScalar(GLOBE_RADIUS + 0.006);
    const depthWorld = Math.min(
      (quake.depth / EARTH_RADIUS_KM) * GLOBE_RADIUS,
      GLOBE_RADIUS * 0.6,
    );
    const hypo = dir.clone().multiplyScalar(GLOBE_RADIUS - depthWorld);
    const quat = new THREE.Quaternion().setFromUnitVectors(UP_Z, dir);
    const probe = new THREE.BufferGeometry().setFromPoints([surface, hypo]);
    return { surface, hypo, quat, probe };
  }, [quake]);

  useFrame(({ clock }) => {
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + 0.18 * Math.sin(clock.elapsedTime * 4));
    }
  });

  if (!quake || !geo) return null;

  return (
    <group>
      <mesh ref={ringRef} position={geo.surface} quaternion={geo.quat}>
        <torusGeometry args={[0.05, 0.006, 8, 44]} />
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
          transparent
          opacity={0.9}
          depthTest={false}
        />
      </mesh>

      <lineSegments geometry={geo.probe} frustumCulled={false}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.5}
          depthTest={false}
          toneMapped={false}
        />
      </lineSegments>

      <mesh position={geo.hypo}>
        <sphereGeometry args={[0.012, 10, 10]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} depthTest={false} />
      </mesh>
    </group>
  );
}
