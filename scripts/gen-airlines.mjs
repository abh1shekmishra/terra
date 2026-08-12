import { readFileSync, writeFileSync } from "node:fs";

// Path to the OpenFlights airlines.dat dump. Pass as the first CLI arg, e.g.
//   node scripts/gen-airlines.mjs ./airlines.dat
const SRC = process.argv[2];
if (!SRC) {
  console.error("Usage: node scripts/gen-airlines.mjs <path-to-airlines.dat>");
  process.exit(1);
}
const raw = readFileSync(SRC, "utf8");

// Minimal CSV line parser (handles quoted fields, \N nulls).
function parseLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((f) => (f === "\\N" ? "" : f.trim()));
}

const ICAO = /^[A-Z]{3}$/;
const map = new Map(); // icao -> { name, iata, active }

for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  const [, name, , iata, icao, , , active] = parseLine(line);
  if (!ICAO.test(icao) || icao === "N/A") continue;
  if (!name || name === "Unknown" || name === "Private flight") continue;
  const isActive = active === "Y";
  const existing = map.get(icao);
  // Prefer an active carrier when two share an ICAO code.
  if (existing && existing.active && !isActive) continue;
  map.set(icao, {
    name,
    iata: /^[A-Z0-9]{2}$/.test(iata) ? iata : "",
    active: isActive,
  });
}

const sorted = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
const body = sorted
  .map(([icao, v]) => `  ${icao}: ${JSON.stringify({ name: v.name, iata: v.iata })},`)
  .join("\n");

const ts = `// Auto-generated from the OpenFlights airlines database.
// Maps an ICAO airline code (first 3 letters of a flight callsign, e.g. "BAW"
// in "BAW123") to the airline. Used to resolve and search flights offline, with
// no API calls. Regenerate with scripts/gen-airlines.mjs.

export interface AirlineInfo {
  name: string;
  iata: string; // 2-char IATA code, "" if none
}

export const AIRLINES: Record<string, AirlineInfo> = {
${body}
};

/** Resolve the airline for a flight callsign via its 3-letter ICAO prefix. */
export function airlineForCallsign(callsign: string): AirlineInfo | null {
  const code = callsign.trim().slice(0, 3).toUpperCase();
  return AIRLINES[code] ?? null;
}
`;

writeFileSync("src/data/airlines.ts", ts);
console.log(`Wrote ${sorted.length} airlines to src/data/airlines.ts`);
