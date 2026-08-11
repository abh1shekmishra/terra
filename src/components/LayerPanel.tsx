"use client";

import { LAYERS } from "@/lib/layers";
import { useLayerStore } from "@/store/useLayerStore";
import { useViewStore } from "@/store/useViewStore";

export default function LayerPanel() {
  const enabled = useLayerStore((s) => s.enabled);
  const toggle = useLayerStore((s) => s.toggle);
  const showOrbits = useViewStore((s) => s.showOrbits);
  const toggleOrbits = useViewStore((s) => s.toggleOrbits);
  const showPlates = useViewStore((s) => s.showPlates);
  const togglePlates = useViewStore((s) => s.togglePlates);

  return (
    <nav
      aria-label="Data layers"
      className="pointer-events-auto w-52 rounded-2xl border border-white/10 bg-zinc-950/55 p-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:w-60"
    >
      <div className="px-2 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Layers
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
                <label className="ml-[26px] mt-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={showPlates}
                    onChange={togglePlates}
                    className="h-3 w-3 accent-orange-400"
                  />
                  Plate boundaries
                </label>
              )}

              {layer.id === "satellites" && on && (
                <label className="ml-[26px] mt-0.5 flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[11px] text-zinc-400 transition-colors hover:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={showOrbits}
                    onChange={toggleOrbits}
                    className="h-3 w-3 accent-sky-400"
                  />
                  Show orbits
                </label>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
