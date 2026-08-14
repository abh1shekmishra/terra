import { useQuery } from "@tanstack/react-query";

export interface Launch {
  id: string;
  name: string;
  net: string; // ISO launch time
  status: string; // abbreviation (Go, TBD, TBC, ...)
  statusName: string;
  provider: string;
  rocket: string;
  pad: string;
  location: string;
  lat: number;
  lng: number;
  mission: string;
  missionDesc: string;
  image: string | null;
  url: string;
}

export interface LaunchesResponse {
  count: number;
  launches: Launch[];
  error?: string;
}

/** Upcoming rocket launches, refreshed hourly while the layer is on. */
export function useLaunches(enabled: boolean) {
  return useQuery({
    queryKey: ["launches"],
    queryFn: async (): Promise<LaunchesResponse> => {
      const res = await fetch("/api/launches");
      if (!res.ok) throw new Error(`launches failed (${res.status})`);
      return res.json();
    },
    enabled,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
}

/** "Go" launches glow green; anything unconfirmed is amber. */
export function launchColor(status: string): string {
  return status === "Go" || status === "Success" ? "#4ade80" : "#fbbf24";
}

/** Compact "in 3d 4h" / "in 2h 10m" / "in 5m" countdown, or "" if past/invalid. */
export function countdown(netIso: string, now: number = Date.now()): string {
  const t = Date.parse(netIso);
  if (!Number.isFinite(t)) return "";
  let s = Math.round((t - now) / 1000);
  if (s < 0) return "";
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}
