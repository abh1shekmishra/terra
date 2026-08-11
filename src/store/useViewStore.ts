import { create } from "zustand";

interface ViewState {
  /** World-space point the camera should fly to (e.g. a satellite vantage). */
  flyTarget: [number, number, number] | null;
  setFlyTarget: (t: [number, number, number]) => void;
  clearFly: () => void;
}

export const useViewStore = create<ViewState>((set) => ({
  flyTarget: null,
  setFlyTarget: (flyTarget) => set({ flyTarget }),
  clearFly: () => set({ flyTarget: null }),
}));
