"use client";

import { Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import Earth from "./Earth";
import Clouds from "./Clouds";
import Atmosphere from "./Atmosphere";
import Earthquakes from "./Earthquakes";
import { getSunDirection } from "@/lib/sun";
import { useLayerStore } from "@/store/useLayerStore";

const CAMERA_DISTANCE = 6.4;

/** Keeps the sun vector aligned with the real current time, every frame. */
function SunUpdater({ sunDirection }: { sunDirection: THREE.Vector3 }) {
  useFrame(() => {
    getSunDirection(new Date(), sunDirection);
  });
  return null;
}

export default function Scene() {
  const layers = useLayerStore((s) => s.enabled);

  // Shared, mutated-in-place so Earth and Clouds read the same live sun vector.
  const sunDirection = useMemo(() => getSunDirection(new Date()), []);

  // Start on the daylit side, but offset ~32° off the sun so the light rakes
  // across from the side — revealing terrain relief and a terminator edge
  // (a head-on sun looks flat). Lands the visitor on a lit, three-quarter Earth.
  const cameraPosition = useMemo(() => {
    const dir = sunDirection
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(32))
      .multiplyScalar(CAMERA_DISTANCE);
    return dir.toArray() as [number, number, number];
  }, [sunDirection]);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#05070d"]} />
      <Stars
        radius={140}
        depth={70}
        count={2600}
        factor={4}
        saturation={0}
        fade
        speed={0.4}
      />

      <SunUpdater sunDirection={sunDirection} />
      <Suspense fallback={null}>
        <Earth sunDirection={sunDirection} />
        <Clouds sunDirection={sunDirection} />
      </Suspense>
      <Atmosphere />
      {layers.earthquakes && <Earthquakes />}

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.6}
        maxDistance={11}
        rotateSpeed={0.45}
        zoomSpeed={0.7}
      />
    </Canvas>
  );
}
