import * as THREE from "three";
import { useQuery } from "@tanstack/react-query";

export interface Flight {
  id: string;
  cs: string; // callsign
  co: string; // origin country
  lat: number;
  lng: number;
  hdg: number; // heading, degrees from north
  alt: number; // metres
  vel: number; // m/s
  vr: number; // vertical rate, m/s (+climb / -descent)
  sq: string; // transponder squawk code
}

export interface FlightsResponse {
  time: number;
  total: number;
  flights: Flight[];
  error?: string;
}

export const EARTH_RADIUS_M = 6_371_000;

/** Live aircraft from our proxy, refreshed while the layer is enabled. */
export function useFlights(enabled: boolean) {
  return useQuery({
    queryKey: ["flights"],
    queryFn: async (): Promise<FlightsResponse> => {
      const res = await fetch("/api/flights");
      if (!res.ok) throw new Error(`flights request failed (${res.status})`);
      return res.json();
    },
    refetchInterval: 45_000,
    enabled,
  });
}

/** Tint an aircraft by altitude: low = cyan, cruise = near-white. */
export function altitudeColor(
  altMeters: number,
  target: THREE.Color = new THREE.Color(),
): THREE.Color {
  const t = THREE.MathUtils.clamp(altMeters / 12000, 0, 1);
  return target.setHSL(0.55, 0.85 * (1 - t) + 0.1, 0.55 + 0.28 * t);
}
