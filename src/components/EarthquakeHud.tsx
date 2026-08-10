"use client";

import { magnitudeColor, useEarthquakes } from "@/lib/earthquakes";

const LEGEND = [
  { label: "< 2", mag: 1.5 },
  { label: "3", mag: 3 },
  { label: "4", mag: 4 },
  { label: "5", mag: 5 },
  { label: "6+", mag: 6.5 },
];

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-60 rounded-xl border border-white/10 bg-zinc-950/70 p-4 backdrop-blur-md">
      {children}
    </div>
  );
}

export default function EarthquakeHud() {
  const { data, isPending, isError, dataUpdatedAt } = useEarthquakes();

  if (isError) {
    return (
      <Panel>
        <div className="text-sm font-medium text-zinc-200">Earthquakes</div>
        <p className="mt-1 text-xs text-zinc-400">
          Couldn&apos;t reach the USGS feed. Retrying…
        </p>
      </Panel>
    );
  }

  if (isPending || !data) {
    return (
      <Panel>
        <div className="text-sm font-medium text-zinc-200">Earthquakes</div>
        <p className="mt-1 text-xs text-zinc-400">Loading live feed…</p>
      </Panel>
    );
  }

  const strongest = data.reduce(
    (max, q) => (q.mag > max ? q.mag : max),
    -Infinity,
  );
  const updated = new Date(dataUpdatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-200">Earthquakes</span>
        <span className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-white">
          {data.length}
        </span>
        <span className="text-xs text-zinc-400">in the last 24 hours</span>
      </div>

      <div className="mt-1 text-xs text-zinc-400">
        Strongest{" "}
        <span
          className="font-semibold tabular-nums"
          style={{ color: `#${magnitudeColor(strongest).getHexString()}` }}
        >
          M {strongest.toFixed(1)}
        </span>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
          Magnitude
        </div>
        <div className="flex items-center gap-1">
          {LEGEND.map((s) => (
            <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: `#${magnitudeColor(s.mag).getHexString()}` }}
              />
              <span className="text-[10px] tabular-nums text-zinc-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-white/5 pt-2 text-[11px] text-zinc-500">
        USGS · updated {updated}
      </div>
    </Panel>
  );
}
