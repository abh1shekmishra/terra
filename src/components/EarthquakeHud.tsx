"use client";

import { useMemo } from "react";
import { magnitudeColor, useEarthquakes, type Earthquake } from "@/lib/earthquakes";

const BUCKETS = [
  { label: "<2", test: (m: number) => m < 2, mag: 1.5 },
  { label: "2", test: (m: number) => m >= 2 && m < 3, mag: 2.5 },
  { label: "3", test: (m: number) => m >= 3 && m < 4, mag: 3.5 },
  { label: "4", test: (m: number) => m >= 4 && m < 5, mag: 4.5 },
  { label: "5+", test: (m: number) => m >= 5, mag: 5.5 },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-white/10 bg-zinc-950/55 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
      {children}
    </div>
  );
}

function Header({ live }: { live?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[13px] font-semibold tracking-wide text-zinc-100">
        Earthquakes
      </h2>
      {live && (
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
      )}
    </div>
  );
}

export default function EarthquakeHud() {
  const { data, isPending, isError, dataUpdatedAt } = useEarthquakes();

  const scaleGradient = useMemo(
    () =>
      `linear-gradient(90deg, ${[0, 1, 2, 3, 4, 5, 6, 7]
        .map((m) => `#${magnitudeColor(m).getHexString()}`)
        .join(", ")})`,
    [],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    const counts = BUCKETS.map((b) => data.filter((q) => b.test(q.mag)).length);
    const max = Math.max(1, ...counts);
    const strongest = data.reduce<Earthquake | null>(
      (top, q) => (!top || q.mag > top.mag ? q : top),
      null,
    );
    return { counts, max, strongest };
  }, [data]);

  if (isError) {
    return (
      <Shell>
        <Header />
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">
          Couldn&apos;t reach the USGS feed. Retrying automatically…
        </p>
      </Shell>
    );
  }

  if (isPending || !data || !stats) {
    return (
      <Shell>
        <Header />
        <div className="mt-3 h-9 w-24 animate-pulse rounded-md bg-white/5" />
        <div className="mt-3 h-16 w-full animate-pulse rounded-md bg-white/5" />
      </Shell>
    );
  }

  const updated = new Date(dataUpdatedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Shell>
      <Header live />

      <div className="mt-3 flex items-end gap-2">
        <span className="text-[34px] font-semibold leading-none tabular-nums text-white">
          {data.length}
        </span>
        <span className="pb-0.5 text-[11px] leading-tight text-zinc-400">
          in the last
          <br />
          24 hours
        </span>
      </div>

      {stats.strongest && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-zinc-400">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: `#${magnitudeColor(stats.strongest.mag).getHexString()}`,
            }}
          />
          Strongest
          <span className="font-semibold tabular-nums text-zinc-200">
            M {stats.strongest.mag.toFixed(1)}
          </span>
        </div>
      )}

      {/* Magnitude distribution */}
      <div className="mt-5">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          By magnitude
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {BUCKETS.map((b, i) => {
            const count = stats.counts[i];
            const h = Math.max(3, (count / stats.max) * 100);
            return (
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] tabular-nums text-zinc-500">
                  {count}
                </span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${h}%`,
                      backgroundColor: `#${magnitudeColor(b.mag).getHexString()}`,
                    }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-zinc-500">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Continuous scale legend */}
      <div className="mt-4">
        <div
          className="h-1.5 w-full rounded-full"
          style={{ background: scaleGradient }}
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-zinc-500">
          <span>0</span>
          <span>3</span>
          <span>5</span>
          <span>7+</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-zinc-500">
        <span>USGS.gov</span>
        <span className="tabular-nums">updated {updated}</span>
      </div>
    </Shell>
  );
}
