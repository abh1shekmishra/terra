import { useQuery } from "@tanstack/react-query";

export interface SatelliteTle {
  name: string;
  l1: string;
  l2: string;
  group: string;
}

export interface SatellitesResponse {
  count: number;
  satellites: SatelliteTle[];
  error?: string;
}

/** Computed at click time from the orbital elements. */
export interface SatelliteDetail {
  id: string; // NORAD catalogue number
  name: string;
  group: string;
  altKm: number;
  velKms: number;
  incDeg: number;
  periodMin: number;
  lat: number;
  lng: number;
  pos: [number, number, number]; // world position at click (for fly-to)
}

const GROUP_COLORS: Record<string, string> = {
  stations: "#f8fafc",
  starlink: "#38bdf8",
  "gps-ops": "#a78bfa",
  weather: "#34d399",
  science: "#fbbf24",
  visual: "#e5e7eb",
};

export function satelliteColor(group: string): string {
  return GROUP_COLORS[group] ?? "#cbd5e1";
}

/** Orbital elements from our proxy. TLEs change slowly, so this is cached hard. */
export function useSatellites(enabled: boolean) {
  return useQuery({
    queryKey: ["satellites"],
    queryFn: async (): Promise<SatellitesResponse> => {
      const res = await fetch("/api/satellites");
      if (!res.ok) throw new Error(`satellites request failed (${res.status})`);
      return res.json();
    },
    staleTime: 3_600_000,
    enabled,
  });
}
