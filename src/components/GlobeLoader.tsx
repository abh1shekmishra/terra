"use client";

import { LAYERS } from "@/lib/layers";
import { useLayerStore } from "@/store/useLayerStore";
import { useEarthquakes } from "@/lib/earthquakes";
import { useFlights } from "@/lib/flights";
import { useEvents } from "@/lib/events";
import { useSatellites } from "@/lib/satellites";
import { useWind } from "@/lib/wind";
import { useAirQuality } from "@/lib/airQuality";
import { useLaunches } from "@/lib/launches";

/**
 * A small status pill over the globe that shows when a layer has been toggled on
 * but its data is still fetching. It watches each layer's query (these share the
 * same cache as the scene's own hooks, so no extra requests) and shows only
 * first-load fetches — a re-toggle that hits cache shows nothing, as it should.
 */
export default function GlobeLoader() {
  const enabled = useLayerStore((s) => s.enabled);

  const eq = useEarthquakes();
  const fl = useFlights(enabled.flights);
  const ev = useEvents(enabled.events);
  const sat = useSatellites(enabled.satellites);
  const wind = useWind(enabled.wind);
  const air = useAirQuality(enabled.air);
  const launches = useLaunches(enabled.launches);

  const isLoading: Record<string, boolean> = {
    earthquakes: enabled.earthquakes && eq.isLoading,
    flights: enabled.flights && fl.isLoading,
    events: enabled.events && ev.isLoading,
    satellites: enabled.satellites && sat.isLoading,
    wind: enabled.wind && wind.isLoading,
    air: enabled.air && air.isLoading,
    launches: enabled.launches && launches.isLoading,
  };

  const loading = LAYERS.filter((l) => isLoading[l.id]);
  if (loading.length === 0) return null;

  const names = loading.map((l) => l.label.toLowerCase()).join(", ");

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/65 px-3 py-1.5 text-xs font-medium text-zinc-200 shadow-lg shadow-black/40 backdrop-blur-md">
      <span
        className="terra-spinner"
        style={{ borderTopColor: loading[0].color }}
        aria-hidden
      />
      <span>
        Fetching {names}
        <span className="terra-dots" aria-hidden />
      </span>
      <span className="sr-only">Loading {names} data</span>
    </div>
  );
}
