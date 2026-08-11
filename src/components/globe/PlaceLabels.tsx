"use client";

import { useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { CITIES } from "@/data/cities";

// Precomputed once — city positions and their (constant) distance from centre.
const POSITIONS = CITIES.map((c) =>
  latLngToVector3(c.lat, c.lng, GLOBE_RADIUS + 0.01),
);

/**
 * City/country labels that fade in as you zoom: nothing when viewing the whole
 * globe, major cities as you approach, secondary ones up close. Back-facing
 * labels are culled so they don't show through the planet.
 */
export default function PlaceLabels() {
  const [visible, setVisible] = useState<number[]>([]);
  const accum = useRef(0);
  const camDir = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    accum.current += delta;
    if (accum.current < 0.15) return; // recompute a few times a second, not per-frame
    accum.current = 0;

    const dist = camera.position.length();
    if (dist > 5.2) {
      if (visible.length) setVisible([]);
      return;
    }
    const maxTier = dist < 3.7 ? 2 : 1;
    camDir.current.copy(camera.position).normalize();

    const next: number[] = [];
    for (let i = 0; i < CITIES.length; i++) {
      if (CITIES[i].tier > maxTier) continue;
      const p = POSITIONS[i];
      const facing =
        (p.x * camDir.current.x + p.y * camDir.current.y + p.z * camDir.current.z) /
        p.length();
      if (facing > 0.3) next.push(i); // front hemisphere only
    }

    const changed =
      next.length !== visible.length || next.some((v, idx) => v !== visible[idx]);
    if (changed) setVisible(next);
  });

  return (
    <>
      {visible.map((i) => (
        <Html
          key={i}
          position={POSITIONS[i]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[6, 0]}
        >
          <span className="place-label whitespace-nowrap text-[10px] font-medium tracking-wide text-white/90 [text-shadow:_0_1px_3px_rgba(0,0,0,0.95)]">
            {CITIES[i].name}
          </span>
        </Html>
      ))}
    </>
  );
}
