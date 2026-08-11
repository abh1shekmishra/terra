"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import * as satellite from "satellite.js";
import { latLngToVector3 } from "@/lib/geo";
import { EARTH_RADIUS_KM } from "@/lib/earthquakes";
import { GLOBE_RADIUS } from "./constants";
import {
  satelliteColor,
  useSatellites,
  type SatelliteTle,
} from "@/lib/satellites";
import { useSelectionStore } from "@/store/useSelectionStore";

type SatRec = ReturnType<typeof satellite.twoline2satrec>;

// Compress true altitude so LEO sits just off the surface and GEO stays on-screen.
const ALT_SCALE = 0.35;
const UPDATE_INTERVAL = 0.08; // seconds between propagation passes
const dummy = new THREE.Object3D();

interface Rec {
  tle: SatelliteTle;
  satrec: SatRec;
  color: THREE.Color;
}

function orbitRadius(altKm: number): number {
  return GLOBE_RADIUS + (altKm / EARTH_RADIUS_KM) * GLOBE_RADIUS * ALT_SCALE;
}

/** A tiny satellite silhouette (central body + two solar-panel wings). */
function createSatelliteTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(4, 27, 18, 10); // left solar panel
  ctx.fillRect(42, 27, 18, 10); // right solar panel
  ctx.fillRect(22, 31, 6, 2); // left strut
  ctx.fillRect(36, 31, 6, 2); // right strut
  ctx.fillRect(27, 21, 10, 22); // body
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/** Real satellites, propagated from TLEs with SGP4 each tick. */
export default function Satellites() {
  const { data } = useSatellites(true);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { gl, camera } = useThree();
  const select = useSelectionStore((s) => s.select);
  const texture = useMemo(() => createSatelliteTexture(), []);
  const accum = useRef(0);

  const recs = useMemo<Rec[]>(() => {
    const sats = data?.satellites ?? [];
    const out: Rec[] = [];
    for (const tle of sats) {
      try {
        const satrec = satellite.twoline2satrec(tle.l1, tle.l2);
        if (satrec.error === 0) {
          out.push({
            tle,
            satrec,
            color: new THREE.Color(satelliteColor(tle.group)),
          });
        }
      } catch {
        // skip malformed elements
      }
    }
    return out;
  }, [data]);

  const count = recs.length;

  // Faint orbit trails: each satellite's ground track over one period, built
  // once into a single line-segment buffer (one draw call) coloured by group.
  const [trails, setTrails] = useState<THREE.BufferGeometry | null>(null);
  useEffect(() => {
    if (recs.length === 0) {
      setTrails(null);
      return;
    }
    const SAMPLES = 48;
    const positions: number[] = [];
    const colors: number[] = [];
    const start = Date.now();
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    for (const rec of recs) {
      const periodMin = rec.satrec.no ? (2 * Math.PI) / rec.satrec.no : 95;
      const spanMs = Math.min(periodMin, 24 * 60) * 60_000;
      let prev = false;
      for (let k = 0; k <= SAMPLES; k++) {
        const t = new Date(start + (k / SAMPLES) * spanMs);
        const pv = satellite.propagate(rec.satrec, t);
        if (!pv.position || typeof pv.position === "boolean") {
          prev = false;
          continue;
        }
        const geo = satellite.eciToGeodetic(pv.position, satellite.gstime(t));
        const lat = satellite.degreesLat(geo.latitude);
        const lng = satellite.degreesLong(geo.longitude);
        b.copy(latLngToVector3(lat, lng, orbitRadius(geo.height)));
        if (prev && a.distanceTo(b) < 2.5) {
          positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
          colors.push(
            rec.color.r, rec.color.g, rec.color.b,
            rec.color.r, rec.color.g, rec.color.b,
          );
        }
        a.copy(b);
        prev = true;
      }
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    setTrails(geom);
    return () => geom.dispose();
  }, [recs]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    recs.forEach((r, i) => mesh.setColorAt(i, r.color));
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [recs, count]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    accum.current += delta;
    if (accum.current < UPDATE_INTERVAL) return;
    accum.current = 0;

    const now = new Date();
    const gmst = satellite.gstime(now);
    for (let i = 0; i < count; i++) {
      const pv = satellite.propagate(recs[i].satrec, now);
      const eci = pv.position;
      if (!eci || typeof eci === "boolean") {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        continue;
      }
      const geo = satellite.eciToGeodetic(eci, gmst);
      const lat = satellite.degreesLat(geo.latitude);
      const lng = satellite.degreesLong(geo.longitude);
      dummy.position.copy(latLngToVector3(lat, lng, orbitRadius(geo.height)));
      dummy.scale.setScalar(0.05);
      dummy.lookAt(camera.position); // billboard the icon toward the camera
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    const rec = recs[e.instanceId];
    const now = new Date();
    const pv = satellite.propagate(rec.satrec, now);
    if (!pv.position || typeof pv.position === "boolean") return;
    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(pv.position, gmst);
    const velocity =
      pv.velocity && typeof pv.velocity !== "boolean"
        ? Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z)
        : 0;
    const lat = satellite.degreesLat(geo.latitude);
    const lng = satellite.degreesLong(geo.longitude);
    const pos = latLngToVector3(lat, lng, orbitRadius(geo.height));
    select({
      kind: "satellite",
      data: {
        id: String(rec.satrec.satnum),
        name: rec.tle.name,
        group: rec.tle.group,
        altKm: geo.height,
        velKms: velocity,
        incDeg: satellite.radiansToDegrees(rec.satrec.inclo),
        periodMin: rec.satrec.no ? (2 * Math.PI) / rec.satrec.no : 0,
        lat,
        lng,
        pos: [pos.x, pos.y, pos.z],
      },
    });
  };

  return (
    <group>
      {trails && (
        <lineSegments geometry={trails} frustumCulled={false}>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.28}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      )}

      <instancedMesh
        key={`sats-${count}`}
        ref={meshRef}
        args={[undefined, undefined, count]}
        onClick={handleClick}
        onPointerOver={() => (gl.domElement.style.cursor = "pointer")}
        onPointerOut={() => (gl.domElement.style.cursor = "auto")}
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
    </group>
  );
}
