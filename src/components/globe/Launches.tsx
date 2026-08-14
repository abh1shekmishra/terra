"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { launchColor, useLaunches } from "@/lib/launches";
import { useSelectionStore } from "@/store/useSelectionStore";

const LIFT = GLOBE_RADIUS + 0.03;
const dummy = new THREE.Object3D();

/** A small upright rocket silhouette (nose, body, fins, flame) on a canvas. */
function createRocketTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(32, 6); // nose
  ctx.quadraticCurveTo(41, 20, 40, 40); // right body
  ctx.lineTo(48, 52); // right fin
  ctx.lineTo(40, 48);
  ctx.lineTo(38, 54);
  ctx.lineTo(26, 54);
  ctx.lineTo(24, 48);
  ctx.lineTo(16, 52); // left fin
  ctx.lineTo(24, 40); // left body
  ctx.quadraticCurveTo(23, 20, 32, 6);
  ctx.closePath();
  ctx.fill();
  // window
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.arc(32, 26, 4, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

/** Upcoming rocket launches as pulsing rocket markers on their launch pads. */
export default function Launches() {
  const { data } = useLaunches(true);
  const launches = useMemo(() => data?.launches ?? [], [data]);
  const count = launches.length;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const texture = useMemo(() => createRocketTexture(), []);
  const { gl } = useThree();
  const select = useSelectionStore((s) => s.select);

  const positions = useMemo(
    () => launches.map((l) => latLngToVector3(l.lat, l.lng, LIFT)),
    [launches],
  );

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, color.set(launchColor(launches[i].status)));
    }
    mesh.count = count;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [launches, count]);

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;
    const pulse = 0.07 + 0.014 * Math.sin(clock.elapsedTime * 3);
    for (let i = 0; i < count; i++) {
      dummy.position.copy(positions[i]);
      dummy.lookAt(camera.position); // billboard toward the viewer
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  if (count === 0) return null;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId === undefined) return;
    select({ kind: "launch", data: launches[e.instanceId] });
  };

  return (
    <instancedMesh
      key={`launches-${count}`}
      ref={meshRef}
      args={[undefined, undefined, count]}
      onClick={handleClick}
      onPointerOver={() => (gl.domElement.style.cursor = "pointer")}
      onPointerOut={() => (gl.domElement.style.cursor = "auto")}
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
  );
}
