"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useViewStore } from "@/store/useViewStore";

interface ControlsLike {
  enabled: boolean;
  target: THREE.Vector3;
  update: () => void;
}

const dest = new THREE.Vector3();
const ORIGIN = new THREE.Vector3(0, 0, 0);

/** Smoothly flies the camera to a requested vantage (e.g. a satellite). */
export default function CameraController() {
  const flyTarget = useViewStore((s) => s.flyTarget);
  const clearFly = useViewStore((s) => s.clearFly);
  const controls = useThree((s) => s.controls) as ControlsLike | null;

  useFrame(({ camera }) => {
    if (!flyTarget) return;
    dest.set(flyTarget[0], flyTarget[1], flyTarget[2]);
    if (controls) controls.enabled = false;

    camera.position.lerp(dest, 0.08);
    if (controls) {
      controls.target.lerp(ORIGIN, 0.08);
      controls.update();
    }

    if (camera.position.distanceTo(dest) < 0.05) {
      if (controls) controls.enabled = true;
      clearFly();
    }
  });

  return null;
}
