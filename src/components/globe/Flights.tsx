"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { altitudeColor, EARTH_RADIUS_M, useFlights } from "@/lib/flights";
import { useSelectionStore } from "@/store/useSelectionStore";
import { useFlightSearchStore } from "@/store/useFlightSearchStore";
import { flightMatches, flightLabel } from "@/lib/flightSearch";
import { airlineForCallsign } from "@/data/airlines";

const BASE_ALT = GLOBE_RADIUS + 0.02;
const PLANE_SIZE = 0.032;
// Render caps: a sampled subset by default (for framerate), the matching set
// when a search is active (so any flight/airline can be found and shown).
const DEFAULT_RENDER = 2500;
const SEARCH_RENDER = 4000;
const SELECTED_COLOR = new THREE.Color("#fbbf24"); // yellow highlight
const dummy = new THREE.Object3D();
const _pos = new THREE.Vector3();
const _up = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _basis = new THREE.Matrix4();

/** A clean top-view airliner silhouette drawn to a canvas (no external asset). */
function createPlaneTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(64, 12); // nose (points up = +Y)
  ctx.bezierCurveTo(71, 24, 71, 42, 70, 54); // right fuselage to wing root
  ctx.lineTo(118, 80); // right wing (swept back)
  ctx.lineTo(118, 88);
  ctx.lineTo(70, 72);
  ctx.lineTo(69, 94); // rear fuselage
  ctx.lineTo(86, 110); // right tailplane
  ctx.lineTo(86, 116);
  ctx.lineTo(64, 106);
  ctx.lineTo(42, 116); // left tailplane
  ctx.lineTo(42, 110);
  ctx.lineTo(59, 94);
  ctx.lineTo(58, 72);
  ctx.lineTo(10, 88); // left wing
  ctx.lineTo(10, 80);
  ctx.lineTo(58, 54);
  ctx.bezierCurveTo(57, 42, 57, 24, 64, 12); // left fuselage to nose
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/** Live aircraft as heading-aligned plane icons that glide between refreshes. */
export default function Flights() {
  const { data } = useFlights(true);
  const query = useFlightSearchStore((s) => s.query);
  const flights = useMemo(() => {
    const all = data?.flights ?? [];
    const q = query.trim();
    if (q) {
      const matched = all.filter((f) => flightMatches(f, q));
      return matched.slice(0, SEARCH_RENDER);
    }
    if (all.length <= DEFAULT_RENDER) return all;
    // Even global sample so the default view isn't biased to the feed's order.
    const step = Math.ceil(all.length / DEFAULT_RENDER);
    return all.filter((_, i) => i % step === 0);
  }, [data, query]);
  const count = flights.length;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createPlaneTexture(), []);
  const { gl } = useThree();
  const select = useSelectionStore((s) => s.select);
  const selectedId = useSelectionStore((s) =>
    s.selected?.kind === "flight" ? s.selected.data.id : null,
  );
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
      if (flights[i].id === selectedId) mesh.setColorAt(i, SELECTED_COLOR);
      else mesh.setColorAt(i, altitudeColor(live.alt[i], color));
    }
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [live, count, selectedId, flights]);

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

      // Orient the nose along the actual direction of travel: look a small step
      // ahead using the SAME great-circle formula the plane moves by, so the
      // heading the icon shows always matches where it is going.
      const theta = (hdg[i] * Math.PI) / 180;
      const phi1 = (lat[i] * Math.PI) / 180;
      const lam1 = (lng[i] * Math.PI) / 180;
      const ad = 0.02; // ~1.1° look-ahead, plenty for a stable direction
      const sinAhead =
        Math.sin(phi1) * Math.cos(ad) +
        Math.cos(phi1) * Math.sin(ad) * Math.cos(theta);
      const aheadPhi = Math.asin(Math.max(-1, Math.min(1, sinAhead)));
      const aheadLam =
        lam1 +
        Math.atan2(
          Math.sin(theta) * Math.sin(ad) * Math.cos(phi1),
          Math.cos(ad) - Math.sin(phi1) * sinAhead,
        );
      _forward
        .copy(
          latLngToVector3(
            (aheadPhi * 180) / Math.PI,
            (aheadLam * 180) / Math.PI,
            altOffset,
          ),
        )
        .sub(_pos)
        .normalize();
      _right.crossVectors(_forward, _up).normalize();
      _forward.crossVectors(_up, _right).normalize(); // keep it perpendicular to up
      _basis.makeBasis(_right, _forward, _up);

      dummy.position.copy(_pos);
      dummy.quaternion.setFromRotationMatrix(_basis);
      // Enlarge the selected aircraft's icon so it stands out.
      dummy.scale.setScalar(
        flights[i].id === selectedId ? PLANE_SIZE * 1.9 : PLANE_SIZE,
      );
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
        renderOrder={2}
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
              {airlineForCallsign(active.cs) ? (
                <div className="px-3 pt-1 text-xs leading-snug text-zinc-300">
                  {flightLabel(active.cs)}
                </div>
              ) : (
                active.co && (
                  <div className="px-3 pt-1 text-xs leading-snug text-zinc-300">
                    {active.co}
                  </div>
                )
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
