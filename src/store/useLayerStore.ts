import { create } from "zustand";
import type { LayerId } from "@/lib/layers";

interface LayerState {
  /** Which layers are currently visible. */
  enabled: Record<LayerId, boolean>;
  toggle: (id: LayerId) => void;
  setEnabled: (id: LayerId, value: boolean) => void;
}

/** Global visibility state for every data layer, shared by the scene and UI. */
export const useLayerStore = create<LayerState>((set) => ({
  enabled: {
    earthquakes: false,
    flights: true,
    events: false,
    satellites: false,
    wind: false,
    air: false,
  },
  toggle: (id) =>
    set((state) => ({
      enabled: { ...state.enabled, [id]: !state.enabled[id] },
    })),
  setEnabled: (id, value) =>
    set((state) => ({ enabled: { ...state.enabled, [id]: value } })),
}));
