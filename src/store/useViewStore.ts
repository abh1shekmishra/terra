import { create } from "zustand";

interface ViewState {
  /** NORAD id of the satellite the camera is currently riding, or null. */
  rideSatId: string | null;
  /** Whether satellite orbit trails are drawn. */
  showOrbits: boolean;
  setRide: (id: string) => void;
  stopRide: () => void;
  toggleOrbits: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  rideSatId: null,
  showOrbits: true,
  setRide: (rideSatId) => set({ rideSatId }),
  stopRide: () => set({ rideSatId: null }),
  toggleOrbits: () => set((s) => ({ showOrbits: !s.showOrbits })),
}));
