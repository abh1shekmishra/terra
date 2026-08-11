"use client";

import { useEffect } from "react";
import { cursorTime, useTimeStore, type TimeWindow } from "@/store/useTimeStore";

const WINDOWS: TimeWindow[] = ["24h", "7d", "30d"];
const SWEEP_SECONDS = 18; // time to replay a full window during playback

function formatCursor(ms: number): string {
  return new Date(ms).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimeScrubber() {
  const windowKey = useTimeStore((s) => s.windowKey);
  const live = useTimeStore((s) => s.live);
  const progress = useTimeStore((s) => s.progress);
  const playing = useTimeStore((s) => s.playing);
  const setWindow = useTimeStore((s) => s.setWindow);
  const setProgress = useTimeStore((s) => s.setProgress);
  const goLive = useTimeStore((s) => s.goLive);
  const togglePlay = useTimeStore((s) => s.togglePlay);

  // Playback: sweep the window over SWEEP_SECONDS, then loop to the start.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      let p = useTimeStore.getState().progress + dt / SWEEP_SECONDS;
      if (p >= 1) p = 0;
      setProgress(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, setProgress]);

  const cursor = cursorTime(windowKey, live, progress);

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/60 px-2.5 py-2 shadow-2xl shadow-black/40 backdrop-blur-xl sm:gap-3 sm:px-3">
      <div className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5">
        {WINDOWS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWindow(w)}
            className={`rounded-md px-2 py-1 text-[11px] font-medium tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 ${
              windowKey === w
                ? "bg-white/15 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause time-lapse" : "Play time-lapse"}
        className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-sm text-zinc-100 transition-colors duration-150 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        {playing ? "❚❚" : "▶"}
      </button>

      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round((live ? 1 : progress) * 1000)}
        onChange={(e) => setProgress(Number(e.target.value) / 1000)}
        aria-label="Timeline position"
        className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-white/15 accent-sky-400 sm:w-52"
      />

      <span className="hidden w-28 shrink-0 text-center text-[11px] tabular-nums text-zinc-300 sm:block">
        {live ? "Now" : formatCursor(cursor)}
      </span>

      <button
        type="button"
        onClick={goLive}
        aria-pressed={live}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 ${
          live
            ? "bg-emerald-500/20 text-emerald-300"
            : "text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${live ? "bg-emerald-400" : "bg-zinc-500"}`}
        />
        Live
      </button>
    </div>
  );
}
