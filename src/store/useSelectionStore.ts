import { create } from "zustand";
import type { Earthquake } from "@/lib/earthquakes";
import type { Flight } from "@/lib/flights";
import type { NaturalEvent } from "@/lib/events";
import type { SatelliteDetail } from "@/lib/satellites";
import type { Launch } from "@/lib/launches";

/** The marker the user has clicked, shown in the detail panel. */
export type Selection =
  | { kind: "earthquake"; data: Earthquake }
  | { kind: "flight"; data: Flight }
  | { kind: "event"; data: NaturalEvent }
  | { kind: "satellite"; data: SatelliteDetail }
  | { kind: "launch"; data: Launch };

interface SelectionState {
  selected: Selection | null;
  select: (selection: Selection) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selected: null,
  select: (selection) => set({ selected: selection }),
  clear: () => set({ selected: null }),
}));
