import { useQuery } from "@tanstack/react-query";

export interface SatcatRecord {
  name: string;
  designator: string;
  type: string;
  status: string;
  owner: string;
  launchDate: string;
  launchSite: string;
  apogee: number;
  perigee: number;
}

/** Fetch a satellite's catalogue record on demand (when its panel is open). */
export function useSatcat(id: string | null) {
  return useQuery({
    queryKey: ["satcat", id],
    enabled: id !== null,
    staleTime: 24 * 3_600_000,
    queryFn: async (): Promise<SatcatRecord | null> => {
      const res = await fetch(`/api/satcat?id=${id}`);
      if (!res.ok) throw new Error(`satcat request failed (${res.status})`);
      return res.json();
    },
  });
}
