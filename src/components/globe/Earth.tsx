"use client";

import { useLayoutEffect, useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { earthFragmentShader, earthVertexShader } from "./shaders";
import { GLOBE_RADIUS } from "./constants";

/** The planet surface: real NASA day/night/relief maps driven by a custom shader. */
export default function Earth({
  sunDirection,
}: {
  sunDirection: THREE.Vector3;
}) {
  const textures = useTexture({
    day: "/textures/earth_day.jpg",
    night: "/textures/earth_night.jpg",
    normal: "/textures/earth_normal_2048.jpg",
  });

  useLayoutEffect(() => {
    textures.day.colorSpace = THREE.SRGBColorSpace;
    textures.night.colorSpace = THREE.SRGBColorSpace;
    textures.normal.colorSpace = THREE.NoColorSpace; // relief data, not colour
    for (const t of [textures.day, textures.night, textures.normal]) {
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
  }, [textures]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVertexShader,
        fragmentShader: earthFragmentShader,
        uniforms: {
          uDayMap: { value: textures.day },
          uNightMap: { value: textures.night },
          uNormalMap: { value: textures.normal },
          uSunDirection: { value: sunDirection },
          uNormalScale: { value: new THREE.Vector2(0.85, 0.85) },
        },
      }),
    [textures, sunDirection],
  );

  return (
    <mesh material={material}>
      <sphereGeometry args={[GLOBE_RADIUS, 128, 128]} />
    </mesh>
  );
}
