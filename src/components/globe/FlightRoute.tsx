"use client";

import { useEffect, useMemo, useRef } from "react";
import { Html, Line } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { latLngToVector3 } from "@/lib/geo";
import { GLOBE_RADIUS } from "./constants";
import { useSelectionStore } from "@/store/useSelectionStore";
import {
  isPositionOnRoute,
  useFlightDetail,
  type FlightAirport,
} from "@/lib/flightDetail";

const FLOWN_COLOR = "#f59e0b"; // dark/golden yellow — the covered path
const REMAINING_COLOR = "#fcd34d"; // light yellow — still to fly
// Route lines hug just above the surface so plane icons sit on top of them.
const LINE_LIFT = 0.015;
const LINE_RADIUS = GLOBE_RADIUS + LINE_LIFT;

type LatLng = { lat: number; lng: number };

/** A great-circle arc between two points, gently bulged above the surface. */
function buildArcPoints(o: LatLng, d: LatLng): THREE.Vector3[] {
  const p0 = latLngToVector3(o.lat, o.lng, 1);
  const p1 = latLngToVector3(d.lat, d.lng, 1);
  const omega = Math.acos(THREE.MathUtils.clamp(p0.dot(p1), -1, 1));
  const segments = Math.max(24, Math.round((omega / Math.PI) * 180));
  const arcHeight = Math.min(0.015 + omega * 0.05, 0.12);
  const sinO = Math.sin(omega) || 1;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const v =
      omega < 1e-4
        ? p0.clone()
        : p0
            .clone()
            .multiplyScalar(Math.sin((1 - t) * omega) / sinO)
            .addScaledVector(p1, Math.sin(t * omega) / sinO);
    v.normalize().multiplyScalar(LINE_RADIUS + Math.sin(Math.PI * t) * arcHeight);
    pts.push(v);
  }
  return pts;
}

/** A labelled endpoint marker: a coloured dot with a FROM/TO caption. */
function EndpointMarker({
  airport,
  role,
  color,
  tint,
}: {
  airport: FlightAirport;
  role: "From" | "To";
  color: string;
  tint: string;
}) {
  const pos = useMemo(
    () => latLngToVector3(airport.lat, airport.lng, LINE_RADIUS),
    [airport],
  );
  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.017, 14, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} depthWrite={false} />
      </mesh>
      <Html center style={{ pointerEvents: "none" }} zIndexRange={[8, 0]}>
        <span
          className={`-translate-y-3 whitespace-nowrap rounded bg-zinc-950/80 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide ${tint} [text-shadow:_0_1px_2px_rgba(0,0,0,0.9)]`}
        >
          {role === "From" ? "↑ " : "↓ "}
          {airport.iata || airport.icao}
        </span>
      </Html>
    </group>
  );
}

/**
 * The selected flight's route in two shades: dark/golden yellow for the flown
 * (covered) leg from the origin to the aircraft's live position, and light
 * yellow for the remaining leg to the destination. Both are great-circle arcs
 * from reliable data (airport coords + live position), drawn only when the
 * scheduled route is consistent with where the plane actually is.
 */
export default function FlightRoute() {
  const selected = useSelectionStore((s) => s.selected);
  const flight = selected?.kind === "flight" ? selected.data : null;
  const { data: detail } = useFlightDetail(
    flight?.cs ?? "",
    flight?.id ?? "",
    Boolean(flight),
  );

  // Trust the scheduled endpoints only if the live position is on that route.
  const onRoute = Boolean(
    flight &&
      detail?.origin &&
      detail?.destination &&
      isPositionOnRoute(detail.origin, detail.destination, flight.lat, flight.lng),
  );

  // Covered leg: origin -> current position.
  const coveredPoints = useMemo(() => {
    if (!onRoute || !flight || !detail?.origin) return null;
    return buildArcPoints(detail.origin, flight);
  }, [onRoute, flight, detail]);

  // Remaining leg: current position -> destination.
  const remainingPoints = useMemo(() => {
    if (!onRoute || !flight || !detail?.destination) return null;
    return buildArcPoints(flight, detail.destination);
  }, [onRoute, flight, detail]);

  if (!flight) return null;

  return (
    <group>
      {coveredPoints && (
        <Line
          points={coveredPoints}
          color={FLOWN_COLOR}
          lineWidth={2.8}
          transparent
          opacity={1}
          depthWrite={false}
          toneMapped={false}
        />
      )}
      {remainingPoints && (
        <Line
          points={remainingPoints}
          color={REMAINING_COLOR}
          lineWidth={2.2}
          transparent
          opacity={0.9}
          depthWrite={false}
          toneMapped={false}
        />
      )}
      {onRoute && detail?.origin && (
        <EndpointMarker
          airport={detail.origin}
          role="From"
          color={FLOWN_COLOR}
          tint="text-amber-200"
        />
      )}
      {onRoute && detail?.destination && (
        <EndpointMarker
          airport={detail.destination}
          role="To"
          color={REMAINING_COLOR}
          tint="text-yellow-100"
        />
      )}
    </group>
  );
}

/**
 * When a flight is selected, gently rotate the camera so that flight faces the
 * viewer. We keep the orbit centred on the planet and just spin to it, so the
 * user's zoom is preserved. OrbitControls is briefly disabled during the move so
 * the two don't fight, then handed back cleanly.
 */
export function FlightFocus() {
  const selected = useSelectionStore((s) => s.selected);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | { enabled: boolean; update?: () => void }
    | null;
  const target = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (selected?.kind === "flight") {
      const dir = latLngToVector3(selected.data.lat, selected.data.lng, 1);
      const dist = THREE.MathUtils.clamp(camera.position.length(), 3.2, 6.5);
      target.current = dir.multiplyScalar(dist);
      if (controls) controls.enabled = false;
    } else {
      target.current = null;
      if (controls) controls.enabled = true;
    }
  }, [selected, camera, controls]);

  useEffect(
    () => () => {
      if (controls) controls.enabled = true;
    },
    [controls],
  );

  useFrame(() => {
    if (!target.current) return;
    camera.position.lerp(target.current, 0.12);
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.02) {
      target.current = null;
      if (controls) {
        controls.enabled = true;
        controls.update?.();
      }
    }
  });

  return null;
}
