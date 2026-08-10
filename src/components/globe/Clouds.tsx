"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { cloudsFragmentShader, cloudsVertexShader } from "./shaders";
import { GLOBE_RADIUS } from "./constants";

/** A thin cloud shell drifting slowly for a sense of motion and parallax. */
export default function Clouds({
  sunDirection,
}: {
  sunDirection: THREE.Vector3;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudMap = useTexture("/textures/earth_clouds_1024.png");

  useLayoutEffect(() => {
    cloudMap.anisotropy = 8;
    cloudMap.minFilter = THREE.LinearMipmapLinearFilter;
    cloudMap.magFilter = THREE.LinearFilter;
    cloudMap.generateMipmaps = true;
    cloudMap.needsUpdate = true;
  }, [cloudMap]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: cloudsVertexShader,
        fragmentShader: cloudsFragmentShader,
        uniforms: {
          uCloudMap: { value: cloudMap },
          uSunDirection: { value: sunDirection },
        },
        transparent: true,
        depthWrite: false,
      }),
    [cloudMap, sunDirection],
  );

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.006;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[GLOBE_RADIUS * 1.012, 96, 96]} />
    </mesh>
  );
}
