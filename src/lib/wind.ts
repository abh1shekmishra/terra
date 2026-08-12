import { useQuery } from "@tanstack/react-query";

export interface WindGrid {
  latMin: number;
  lngMin: number;
  d: number; // grid step, degrees
  nLat: number;
  nLng: number;
  u: number[]; // eastward component, m/s (row-major: iLat*nLng + iLng)
  v: number[]; // northward component, m/s
}

/** Live global surface-wind grid, refreshed hourly while the layer is on. */
export function useWind(enabled: boolean) {
  return useQuery({
    queryKey: ["wind"],
    queryFn: async (): Promise<WindGrid> => {
      const res = await fetch("/api/wind");
      if (!res.ok) throw new Error(`wind request failed (${res.status})`);
      return res.json();
    },
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Bilinearly sample the wind grid at a lat/lng, wrapping in longitude. Returns
 * the eastward (u) and northward (v) wind components in m/s.
 */
export function sampleWind(
  g: WindGrid,
  lat: number,
  lng: number,
): { u: number; v: number } {
  if (g.u.length === 0) return { u: 0, v: 0 };
  let fLat = (lat - g.latMin) / g.d;
  fLat = Math.max(0, Math.min(g.nLat - 1, fLat));
  let fLng = (lng - g.lngMin) / g.d;
  fLng = ((fLng % g.nLng) + g.nLng) % g.nLng; // wrap longitude

  const i0 = Math.floor(fLat);
  const i1 = Math.min(i0 + 1, g.nLat - 1);
  const tf = fLat - i0;
  const j0 = Math.floor(fLng) % g.nLng;
  const j1 = (j0 + 1) % g.nLng;
  const tg = fLng - Math.floor(fLng);

  const at = (i: number, j: number, arr: number[]) => arr[i * g.nLng + j];
  const u0 = lerp(at(i0, j0, g.u), at(i0, j1, g.u), tg);
  const u1 = lerp(at(i1, j0, g.u), at(i1, j1, g.u), tg);
  const v0 = lerp(at(i0, j0, g.v), at(i0, j1, g.v), tg);
  const v1 = lerp(at(i1, j0, g.v), at(i1, j1, g.v), tg);
  return { u: lerp(u0, u1, tf), v: lerp(v0, v1, tf) };
}
