import { create } from "zustand";

export type TimeWindow = "24h" | "7d" | "30d";

export const WINDOW_MS: Record<TimeWindow, number> = {
  "24h": 24 * 3_600_000,
  "7d": 7 * 24 * 3_600_000,
  "30d": 30 * 24 * 3_600_000,
};

/** Quantisation of the timeline: layers re-render at most this many times per sweep. */
export const STEPS = 240;

interface TimeState {
  windowKey: TimeWindow;
  live: boolean; // true = pinned to "now"
  progress: number; // 0..1 within the window (1 = now)
  playing: boolean;
  setWindow: (w: TimeWindow) => void;
  setProgress: (p: number) => void; // drags into history mode
  goLive: () => void;
  togglePlay: () => void;
  setPlaying: (p: boolean) => void;
}

export const useTimeStore = create<TimeState>((set) => ({
  windowKey: "24h",
  live: true,
  progress: 1,
  playing: false,
  setWindow: (windowKey) => set({ windowKey }),
  setProgress: (progress) =>
    set({ progress: Math.max(0, Math.min(1, progress)), live: false }),
  goLive: () => set({ live: true, playing: false, progress: 1 }),
  togglePlay: () => set((s) => ({ playing: !s.playing, live: false })),
  setPlaying: (playing) => set({ playing }),
}));

/** Absolute cursor time (epoch ms) implied by the window + progress. */
export function cursorTime(
  windowKey: TimeWindow,
  live: boolean,
  progress: number,
): number {
  const now = Date.now();
  return live ? now : now - WINDOW_MS[windowKey] * (1 - progress);
}

/** USGS feed matching the window (magnitude-filtered for longer spans). */
export function quakeFeed(windowKey: TimeWindow): string {
  if (windowKey === "7d") return "2.5_week";
  if (windowKey === "30d") return "2.5_month";
  return "all_day";
}
