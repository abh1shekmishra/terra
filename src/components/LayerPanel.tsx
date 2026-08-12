"use client";

import { useState } from "react";
import { LAYERS } from "@/lib/layers";
import { useLayerStore } from "@/store/useLayerStore";
import { useViewStore } from "@/store/useViewStore";

/**
 * A sub-option checkbox that matches the panel's toggles: a rounded square that
 * fills with the layer's accent colour and reveals a checkmark when on. The
 * real <input> is kept (transparent, on top) so keyboard + screen readers work.
 */
function SubToggle({
  label,
  checked,
  onChange,
  color,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  color: string;
}) {
  return (
    <label className="ml-[26px] mt-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-zinc-400 transition-colors duration-150 hover:text-zinc-200">
      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer absolute inset-0 cursor-pointer opacity-0"
        />
        <span
          aria-hidden
          className="h-3.5 w-3.5 rounded-[4px] border transition-colors duration-150 ease-out peer-focus-visible:ring-2 peer-focus-visible:ring-white/30"
          style={{
            backgroundColor: checked ? color : "rgba(255,255,255,0.05)",
            borderColor: checked ? color : "rgba(255,255,255,0.28)",
          }}
        />
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={`pointer-events-none absolute h-2.5 w-2.5 text-zinc-950 transition-transform duration-150 ease-out motion-reduce:transition-none ${
            checked ? "scale-100" : "scale-0"
          }`}
        >
          <path
            d="M2.5 6.2 L5 8.4 L9.5 3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {label}
    </label>
  );
}

export default function LayerPanel() {
  const enabled = useLayerStore((s) => s.enabled);
  const toggle = useLayerStore((s) => s.toggle);
  const showOrbits = useViewStore((s) => s.showOrbits);
  const toggleOrbits = useViewStore((s) => s.toggleOrbits);
  const showPlates = useViewStore((s) => s.showPlates);
  const togglePlates = useViewStore((s) => s.togglePlates);
  const [open, setOpen] = useState(false); // mobile expand/collapse
  const activeCount = LAYERS.filter((l) => enabled[l.id]).length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show layers"
        className={`pointer-events-auto items-center gap-2 rounded-full border border-white/10 bg-zinc-950/60 px-3.5 py-2 text-xs font-medium text-zinc-100 shadow-lg shadow-black/40 backdrop-blur-xl ${open ? "hidden" : "flex"} sm:hidden`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-zinc-300" fill="none" aria-hidden>
          <path d="M10 3 3 6.5 10 10l7-3.5L10 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M3 10.5 10 14l7-3.5M3 14 10 17.5 17 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        Layers
        <span className="rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums text-zinc-300">
          {activeCount}
        </span>
      </button>

    <nav
      aria-label="Data layers"
      className={`pointer-events-auto w-52 rounded-2xl border border-white/10 bg-zinc-950/55 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:w-60 ${open ? "block" : "hidden"} sm:block`}
    >
      <div className="flex items-center justify-between px-2 pb-1.5 pt-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Layers
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide layers"
          className="grid h-5 w-5 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-100 sm:hidden"
        >
          ✕
        </button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {LAYERS.map((layer) => {
          const on = enabled[layer.id];
          return (
            <li key={layer.id}>
              <button
                type="button"
                disabled={!layer.available}
                aria-pressed={on}
                onClick={() => toggle(layer.id)}
                className="group flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-150 ease-out hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 disabled:pointer-events-none disabled:opacity-45"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-opacity duration-150"
                  style={{ backgroundColor: layer.color, opacity: on ? 1 : 0.35 }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium leading-tight text-zinc-100">
                    {layer.label}
                  </span>
                  <span className="block text-[11px] leading-tight text-zinc-500">
                    {layer.available ? layer.description : "Coming soon"}
                  </span>
                </span>

                {layer.available ? (
                  <span
                    aria-hidden
                    className={`relative h-4 w-7 shrink-0 rounded-full transition-colors duration-150 ${
                      on ? "bg-emerald-500/80" : "bg-white/15"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform duration-150 ease-out motion-reduce:transition-none ${
                        on ? "translate-x-[14px]" : "translate-x-0.5"
                      }`}
                    />
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                    Soon
                  </span>
                )}
              </button>

              {layer.id === "earthquakes" && on && (
                <SubToggle
                  label="Plate boundaries"
                  checked={showPlates}
                  onChange={togglePlates}
                  color="#fb923c"
                />
              )}

              {layer.id === "satellites" && on && (
                <SubToggle
                  label="Show orbits"
                  checked={showOrbits}
                  onChange={toggleOrbits}
                  color="#38bdf8"
                />
              )}
            </li>
          );
        })}
      </ul>
    </nav>
    </>
  );
}
