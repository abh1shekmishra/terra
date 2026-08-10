"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { fibonacciSphere } from "@/lib/geo";

export const GLOBE_RADIUS = 2;

/**
 * A small soft circular sprite, generated on a canvas at runtime so we ship
 * no external image assets. Used to render each globe dot as a round glow
 * instead of a hard square.
 */
function createDotTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.85)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** The stylised dotted surface of the globe (Fibonacci-distributed points). */
function GlobeDots() {
  const geometry = useMemo(() => {
    const pts = fibonacciSphere(11000, GLOBE_RADIUS + 0.005);
    const positions = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.022,
        map: createDotTexture(),
        color: new THREE.Color("#5eead4"),
        transparent: true,
        depthWrite: false,
        sizeAttenuation: true,
        alphaTest: 0.02,
      }),
    [],
  );

  return <points geometry={geometry} material={material} />;
}

/** The dark solid core of the planet, so the far-side dots are occluded. */
function BaseSphere() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial color="#08192b" />
    </mesh>
  );
}

/** A faint outer shell that reads as an atmospheric glow. */
function Atmosphere() {
  return (
    <mesh scale={1.18}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#2b6cb0"
        transparent
        opacity={0.12}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

/** Groups the planet and slowly auto-rotates it. */
function RotatingGlobe() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.045;
  });
  return (
    <group ref={ref}>
      <BaseSphere />
      <GlobeDots />
    </group>
  );
}

export default function Globe() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#05070d"]} />
      <ambientLight intensity={0.6} />
      <Stars
        radius={120}
        depth={60}
        count={2500}
        factor={4}
        saturation={0}
        fade
        speed={0.6}
      />
      <Atmosphere />
      <RotatingGlobe />
      <OrbitControls
        enablePan={false}
        enableDamping
        minDistance={3}
        maxDistance={9}
        rotateSpeed={0.5}
      />
    </Canvas>
  );
}
