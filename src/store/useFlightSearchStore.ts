import { create } from "zustand";

interface FlightSearchState {
  /** Debounced query the scene filters on (airline name/code or flight number). */
  query: string;
  setQuery: (q: string) => void;
  clear: () => void;
}

/** Shared flight search query, read by the scene and the search box. */
export const useFlightSearchStore = create<FlightSearchState>((set) => ({
  query: "",
  setQuery: (query) => set({ query }),
  clear: () => set({ query: "" }),
}));
