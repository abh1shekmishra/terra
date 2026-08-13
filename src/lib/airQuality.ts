import { useQuery } from "@tanstack/react-query";
import * as THREE from "three";

export interface AqiGrid {
  latMin: number;
  lngMin: number;
  d: number;
  nLat: number;
  nLng: number;
  aqi: number[]; // US AQI, row-major (iLat*nLng + iLng)
}

/** Live global air-quality (US AQI) grid, refreshed hourly while on. */
export function useAirQuality(enabled: boolean) {
  return useQuery({
    queryKey: ["air-quality"],
    queryFn: async (): Promise<AqiGrid> => {
      const res = await fetch("/api/air-quality");
      if (!res.ok) throw new Error(`air quality failed (${res.status})`);
      return res.json();
    },
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bilinearly sample the AQI grid at a lat/lng, wrapping in longitude. */
export function sampleAqi(g: AqiGrid, lat: number, lng: number): number {
  if (g.aqi.length === 0) return 0;
  let fLat = (lat - g.latMin) / g.d;
  fLat = Math.max(0, Math.min(g.nLat - 1, fLat));
  let fLng = (lng - g.lngMin) / g.d;
  fLng = ((fLng % g.nLng) + g.nLng) % g.nLng;

  const i0 = Math.floor(fLat);
  const i1 = Math.min(i0 + 1, g.nLat - 1);
  const tf = fLat - i0;
  const j0 = Math.floor(fLng) % g.nLng;
  const j1 = (j0 + 1) % g.nLng;
  const tg = fLng - Math.floor(fLng);

  const at = (i: number, j: number) => g.aqi[i * g.nLng + j];
  const a0 = lerp(at(i0, j0), at(i0, j1), tg);
  const a1 = lerp(at(i1, j0), at(i1, j1), tg);
  return lerp(a0, a1, tf);
}

// US EPA AQI colour scale: green -> yellow -> orange -> red -> purple -> maroon.
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [0.13, 0.83, 0.35]], // good (green)
  [50, [0.13, 0.83, 0.35]],
  [100, [1.0, 0.85, 0.1]], // moderate (yellow)
  [150, [1.0, 0.5, 0.05]], // unhealthy for sensitive (orange)
  [200, [0.94, 0.24, 0.24]], // unhealthy (red)
  [300, [0.6, 0.25, 0.6]], // very unhealthy (purple)
  [500, [0.5, 0.0, 0.15]], // hazardous (maroon)
];

/** Colour for a US AQI value along the EPA scale. */
export function aqiColor(aqi: number, target = new THREE.Color()): THREE.Color {
  const v = Math.max(0, Math.min(500, aqi));
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (v <= b) {
      const t = (v - a) / (b - a || 1);
      return target.setRGB(
        lerp(ca[0], cb[0], t),
        lerp(ca[1], cb[1], t),
        lerp(ca[2], cb[2], t),
      );
    }
  }
  const last = STOPS[STOPS.length - 1][1];
  return target.setRGB(last[0], last[1], last[2]);
}

/** Short EPA category label for an AQI value. */
export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy (sensitive)";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very unhealthy";
  return "Hazardous";
}
