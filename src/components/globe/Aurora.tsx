"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { auroraColor, useAurora } from "@/lib/aurora";

const LIFT = GLOBE_RADIUS + 0.015;
const dummy = new THREE.Object3D();
const _c = new THREE.Color();

/** A soft radial blob so overlapping instances merge into a glowing band. */
function createGlowTexture(): THREE.CanvasTexture {
  const s = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(canvas);
}

/**
 * The live auroral oval as a field of soft, additively-blended glows near the
 * poles, coloured green through red by activity and gently shimmering so the
 * band feels alive. Sourced from NOAA SWPC's OVATION model.
 */
export default function Aurora() {
  const { data } = useAurora(true);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createGlowTexture(), []);

  const points = useMemo(() => {
    const pts = data?.points ?? [];
    return pts.map((p, i) => ({
      pos: latLngToVector3(p.lat, p.lng, LIFT),
      val: p.val,
      phase: (i % 17) * 0.37, // varied shimmer phase
    }));
  }, [data]);

  const count = points.length;

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < count; i++) mesh.setColorAt(i, auroraColor(points[i].val, _c));
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, count]);

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const p = points[i];
      dummy.position.copy(p.pos);
      dummy.lookAt(camera.position);
      const shimmer = 0.85 + 0.15 * Math.sin(t * 2 + p.phase);
      const sev = Math.min(p.val / 30, 1.4);
      dummy.scale.setScalar((0.04 + sev * 0.06) * shimmer);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <instancedMesh
      key={`aurora-${count}`}
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.7}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}
