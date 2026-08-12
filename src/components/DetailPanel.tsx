"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSelectionStore, type Selection } from "@/store/useSelectionStore";
import { useViewStore } from "@/store/useViewStore";
import { feltRadiusKm, magnitudeColor } from "@/lib/earthquakes";
import { categoryColor } from "@/lib/events";
import { satelliteColor } from "@/lib/satellites";
import { useSatcat } from "@/lib/satcat";
import { airlineForCallsign } from "@/data/airlines";
import { iataFlightNumber } from "@/lib/flightSearch";
import {
  isPositionOnRoute,
  useFlightDetail,
  type FlightAirport,
} from "@/lib/flightDetail";

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

/** A small "i" that reveals an explanation on hover or keyboard focus. */
function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="grid h-3.5 w-3.5 place-items-center rounded-full border border-white/25 text-[9px] font-semibold leading-none text-zinc-400 transition-colors duration-150 hover:border-white/50 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-10 mb-1.5 w-56 rounded-lg border border-white/10 bg-zinc-900/95 p-2 text-[10px] normal-case leading-snug tracking-normal text-zinc-300 opacity-0 shadow-xl shadow-black/50 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
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

function AirportEnd({
  airport,
  align,
}: {
  airport: FlightAirport;
  align: "left" | "right";
}) {
  return (
    <div className={`min-w-0 flex-1 ${align === "right" ? "text-right" : ""}`}>
      <div className="text-lg font-semibold tabular-nums text-zinc-100">
        {airport.iata || airport.icao || "—"}
      </div>
      <div className="truncate text-[11px] text-zinc-400">
        {airport.city || airport.name || airport.country}
      </div>
    </div>
  );
}

function FlightDetails({
  data,
  onClose,
}: {
  data: Extract<Selection, { kind: "flight" }>["data"];
  onClose: () => void;
}) {
  const localAirline = airlineForCallsign(data.cs);
  const { data: detail, isLoading } = useFlightDetail(data.cs, data.id);

  const airlineName = detail?.airline?.name ?? localAirline?.name ?? null;
  const flightNo = detail?.flightIata ?? iataFlightNumber(data.cs);
  const title = airlineName ?? data.cs;
  const origin = detail?.origin ?? null;
  const destination = detail?.destination ?? null;
  const onRoute =
    !!origin && !!destination && isPositionOnRoute(origin, destination, data.lat, data.lng);

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
        <span className="min-w-0 truncate text-base font-semibold tracking-wide text-zinc-100">
          {title}
        </span>
        <CloseButton onClose={onClose} />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
        <span className="font-mono text-zinc-300">{data.cs}</span>
        {flightNo && flightNo !== data.cs && <span>· {flightNo}</span>}
        {detail?.airline?.radio && (
          <span className="uppercase tracking-wide text-zinc-500">
            · “{detail.airline.radio}”
          </span>
        )}
        {!airlineName && data.co && <span>· {data.co}</span>}
      </div>

      {detail?.photo?.thumbnail && (
        <a
          href={detail.photo.link || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block overflow-hidden rounded-xl border border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.photo.thumbnail}
            alt={`${title} aircraft`}
            className="h-36 w-full object-cover"
            loading="lazy"
          />
          {detail.photo.credit && (
            <div className="bg-black/40 px-2 py-0.5 text-right text-[9px] text-zinc-400">
              © {detail.photo.credit}
            </div>
          )}
        </a>
      )}

      {origin && destination && (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="mb-2 flex items-center justify-between text-[9px] font-medium uppercase tracking-wide text-zinc-500">
            <span className="flex items-center gap-1.5">
              Scheduled route
              <InfoTip
                label="About this route"
                text="From a scheduled-flight database that can be outdated or wrong for this flight (callsign reuse, return legs). The live path on the globe is the aircraft's real ADS-B track."
              />
            </span>
            {onRoute ? (
              <span className="flex items-center gap-1 text-emerald-400/90">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                matches live
              </span>
            ) : (
              <span className="text-amber-400/90">may be outdated</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <AirportEnd airport={origin} align="left" />
            <span className="shrink-0 text-zinc-500" aria-hidden>
              ✈
            </span>
            <AirportEnd airport={destination} align="right" />
          </div>
          <div className="mt-2.5 flex items-center gap-4 border-t border-white/5 pt-2 text-[9px] text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-[3px] w-4 rounded-full bg-amber-500" />
              Flown
            </span>
            {onRoute && (
              <span className="flex items-center gap-1.5">
                <span className="h-[3px] w-4 rounded-full bg-amber-300" />
                Remaining
              </span>
            )}
          </div>
        </div>
      )}
      {isLoading && !origin && (
        <div className="mt-3 text-[11px] text-zinc-500">Looking up route…</div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3">
        <Stat label="Altitude" value={`${Math.round(data.alt * 3.281).toLocaleString()} ft`} />
        <Stat label="Speed" value={`${Math.round(data.vel * 3.6)} km/h`} />
        <Stat label="Heading" value={`${Math.round(data.hdg)}° ${compass(data.hdg)}`} />
        <Stat label="Vertical" value={verticalLabel(data.vr)} />
        {data.sq && <Stat label="Squawk" value={data.sq} />}
        <Stat label="ICAO24" value={<span className="font-mono text-xs">{data.id}</span>} />
      </div>

      {detail?.aircraft && (detail.aircraft.type || detail.aircraft.registration) && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/5 pt-3">
          {detail.aircraft.type && <Stat label="Aircraft" value={detail.aircraft.type} />}
          {detail.aircraft.registration && (
            <Stat
              label="Reg"
              value={<span className="font-mono text-xs">{detail.aircraft.registration}</span>}
            />
          )}
          {detail.aircraft.owner && (
            <div className="col-span-2">
              <Stat label="Operator" value={detail.aircraft.owner} />
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 border-t border-white/5 pt-2.5 text-[10px] leading-snug text-zinc-500">
        <span>
          <span className="text-zinc-400">Live</span> position, altitude &amp; track
          via ADS-B. Airline, route &amp; aircraft are looked up from reference
          databases and may be outdated.
        </span>
        <InfoTip
          label="Data sources"
          text="Position/altitude/speed: airplanes.live ADS-B (real-time). Airline: OpenFlights. Route: adsbdb (scheduled). Aircraft & photo: adsbdb / planespotters. Reference data is not guaranteed current."
        />
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
  const { data: satcat, isPending: satcatLoading } = useSatcat(data.id);
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

      {satcat && (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/5 pt-3">
          {satcat.launchDate && <Stat label="Launched" value={satcat.launchDate} />}
          {satcat.launchSite && <Stat label="From" value={satcat.launchSite} />}
          {satcat.owner && <Stat label="Owner" value={satcat.owner} />}
          {satcat.type && <Stat label="Type" value={satcat.type} />}
          {satcat.status && <Stat label="Status" value={satcat.status} />}
          {satcat.designator && <Stat label="Int'l ID" value={satcat.designator} />}
        </div>
      )}
      {satcatLoading && (
        <div className="mt-2 text-[11px] text-zinc-500">Loading mission data…</div>
      )}

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
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="pointer-events-auto max-h-[calc(100dvh-2rem)] w-[340px] max-w-[calc(100vw-1.5rem)] overflow-y-auto overflow-x-hidden rounded-2xl border border-white/10 bg-zinc-950/55 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
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
