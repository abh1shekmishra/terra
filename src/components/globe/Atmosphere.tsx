"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { atmosphereFragmentShader, atmosphereVertexShader } from "./shaders";
import { GLOBE_RADIUS } from "./constants";

/** Back-facing shell rendered additively to read as atmospheric scattering. */
export default function Atmosphere() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  return (
    <mesh scale={1.16} material={material}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
    </mesh>
  );
}
