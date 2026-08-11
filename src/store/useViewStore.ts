import { create } from "zustand";

interface ViewState {
  /** NORAD id of the satellite the camera is currently riding, or null. */
  rideSatId: string | null;
  /** Whether satellite orbit trails are drawn. */
  showOrbits: boolean;
  /** Whether tectonic plate boundaries are overlaid. */
  showPlates: boolean;
  setRide: (id: string) => void;
  stopRide: () => void;
  toggleOrbits: () => void;
  togglePlates: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  rideSatId: null,
  showOrbits: true,
  showPlates: false,
  setRide: (rideSatId) => set({ rideSatId }),
  stopRide: () => set({ rideSatId: null }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
  togglePlates: () => set((s) => ({ showPlates: !s.showPlates })),
}));
