import { useQuery } from "@tanstack/react-query";

export interface NaturalEvent {
  id: string;
  title: string;
  cat: string; // category id
  catLabel: string; // category title
  lat: number;
  lng: number;
  date: string;
}

export interface EventsResponse {
  total: number;
  events: NaturalEvent[];
  error?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  wildfires: "#f97316",
  volcanoes: "#ef4444",
  severeStorms: "#38bdf8",
  seaLakeIce: "#a5f3fc",
  floods: "#3b82f6",
  drought: "#eab308",
  dustHaze: "#d6a06a",
  landslides: "#a16207",
  snow: "#e0f2fe",
  tempExtremes: "#fb7185",
  manmade: "#9ca3af",
  waterColor: "#22d3ee",
  earthquakes: "#f59e0b",
};

export function categoryColor(id: string): string {
  return CATEGORY_COLORS[id] ?? "#e5e7eb";
}

/** Live natural events from our proxy, refreshed every 5 minutes. */
export function useEvents(enabled: boolean) {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<EventsResponse> => {
      const res = await fetch("/api/events");
      if (!res.ok) throw new Error(`events request failed (${res.status})`);
      return res.json();
    },
    refetchInterval: 300_000,
    enabled,
  });
}
