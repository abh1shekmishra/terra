"use client";

import { useState } from "react";
import { LAYERS, type LayerId } from "@/lib/layers";
import { useLayerStore } from "@/store/useLayerStore";
import { STEPS, cursorTime, useTimeStore } from "@/store/useTimeStore";
import { magnitudeColor, useEarthquakes } from "@/lib/earthquakes";
import { altitudeColor, useFlights } from "@/lib/flights";
import { useEvents } from "@/lib/events";
import { useSatellites } from "@/lib/satellites";

// Soft reference maxima used only to normalise the aggregate activity meter.
// Only "countable" layers appear here; field layers like wind are excluded.
const CAPS: Partial<Record<LayerId, number>> = {
  earthquakes: 300,
  flights: 1500,
  events: 1500,
  satellites: 1000,
};

const NOUN: Partial<Record<LayerId, string>> = {
  earthquakes: "earthquakes",
  flights: "aircraft",
  events: "events",
  satellites: "satellites",
};

function utcTime(ms: number): string {
  return ms ? `${new Date(ms).toISOString().slice(11, 16)} UTC` : "--:-- UTC";
}

export default function EarthActivity() {
  const enabled = useLayerStore((s) => s.enabled);
  const live = useTimeStore((s) => s.live);
  const windowKey = useTimeStore((s) => s.windowKey);
  const step = useTimeStore((s) => (s.live ? STEPS : Math.round(s.progress * STEPS)));
  const eq = useEarthquakes();
  const fl = useFlights(enabled.flights);
  const ev = useEvents(enabled.events);
  const sat = useSatellites(enabled.satellites);
  const [showWhy, setShowWhy] = useState(false);

  const counts: Partial<Record<LayerId, number | null>> = {
    earthquakes: eq.data ? eq.data.length : null,
    flights: fl.data ? fl.data.flights.length : null,
    events: ev.data ? ev.data.events.length : null,
    satellites: sat.data ? sat.data.satellites.length : null,
  };

  const updatedAt = Math.max(
    eq.dataUpdatedAt ?? 0,
    enabled.flights ? (fl.dataUpdatedAt ?? 0) : 0,
    enabled.events ? (ev.dataUpdatedAt ?? 0) : 0,
  );

  // Field layers (e.g. wind) have no count, so they're excluded from the console.
  const activeLayers = LAYERS.filter(
    (l) => l.available && enabled[l.id] && NOUN[l.id] !== undefined,
  );
  const contributions = activeLayers.map((l) => ({
    layer: l,
    value: Math.min((counts[l.id] ?? 0) / (CAPS[l.id] ?? 1), 1),
    count: counts[l.id] ?? null,
  }));
  const activity = contributions.length
    ? Math.round(
        (contributions.reduce((a, c) => a + c.value, 0) / contributions.length) *
          100,
      )
    : 0;

  const magScale = [0, 2, 3, 4, 5, 6, 7]
    .map((m) => `#${magnitudeColor(m).getHexString()}`)
    .join(", ");
  const altScale = [0, 3000, 6000, 9000, 12000]
    .map((a) => `#${altitudeColor(a).getHexString()}`)
    .join(", ");

  return (
    <div className="pointer-events-auto w-44 rounded-2xl border border-white/10 bg-zinc-950/55 p-3.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:w-64 sm:p-5">
      <div className="flex items-center justify-between">
        {live ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            History
          </span>
        )}
        <span className="text-[11px] tabular-nums text-zinc-500">
          {live
            ? utcTime(updatedAt)
            : new Date(
                cursorTime(windowKey, false, step / STEPS),
              ).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
        </span>
      </div>

      <div className="mt-3 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        Earth activity
      </div>
      <ul className="mt-2 flex flex-col gap-2">
        {activeLayers.map((l) => (
          <li key={l.id} className="flex items-baseline gap-2.5">
            <span
              className="h-2 w-2 shrink-0 translate-y-[3px] rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-lg font-semibold tabular-nums leading-none text-white sm:text-xl">
              {(counts[l.id] ?? null) === null
                ? "…"
                : counts[l.id]!.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-400">{NOUN[l.id]}</span>
          </li>
        ))}
        {activeLayers.length === 0 && (
          <li className="text-xs text-zinc-500">No layers active</li>
        )}
      </ul>

      {enabled.earthquakes && (
        <div className="mt-4">
          <div
            className="h-1.5 w-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${magScale})` }}
          />
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-zinc-500">
            <span>M0</span>
            <span>3</span>
            <span>5</span>
            <span>7+</span>
          </div>
        </div>
      )}

      {enabled.flights && (
        <div className="mt-4">
          <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-zinc-500">
            Flight altitude
          </div>
          <div
            className="h-1.5 w-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${altScale})` }}
          />
          <div className="mt-1 flex justify-between text-[9px] text-zinc-500">
            <span>ground</span>
            <span>cruise</span>
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Planetary activity
          </span>
          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            aria-expanded={showWhy}
            className="text-[10px] font-medium text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            {showWhy ? "hide" : "why"}
          </button>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.max(activity, 2)}%` }}
          />
        </div>

        {showWhy && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-[10px] leading-snug text-zinc-500">
              Aggregated across active layers — a relative visual signal, not a
              scientific score.
            </p>
            {contributions.map(({ layer, value }) => (
              <div key={layer.id} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[10px] text-zinc-400">
                  {layer.label}
                </span>
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(value * 100)}%`,
                      backgroundColor: layer.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-white/5 pt-2.5 text-[10px] text-zinc-500">
        USGS · OpenSky · NASA EONET
      </div>
    </div>
  );
}
