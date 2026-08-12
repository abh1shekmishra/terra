"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { sampleWind, useWind } from "@/lib/wind";

const COUNT = 6000; // particles (each a short "comet" streak)
const LIFT = GLOBE_RADIUS + 0.008; // hug just above the surface
const MOVE = 0.4; // advance rate (uniform surface-arc, independent of latitude)
const STREAK_ARC = 1.6; // fixed streak length in arc-degrees (uniform everywhere)
const LAT_LIMIT = 82;

const _head = new THREE.Vector3();
const _tail = new THREE.Vector3();
const _c = new THREE.Color();

function spawn(lat: Float32Array, lng: Float32Array, age: Float32Array, life: Float32Array, i: number) {
  lat[i] = (Math.random() * 2 - 1) * 74;
  lng[i] = Math.random() * 360 - 180;
  age[i] = 0;
  life[i] = 60 + Math.random() * 140;
}

/**
 * Live surface wind as a field of flowing particle streaks (nullschool-style):
 * each particle advects along the interpolated wind vector, drawn as a short
 * comet whose length and colour track wind speed. Particles respawn on a random
 * lifetime so the field never clumps. One LineSegments buffer, updated per frame.
 */
export default function Wind() {
  const { data } = useWind(true);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(COUNT * 6), 3));
    return g;
  }, []);

  const state = useMemo(
    () => ({
      lat: new Float32Array(COUNT),
      lng: new Float32Array(COUNT),
      age: new Float32Array(COUNT),
      life: new Float32Array(COUNT),
      seeded: false,
    }),
    [],
  );

  useFrame((_, delta) => {
    const grid = data;
    if (!grid || grid.u.length === 0) return;
    const dt = Math.min(delta, 0.05);
    const { lat, lng, age, life } = state;
    if (!state.seeded) {
      for (let i = 0; i < COUNT; i++) spawn(lat, lng, age, life, i);
      state.seeded = true;
    }

    const pos = geometry.attributes.position.array as Float32Array;
    const col = geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < COUNT; i++) {
      let { u, v } = sampleWind(grid, lat[i], lng[i]);
      if (!Number.isFinite(u) || !Number.isFinite(v)) {
        u = 0;
        v = 0;
      }
      const cosLat = Math.max(Math.cos((lat[i] * Math.PI) / 180), 0.3);
      const speed = Math.hypot(u, v);

      // Advance by a uniform surface-arc: the 1/cos(lat) longitude term no longer
      // makes polar particles cross the map, because arc = MOVE*dt*speed is the
      // same at every latitude.
      lat[i] += v * MOVE * dt;
      lng[i] += (u / cosLat) * MOVE * dt;
      if (lng[i] > 180) lng[i] -= 360;
      else if (lng[i] < -180) lng[i] += 360;
      age[i] += 1;
      if (age[i] > life[i] || lat[i] > LAT_LIMIT || lat[i] < -LAT_LIMIT) {
        spawn(lat, lng, age, life, i);
      }

      // Streak of fixed arc-length upwind (uniform everywhere -> no long flashes),
      // scaled by a birth/death fade so respawns don't pop.
      const fade = Math.sin(Math.PI * (age[i] / life[i]));
      const sFac = speed > 1e-3 ? (STREAK_ARC * fade) / speed : 0;
      _head.copy(latLngToVector3(lat[i], lng[i], LIFT));
      _tail.copy(
        latLngToVector3(lat[i] - v * sFac, lng[i] - (u / cosLat) * sFac, LIFT),
      );

      const o = i * 6;
      pos[o] = _tail.x; pos[o + 1] = _tail.y; pos[o + 2] = _tail.z;
      pos[o + 3] = _head.x; pos[o + 4] = _head.y; pos[o + 5] = _head.z;

      const t = Math.min(speed / 20, 1);
      _c.setHSL(0.58 - 0.08 * t, 0.85 * (1 - t) + 0.25, 0.45 + 0.4 * t);
      const b = 0.3 + 0.7 * fade; // dim at birth/death
      col[o] = _c.r * 0.2 * b; col[o + 1] = _c.g * 0.2 * b; col[o + 2] = _c.b * 0.2 * b;
      col[o + 3] = _c.r * b; col[o + 4] = _c.g * b; col[o + 5] = _c.b * b;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.75}
        depthWrite={false}
        toneMapped={false}
      />
    </lineSegments>
  );
}
