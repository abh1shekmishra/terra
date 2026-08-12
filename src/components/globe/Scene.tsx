"use client";

import { Suspense, startTransition, useEffect, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import Earth from "./Earth";
import Clouds from "./Clouds";
import Atmosphere from "./Atmosphere";
import Earthquakes from "./Earthquakes";
import EarthquakeSelection from "./EarthquakeSelection";
import PlateBoundaries from "./PlateBoundaries";
import Flights from "./Flights";
import FlightRoute, { FlightFocus } from "./FlightRoute";
import Events from "./Events";
import Satellites from "./Satellites";
import Wind from "./Wind";
import PlaceLabels from "./PlaceLabels";
import { getSunDirection } from "@/lib/sun";
import { useLayerStore } from "@/store/useLayerStore";
import { useSelectionStore } from "@/store/useSelectionStore";
import { useTimeStore } from "@/store/useTimeStore";
import { useViewStore } from "@/store/useViewStore";

const CAMERA_DISTANCE = 6.4;

/** Keeps the sun vector aligned with the real current time, every frame. */
function SunUpdater({ sunDirection }: { sunDirection: THREE.Vector3 }) {
  useFrame(() => {
    getSunDirection(new Date(), sunDirection);
  });
  return null;
}

export default function Scene() {
  // Zustand subscribes via useSyncExternalStore, which forces a *synchronous*
  // re-render of every subscriber on each change. If the Scene subscribed that
  // way, mounting a heavy layer would block in the same task as the toggle's
  // paint, so the control feels laggy. Instead we mirror the layer/plate state
  // into local React state and apply it inside a transition: the toggle (which
  // subscribes directly) paints instantly, and the heavy 3D mount runs after,
  // as a low-priority pass that can't block the click.
  const [layers, setLayers] = useState(() => useLayerStore.getState().enabled);
  const [showPlates, setShowPlates] = useState(
    () => useViewStore.getState().showPlates,
  );
  useEffect(() => {
    const unsubLayers = useLayerStore.subscribe((s) =>
      startTransition(() => setLayers(s.enabled)),
    );
    const unsubView = useViewStore.subscribe((s) =>
      startTransition(() => setShowPlates(s.showPlates)),
    );
    return () => {
      unsubLayers();
      unsubView();
    };
  }, []);

  const live = useTimeStore((s) => s.live);
  const clearSelection = useSelectionStore((s) => s.clear);
  const stopRide = useViewStore((s) => s.stopRide);
  const riding = useViewStore((s) => s.rideSatId !== null);

  const handleMissed = () => {
    clearSelection();
    stopRide();
  };

  // Shared, mutated-in-place so Earth and Clouds read the same live sun vector.
  const sunDirection = useMemo(() => getSunDirection(new Date()), []);

  // Start on the daylit side, but offset ~32° off the sun so the light rakes
  // across from the side — revealing terrain relief and a terminator edge
  // (a head-on sun looks flat). Lands the visitor on a lit, three-quarter Earth.
  const cameraPosition = useMemo(() => {
    const dir = sunDirection
      .clone()
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(32))
      .multiplyScalar(CAMERA_DISTANCE);
    return dir.toArray() as [number, number, number];
  }, [sunDirection]);

  return (
    <Canvas
      camera={{ position: cameraPosition, fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onPointerMissed={handleMissed}
    >
      <color attach="background" args={["#05070d"]} />
      <Stars
        radius={140}
        depth={70}
        count={2600}
        factor={4}
        saturation={0}
        fade
        speed={0.4}
      />

      <SunUpdater sunDirection={sunDirection} />
      <Suspense fallback={null}>
        <Earth sunDirection={sunDirection} />
        <Clouds sunDirection={sunDirection} />
      </Suspense>
      <Atmosphere />
      {layers.wind && <Wind />}
      <PlaceLabels />
      {layers.earthquakes && showPlates && <PlateBoundaries />}
      {layers.earthquakes && <Earthquakes />}
      {layers.earthquakes && <EarthquakeSelection />}
      {layers.flights && live && <Flights />}
      {layers.flights && <FlightRoute />}
      {layers.flights && <FlightFocus />}
      {layers.events && <Events />}
      {layers.satellites && live && <Satellites />}

      {!riding && (
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={2.6}
          maxDistance={14}
          rotateSpeed={0.45}
          zoomSpeed={0.7}
        />
      )}
    </Canvas>
  );
}
