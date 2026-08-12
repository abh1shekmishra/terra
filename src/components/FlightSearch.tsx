"use client";

import { useEffect, useState } from "react";
import { useLayerStore } from "@/store/useLayerStore";
import { useFlightSearchStore } from "@/store/useFlightSearchStore";
import { useFlights } from "@/lib/flights";
import { flightMatches } from "@/lib/flightSearch";

// Keep in sync with SEARCH_RENDER in Flights.tsx (how many matches we draw).
const SEARCH_RENDER = 4000;

/**
 * Search box for the flights layer: filter the globe to a single flight or a
 * whole airline. Typing updates a local value instantly and pushes a debounced
 * query to the scene, so the input stays smooth while the globe re-filters.
 */
export default function FlightSearch() {
  const flightsOn = useLayerStore((s) => s.enabled.flights);
  const setQuery = useFlightSearchStore((s) => s.setQuery);
  const [text, setText] = useState("");
  const { data } = useFlights(flightsOn);

  // Debounce the query the scene filters on.
  useEffect(() => {
    const id = setTimeout(() => setQuery(text), 180);
    return () => clearTimeout(id);
  }, [text, setQuery]);

  // Reset the shared query whenever the layer turns off (component unmounts).
  useEffect(() => () => setQuery(""), [setQuery]);

  if (!flightsOn) return null;

  const q = text.trim();
  const matchCount = q
    ? (data?.flights ?? []).filter((f) => flightMatches(f, q)).length
    : 0;

  return (
    <div className="pointer-events-auto w-[300px] max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/65 px-3 py-2 shadow-lg shadow-black/40 backdrop-blur-md focus-within:border-white/25">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-zinc-500"
          fill="none"
          aria-hidden
        >
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="m14 14 3.5 3.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Search flights by airline or flight number"
          placeholder="Search airline or flight — Emirates, BA123"
          className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        {text && (
          <button
            type="button"
            onClick={() => setText("")}
            aria-label="Clear search"
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors duration-150 hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            ✕
          </button>
        )}
      </div>
      {q ? (
        <div className="mt-1.5 text-center text-[11px] text-zinc-400">
          {matchCount === 0
            ? "No matching flights in view"
            : `${matchCount.toLocaleString()} matching ${matchCount === 1 ? "flight" : "flights"}`}
          {matchCount > SEARCH_RENDER && ` · showing ${SEARCH_RENDER.toLocaleString()}`}
        </div>
      ) : (
        data?.flights && (
          <div className="mt-1.5 text-center text-[11px] text-zinc-500">
            {data.flights.length.toLocaleString()} tracked · via OpenSky
          </div>
        )
      )}
    </div>
  );
}
