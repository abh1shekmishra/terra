"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSelectionStore, type Selection } from "@/store/useSelectionStore";
import { useViewStore } from "@/store/useViewStore";
import { feltRadiusKm, magnitudeColor } from "@/lib/earthquakes";
import { categoryColor } from "@/lib/events";
import { satelliteColor } from "@/lib/satellites";

const ALERT_COLORS: Record<string, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  red: "#ef4444",
};

function compass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

function verticalLabel(vr: number): string {
  if (vr > 0.5) return "Climbing";
  if (vr < -0.5) return "Descending";
  return "Level";
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">
        {label}
      </div>
      <div className="mt-0.5 text-[13px] tabular-nums text-zinc-100">{value}</div>
    </div>
  );
}

function DetailLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors duration-150 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      {children}
      <span aria-hidden>↗</span>
    </a>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close details"
      className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-md text-zinc-400 transition-colors duration-150 hover:bg-white/10 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
    >
      ✕
    </button>
  );
}

function EarthquakeDetails({
  data,
  onClose,
}: {
  data: Extract<Selection, { kind: "earthquake" }>["data"];
  onClose: () => void;
}) {
  const color = `#${magnitudeColor(data.mag).getHexString()}`;
  const felt = Math.round(feltRadiusKm(data.mag, data.depth));
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-base font-semibold tabular-nums" style={{ color }}>
          M {data.mag.toFixed(1)}
        </span>
        {data.magType && (
          <span className="text-[11px] uppercase text-zinc-500">{data.magType}</span>
        )}
        {data.tsunami && (
          <span className="rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-400">
            Tsunami
          </span>
        )}
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-1.5 text-sm leading-snug text-zinc-200">{data.place}</div>

      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
        <Stat label="Depth" value={`${data.depth.toFixed(0)} km`} />
        <Stat label="Felt radius" value={felt > 0 ? `~${felt} km` : "local"} />
        <Stat
          label="When"
          value={new Date(data.time).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
        {data.mmi != null && <Stat label="Intensity" value={`MMI ${data.mmi.toFixed(1)}`} />}
        {data.felt != null && <Stat label="Felt reports" value={data.felt.toLocaleString()} />}
        {data.alert && (
          <Stat
            label="Alert"
            value={
              <span
                className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase text-black"
                style={{ backgroundColor: ALERT_COLORS[data.alert] ?? "#e5e7eb" }}
              >
                {data.alert}
              </span>
            }
          />
        )}
        <Stat label="Significance" value={data.sig} />
        {data.status && <Stat label="Status" value={data.status} />}
      </div>

      {data.url && <DetailLink href={data.url}>View on USGS</DetailLink>}
    </>
  );
}

function FlightDetails({
  data,
  onClose,
}: {
  data: Extract<Selection, { kind: "flight" }>["data"];
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
        <span className="text-base font-semibold tracking-wide text-zinc-100">
          {data.cs}
        </span>
        <CloseButton onClose={onClose} />
      </div>
      {data.co && <div className="mt-1.5 text-sm text-zinc-300">{data.co}</div>}

      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
        <Stat label="Altitude" value={`${Math.round(data.alt * 3.281).toLocaleString()} ft`} />
        <Stat label="Speed" value={`${Math.round(data.vel * 3.6)} km/h`} />
        <Stat label="Heading" value={`${Math.round(data.hdg)}° ${compass(data.hdg)}`} />
        <Stat label="Vertical" value={verticalLabel(data.vr)} />
        {data.sq && <Stat label="Squawk" value={data.sq} />}
        <Stat label="ICAO24" value={<span className="font-mono text-xs">{data.id}</span>} />
      </div>
    </>
  );
}

function EventDetails({
  data,
  onClose,
}: {
  data: Extract<Selection, { kind: "event" }>["data"];
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: categoryColor(data.cat) }}
        />
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
          {data.catLabel}
        </span>
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-1.5 text-sm leading-snug text-zinc-100">{data.title}</div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
        <Stat
          label="Reported"
          value={new Date(data.date).toLocaleDateString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        />
        {data.points > 1 && <Stat label="Track points" value={data.points} />}
      </div>

      {data.link && <DetailLink href={data.link}>Source</DetailLink>}
    </>
  );
}

function SatelliteDetails({
  data,
  onClose,
}: {
  data: Extract<Selection, { kind: "satellite" }>["data"];
  onClose: () => void;
}) {
  const setRide = useViewStore((s) => s.setRide);
  const stopRide = useViewStore((s) => s.stopRide);
  const riding = useViewStore((s) => s.rideSatId) === data.id;
  return (
    <>
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: satelliteColor(data.group) }}
        />
        <span className="text-sm font-semibold tracking-wide text-zinc-100">
          {data.name}
        </span>
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-zinc-500">
        {data.group} · NORAD {data.id}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
        <Stat label="Altitude" value={`${Math.round(data.altKm).toLocaleString()} km`} />
        <Stat label="Speed" value={`${data.velKms.toFixed(2)} km/s`} />
        <Stat label="Inclination" value={`${data.incDeg.toFixed(1)}°`} />
        <Stat label="Period" value={`${Math.round(data.periodMin)} min`} />
        <Stat
          label="Over"
          value={`${data.lat.toFixed(1)}°, ${data.lng.toFixed(1)}°`}
        />
      </div>

      <button
        type="button"
        onClick={() => (riding ? stopRide() : setRide(data.id))}
        className={`mt-3 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 ${
          riding
            ? "border-sky-400/40 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25"
            : "border-white/10 text-zinc-200 hover:bg-white/5"
        }`}
      >
        {riding ? "Exit satellite view" : "View from satellite"}
        <span aria-hidden>{riding ? "✕" : "↗"}</span>
      </button>
    </>
  );
}

export default function DetailPanel() {
  const selected = useSelectionStore((s) => s.selected);
  const clear = useSelectionStore((s) => s.clear);

  return (
    <AnimatePresence>
      {selected && (
        <motion.div
          key={`${selected.kind}-${selected.data.id}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto w-[340px] max-w-[calc(100vw-3rem)] rounded-2xl border border-white/10 bg-zinc-950/70 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
        >
          {selected.kind === "earthquake" && (
            <EarthquakeDetails data={selected.data} onClose={clear} />
          )}
          {selected.kind === "flight" && (
            <FlightDetails data={selected.data} onClose={clear} />
          )}
          {selected.kind === "event" && (
            <EventDetails data={selected.data} onClose={clear} />
          )}
          {selected.kind === "satellite" && (
            <SatelliteDetails data={selected.data} onClose={clear} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
