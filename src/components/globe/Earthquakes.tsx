"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { rippleFragmentShader, rippleVertexShader } from "./shaders";
import {
  magnitudeColor,
  timeAgo,
  useEarthquakes,
} from "@/lib/earthquakes";

const CORE_SURFACE = GLOBE_RADIUS + 0.01;
const RING_SURFACE = GLOBE_RADIUS + 0.006;
const UP = new THREE.Vector3(0, 0, 1);

const dummy = new THREE.Object3D();
const quat = new THREE.Quaternion();

function coreSize(mag: number): number {
  return THREE.MathUtils.clamp(0.006 + Math.max(0, mag) * 0.0016, 0.006, 0.018);
}
function ringRadius(mag: number): number {
  return 0.045 + Math.max(0, mag) * 0.022;
}

/** Live earthquakes as bright epicenters emitting animated shockwave ripples. */
export default function Earthquakes() {
  const { data } = useEarthquakes();
  const quakes = useMemo(() => data ?? [], [data]);
  const count = quakes.length;

  const coreRef = useRef<THREE.InstancedMesh>(null);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const rippleMat = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  const [hovered, setHovered] = useState<number | null>(null);

  // Per-quake geometry + instanced attribute buffers, rebuilt when data changes.
  const { corePos, colors, aColor, aSeed, aSpeed } = useMemo(() => {
    const corePos = quakes.map((q) => latLngToVector3(q.lat, q.lng, CORE_SURFACE));
    const colors = quakes.map((q) => magnitudeColor(q.mag));
    const aColor = new Float32Array(count * 3);
    const aSeed = new Float32Array(count);
    const aSpeed = new Float32Array(count);
    quakes.forEach((q, i) => {
      colors[i].toArray(aColor, i * 3);
      aSeed[i] = Math.random();
      aSpeed[i] = 0.28 + (Math.max(0, q.mag) / 7) * 0.22;
    });
    return { corePos, colors, aColor, aSeed, aSpeed };
  }, [quakes, count]);

  useLayoutEffect(() => {
    const core = coreRef.current;
    const ring = ringRef.current;
    if (!core || !ring) return;

    quakes.forEach((q, i) => {
      const p = corePos[i];

      dummy.position.copy(p);
      dummy.quaternion.identity();
      dummy.scale.setScalar(coreSize(q.mag));
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      core.setColorAt(i, colors[i]);

      // Ripple disc laid flat against the surface (its +Z faces outward).
      const normal = p.clone().normalize();
      quat.setFromUnitVectors(UP, normal);
      dummy.position.copy(normal.multiplyScalar(RING_SURFACE));
      dummy.quaternion.copy(quat);
      dummy.scale.setScalar(ringRadius(q.mag));
      dummy.updateMatrix();
      ring.setMatrixAt(i, dummy.matrix);
    });

    core.count = count;
    ring.count = count;
    core.instanceMatrix.needsUpdate = true;
    ring.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
  }, [quakes, corePos, colors, count]);

  useFrame(({ clock }) => {
    if (rippleMat.current) rippleMat.current.uniforms.uTime.value = clock.elapsedTime;
  });

  if (count === 0) return null;

  const active = hovered !== null ? quakes[hovered] : null;

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
        key={`ring-${count}`}
        ref={ringRef}
        args={[undefined, undefined, count]}
        frustumCulled={false}
      >
        <circleGeometry args={[1, 48]}>
          <instancedBufferAttribute attach="attributes-aColor" args={[aColor, 3]} />
          <instancedBufferAttribute attach="attributes-aSeed" args={[aSeed, 1]} />
          <instancedBufferAttribute attach="attributes-aSpeed" args={[aSpeed, 1]} />
        </circleGeometry>
        <shaderMaterial
          ref={rippleMat}
          vertexShader={rippleVertexShader}
          fragmentShader={rippleFragmentShader}
          uniforms={{ uTime: { value: 0 } }}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
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
          <div
            className="w-max max-w-[220px] -translate-y-[calc(100%+14px)] rounded-lg border-l-2 bg-zinc-950/85 py-2 pl-2.5 pr-3 text-left shadow-xl backdrop-blur-sm"
            style={{ borderLeftColor: `#${magnitudeColor(active.mag).getHexString()}` }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: `#${magnitudeColor(active.mag).getHexString()}` }}
              >
                M {active.mag.toFixed(1)}
              </span>
              <span className="text-[11px] text-zinc-400">{timeAgo(active.time)}</span>
            </div>
            <div className="mt-0.5 text-xs leading-snug text-zinc-200">
              {active.place}
            </div>
            <div className="mt-1 text-[11px] tabular-nums text-zinc-500">
              Depth {active.depth.toFixed(0)} km
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
