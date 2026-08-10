"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { domeFragmentShader, domeVertexShader } from "./shaders";
import {
  feltRadiusKm,
  feltRadiusWorld,
  magnitudeColor,
  timeAgo,
  useEarthquakes,
} from "@/lib/earthquakes";

const CORE_SURFACE = GLOBE_RADIUS + 0.008;
const DOME_SURFACE = GLOBE_RADIUS + 0.002;
const UP = new THREE.Vector3(0, 1, 0);

const dummy = new THREE.Object3D();
const quat = new THREE.Quaternion();

function coreSize(mag: number): number {
  return THREE.MathUtils.clamp(0.005 + Math.max(0, mag) * 0.0014, 0.005, 0.015);
}

/** Live earthquakes: a bright epicentre plus a real-scale 3D shockwave dome. */
export default function Earthquakes() {
  const { data } = useEarthquakes();
  const quakes = useMemo(() => data ?? [], [data]);
  const count = quakes.length;

  const coreRef = useRef<THREE.InstancedMesh>(null);
  const domeRef = useRef<THREE.InstancedMesh>(null);
  const domeMat = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const [hovered, setHovered] = useState<number | null>(null);

  const { corePos, colors, aColor, aSeed, aSpeed } = useMemo(() => {
    const corePos = quakes.map((q) => latLngToVector3(q.lat, q.lng, CORE_SURFACE));
    const colors = quakes.map((q) => magnitudeColor(q.mag));
    const aColor = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    quakes.forEach((q, i) => {
      colors[i].toArray(aColor, i * 3);
      aSeed[i] = Math.random();
      aSpeed[i] = 0.22 + (Math.max(0, q.mag) / 7) * 0.16;
    });
    return { corePos, colors, aColor, aSeed, aSpeed };
  }, [quakes, count]);

  useLayoutEffect(() => {
    const core = coreRef.current;
    const dome = domeRef.current;
    if (!core || !dome) return;

    quakes.forEach((q, i) => {
      const p = corePos[i];

      dummy.position.copy(p);
      dummy.quaternion.identity();
      dummy.scale.setScalar(coreSize(q.mag));
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      core.setColorAt(i, colors[i]);

      // Hemisphere anchored on the surface, scaled to the real felt radius.
      const normal = p.clone().normalize();
      const radius = Math.max(feltRadiusWorld(q.mag, q.depth, GLOBE_RADIUS), 0.002);
      quat.setFromUnitVectors(UP, normal);
      dummy.position.copy(normal.multiplyScalar(DOME_SURFACE));
      dummy.quaternion.copy(quat);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      dome.setMatrixAt(i, dummy.matrix);
    });

    core.count = count;
    dome.count = count;
    core.instanceMatrix.needsUpdate = true;
    dome.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
  }, [quakes, corePos, colors, count]);

  useFrame(({ clock }) => {
    if (domeMat.current) domeMat.current.uniforms.uTime.value = clock.elapsedTime;
  });

  if (count === 0) return null;

  const active = hovered !== null ? quakes[hovered] : null;
  const activeFelt = active ? Math.round(feltRadiusKm(active.mag, active.depth)) : 0;

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      setHovered(e.instanceId);
      gl.domElement.style.cursor = "pointer";
    }
  };
  const handleOut = () => {
    setHovered(null);
    gl.domElement.style.cursor = "auto";
  };

  return (
    <group>
      <instancedMesh
        key={`dome-${count}`}
        ref={domeRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]}>
          <instancedBufferAttribute attach="attributes-aColor" args={[aColor, 3]} />
          <instancedBufferAttribute attach="attributes-aSeed" args={[aSeed, 1]} />
          <instancedBufferAttribute attach="attributes-aSpeed" args={[aSpeed, 1]} />
        </sphereGeometry>
        <shaderMaterial
          ref={domeMat}
          vertexShader={domeVertexShader}
          fragmentShader={domeFragmentShader}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>

      <instancedMesh
        key={`core-${count}`}
        ref={coreRef}
        args={[undefined, undefined, count]}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {active && hovered !== null && (
        <Html
          position={corePos[hovered]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[100, 0]}
        >
          <div className="relative -translate-y-[calc(100%+14px)]">
            <div className="w-max max-w-[240px] rounded-xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/50 backdrop-blur-md">
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: `#${magnitudeColor(active.mag).getHexString()}` }}
                />
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: `#${magnitudeColor(active.mag).getHexString()}` }}
                >
                  M {active.mag.toFixed(1)}
                </span>
                <span className="ml-auto text-[11px] text-zinc-400">
                  {timeAgo(active.time)}
                </span>
              </div>
              <div className="px-3 pb-0.5 pt-1.5 text-xs leading-snug text-zinc-200">
                {active.place}
              </div>
              <div className="flex gap-3 px-3 pb-2.5 pt-1 text-[11px] tabular-nums text-zinc-500">
                <span>Depth {active.depth.toFixed(0)} km</span>
                <span>Felt ~{activeFelt > 0 ? `${activeFelt} km` : "local"}</span>
              </div>
            </div>
            <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-white/10 bg-zinc-950/80" />
          </div>
        </Html>
      )}
    </group>
  );
}
