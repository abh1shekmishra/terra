import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";

export interface AuroraPoint {
  lat: number;
  lng: number;
  val: number; // aurora probability (0-100)
}

export interface AuroraResponse {
  forecastTime: string;
  points: AuroraPoint[];
  error?: string;
}

/** Live auroral-oval points, refreshed every few minutes while the layer is on. */
export function useAurora(enabled: boolean) {
  return useQuery({
    queryKey: ["aurora"],
    queryFn: async (): Promise<AuroraResponse> => {
      const res = await fetch("/api/aurora");
      if (!res.ok) throw new Error(`aurora failed (${res.status})`);
      return res.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
}

/**
 * Aurora colour: faint green where activity is low, brightening and shifting
 * toward yellow then red as probability climbs — the way real aurora glows.
 */
export function auroraColor(val: number, target = new THREE.Color()): THREE.Color {
  const t = Math.min(val / 45, 1);
  const hue = 0.36 - 0.36 * t * t; // green -> red
  const light = 0.32 + 0.4 * t;
  return target.setHSL(hue, 0.95, light);
}
