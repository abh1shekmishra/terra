"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { altitudeColor, EARTH_RADIUS_M, useFlights } from "@/lib/flights";
import { useSelectionStore } from "@/store/useSelectionStore";

const BASE_ALT = GLOBE_RADIUS + 0.02;
const PLANE_SIZE = 0.032;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _up = new THREE.Vector3();
const _north = new THREE.Vector3();
const _east = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basis = new THREE.Matrix4();

/** A simple top-view aeroplane silhouette drawn to a canvas (no external asset). */
function createPlaneTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(32, 4); // nose (points up = +Y)
  ctx.lineTo(37, 26);
  ctx.lineTo(60, 40);
  ctx.lineTo(60, 46);
  ctx.lineTo(37, 40);
  ctx.lineTo(36, 52);
  ctx.lineTo(45, 61);
  ctx.lineTo(45, 63);
  ctx.lineTo(32, 58);
  ctx.lineTo(19, 63);
  ctx.lineTo(19, 61);
  ctx.lineTo(28, 52);
  ctx.lineTo(27, 40);
  ctx.lineTo(4, 46);
  ctx.lineTo(4, 40);
  ctx.lineTo(27, 26);
  ctx.closePath();
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/** Live aircraft as heading-aligned plane icons that glide between refreshes. */
export default function Flights() {
  const { data } = useFlights(true);
  const flights = useMemo(() => data?.flights ?? [], [data]);
  const count = flights.length;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createPlaneTexture(), []);
  const { gl } = useThree();
  const select = useSelectionStore((s) => s.select);
  const [hovered, setHovered] = useState<number | null>(null);

  // Mutable per-aircraft state, advanced each frame by dead-reckoning.
  const live = useMemo(() => {
    const lat = new Float32Array(count);
    const lng = new Float32Array(count);
    const hdg = new Float32Array(count);
    const vel = new Float32Array(count);
    const alt = new Float32Array(count);
    flights.forEach((f, i) => {
      lat[i] = f.lat;
      lng[i] = f.lng;
      hdg[i] = f.hdg;
      vel[i] = f.vel;
      alt[i] = f.alt;
    });
    return { lat, lng, hdg, vel, alt };
  }, [flights, count]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, altitudeColor(live.alt[i], color));
    }
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [live, count]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const dt = Math.min(delta, 0.1);
    const { lat, lng, hdg, vel, alt } = live;

    for (let i = 0; i < count; i++) {
      // Advance along a great circle by velocity * dt.
      const distance = vel[i] * dt;
      if (distance > 0) {
        const ad = distance / EARTH_RADIUS_M;
        const theta = (hdg[i] * Math.PI) / 180;
        const phi1 = (lat[i] * Math.PI) / 180;
        const lam1 = (lng[i] * Math.PI) / 180;
        const sinPhi2 =
          Math.sin(phi1) * Math.cos(ad) +
          Math.cos(phi1) * Math.sin(ad) * Math.cos(theta);
        const phi2 = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
        const lam2 =
          lam1 +
          Math.atan2(
            Math.sin(theta) * Math.sin(ad) * Math.cos(phi1),
            Math.cos(ad) - Math.sin(phi1) * sinPhi2,
          );
        lat[i] = (phi2 * 180) / Math.PI;
        lng[i] = (((lam2 * 180) / Math.PI + 540) % 360) - 180;
      }

      const altOffset = BASE_ALT + Math.min(alt[i] / 40000, 1) * 0.05;
      _pos.copy(latLngToVector3(lat[i], lng[i], altOffset));
      _up.copy(_pos).normalize();

      // Tangent-plane basis so the icon lies flat and points along its heading.
      _north.copy(WORLD_UP).addScaledVector(_up, -WORLD_UP.dot(_up));
      if (_north.lengthSq() < 1e-6) _north.set(1, 0, 0); // pole guard
      _north.normalize();
      _east.crossVectors(_north, _up).normalize();
      const theta = (hdg[i] * Math.PI) / 180;
      _forward
        .copy(_north)
        .multiplyScalar(Math.cos(theta))
        .addScaledVector(_east, Math.sin(theta))
        .normalize();
      _right.crossVectors(_forward, _up).normalize();
      _basis.makeBasis(_right, _forward, _up);

      dummy.position.copy(_pos);
      dummy.quaternion.setFromRotationMatrix(_basis);
      dummy.scale.setScalar(PLANE_SIZE);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const active = hovered !== null ? flights[hovered] : null;

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
      select({ kind: "flight", data: flights[e.instanceId] });
    }
  };

  return (
    <group>
      <instancedMesh
        key={`flights-${count}`}
        ref={meshRef}
        args={[undefined, undefined, count]}
        onPointerMove={handleMove}
        onPointerOut={handleOut}
        onClick={handleClick}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>

      {active && hovered !== null && (
        <Html
          position={latLngToVector3(
            live.lat[hovered],
            live.lng[hovered],
            BASE_ALT + 0.06,
          )}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[100, 0]}
        >
          <div className="relative -translate-y-[calc(100%+12px)]">
            <div className="w-max max-w-[220px] rounded-xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/50 backdrop-blur-md">
              <div className="flex items-center gap-2 px-3 pt-2.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                <span className="text-sm font-semibold tracking-wide text-zinc-100">
                  {active.cs}
                </span>
              </div>
              {active.co && (
                <div className="px-3 pt-1 text-xs leading-snug text-zinc-300">
                  {active.co}
                </div>
              )}
              <div className="flex gap-3 px-3 pb-2.5 pt-1 text-[11px] tabular-nums text-zinc-500">
                <span>{Math.round(active.alt * 3.281).toLocaleString()} ft</span>
                <span>{Math.round(active.vel * 3.6)} km/h</span>
              </div>
            </div>
            <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-white/10 bg-zinc-950/80" />
          </div>
        </Html>
      )}
    </group>
  );
}
