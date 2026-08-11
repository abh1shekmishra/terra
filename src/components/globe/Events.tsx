"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { categoryColor, useEvents } from "@/lib/events";
import { useSelectionStore } from "@/store/useSelectionStore";
import { STEPS, WINDOW_MS, useTimeStore } from "@/store/useTimeStore";

const SURFACE = GLOBE_RADIUS + 0.014;
const dummy = new THREE.Object3D();

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

/** Live natural events (wildfires, storms, volcanoes) as category-coloured markers. */
export default function Events() {
  const { data } = useEvents(true);
  const events = useMemo(() => data?.events ?? [], [data]);
  const count = events.length;

  const coreRef = useRef<THREE.InstancedMesh>(null);
  const haloRef = useRef<THREE.InstancedMesh>(null);
  const { gl } = useThree();
  const select = useSelectionStore((s) => s.select);
  const [hovered, setHovered] = useState<number | null>(null);

  const live = useTimeStore((s) => s.live);
  const windowKey = useTimeStore((s) => s.windowKey);
  const step = useTimeStore((s) => (s.live ? -1 : Math.round(s.progress * STEPS)));

  const { positions, colors, times } = useMemo(() => {
    const positions = events.map((e) => latLngToVector3(e.lat, e.lng, SURFACE));
    const colors = events.map((e) => new THREE.Color(categoryColor(e.cat)));
    const times = events.map((e) => new Date(e.date).getTime());
    return { positions, colors, times };
  }, [events]);

  useLayoutEffect(() => {
    const core = coreRef.current;
    const halo = haloRef.current;
    if (!core || !halo) return;

    const cursor = live
      ? Infinity
      : Date.now() - WINDOW_MS[windowKey] * (1 - step / STEPS);

    positions.forEach((_, i) => {
      const visible = live || times[i] <= cursor;
      dummy.position.copy(positions[i]);
      dummy.scale.setScalar(visible ? 0.011 : 0);
      dummy.updateMatrix();
      core.setMatrixAt(i, dummy.matrix);
      core.setColorAt(i, colors[i]);

      dummy.scale.setScalar(visible ? 0.028 : 0);
      dummy.updateMatrix();
      halo.setMatrixAt(i, dummy.matrix);
      halo.setColorAt(i, colors[i]);
    });

    core.count = count;
    halo.count = count;
    core.instanceMatrix.needsUpdate = true;
    halo.instanceMatrix.needsUpdate = true;
    if (core.instanceColor) core.instanceColor.needsUpdate = true;
    if (halo.instanceColor) halo.instanceColor.needsUpdate = true;
  }, [positions, colors, times, count, step, live, windowKey]);

  useFrame(({ clock }) => {
    if (!haloRef.current) return;
    const mat = haloRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.14 + 0.1 * Math.sin(clock.elapsedTime * 2.2);
  });

  if (count === 0) return null;

  const active = hovered !== null ? events[hovered] : null;

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
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      select({ kind: "event", data: events[e.instanceId] });
    }
  };

  return (
    <group>
      <instancedMesh
        key={`ehalo-${count}`}
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
        key={`ecore-${count}`}
        ref={coreRef}
        args={[undefined, undefined, count]}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {active && hovered !== null && (
        <Html
          position={positions[hovered]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[100, 0]}
        >
          <div className="relative -translate-y-[calc(100%+12px)]">
            <div className="w-max max-w-[240px] rounded-xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/50 backdrop-blur-md">
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: categoryColor(active.cat) }}
                />
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                  {active.catLabel}
                </span>
              </div>
              <div className="px-3 pb-0.5 pt-1.5 text-xs leading-snug text-zinc-100">
                {active.title}
              </div>
              <div className="px-3 pb-2.5 pt-1 text-[11px] tabular-nums text-zinc-500">
                {formatDate(active.date)}
              </div>
            </div>
            <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-white/10 bg-zinc-950/80" />
          </div>
        </Html>
      )}
    </group>
  );
}
