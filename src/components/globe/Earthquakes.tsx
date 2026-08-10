"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import {
  magnitudeColor,
  magnitudeSize,
  timeAgo,
  useEarthquakes,
} from "@/lib/earthquakes";

const SURFACE = GLOBE_RADIUS + 0.012;
const dummy = new THREE.Object3D();

/** Live earthquakes as instanced, magnitude-scaled glowing markers. */
export default function Earthquakes() {
  const { data } = useEarthquakes();
  const quakes = useMemo(() => data ?? [], [data]);

  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const { gl } = useThree();

  const geo = useMemo(
    () =>
      quakes.map((q) => ({
        position: latLngToVector3(q.lat, q.lng, SURFACE),
        color: magnitudeColor(q.mag),
        size: magnitudeSize(q.mag),
      })),
    [quakes],
  );

  useLayoutEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;

    geo.forEach(({ position, color, size }, i) => {
      dummy.position.copy(position);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      core.setColorAt(i, color);

      dummy.scale.setScalar(size * 2.6);
      dummy.updateMatrix();
      halo.setMatrixAt(i, dummy.matrix);
      halo.setColorAt(i, color);
    });

    core.count = geo.length;
    halo.count = geo.length;
    core.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
  }, [geo]);

  // Gentle collective pulse on the halos so the layer reads as "live".
  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const mat = haloRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 + 0.09 * Math.sin(clock.elapsedTime * 2);
  });

  if (geo.length === 0) return null;

  const count = geo.length;
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
        key={`halo-${count}`}
        ref={haloRef}
        args={[undefined, undefined, count]}
      >
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
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
          position={geo[hovered].position}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[100, 0]}
        >
          <div className="w-max max-w-[220px] -translate-y-[calc(100%+14px)] rounded-lg border border-white/10 bg-zinc-950/85 px-3 py-2 text-left shadow-lg backdrop-blur-sm">
            <div className="flex items-baseline gap-2">
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: `#${magnitudeColor(active.mag).getHexString()}` }}
              >
                M {active.mag.toFixed(1)}
              </span>
              <span className="text-[11px] text-zinc-400">
                {timeAgo(active.time)}
              </span>
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
