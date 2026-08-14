import { NextResponse } from "next/server";

/**
 * Server-side proxy for live aircraft, sourced from adsb.lol (a community,
 * privacy-focused ADS-B network, keyless). OpenSky blocks shared cloud IPs, so
 * it fails on hosts like Vercel; adsb.lol works from serverless. Its API is radius
 * based (250 nm max), so we query a spread of the world's traffic hotspots in
 * parallel and merge/de-dupe by ICAO hex. Numbers are converted to our units
 * (metres, m/s) and rounded. Always responds 200 with a (possibly empty) list.
 */

// Traffic-dense points; 250 nm circles around these cover most airborne flights.
const REGIONS: Array<[number, number]> = [
  [51, 2], [48, 12], [41, 22], [56, 15], [40, -4], // Europe
  [41, -75], [33, -84], [39, -95], [37, -119], [44, -79], // North America
  [20, -100], [-23, -47], [4, -74], // Latin America
  [25, 52], [22, 78], [28, 70], // Middle East / India
  [5, 103], [14, 100], [32, 118], [37, 132], // SE + East Asia
  [-33, 151], [-28, 26], [9, 8], // Australia / Africa
];

const MAX_FLIGHTS = 20000;
const KTS_TO_MS = 0.514444;
const FT_TO_M = 0.3048;
const FPM_TO_MS = 0.00508; // ft/min -> m/s
const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const ri = (n: number) => Math.round(n);

interface Ac {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  track?: number;
  true_heading?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  baro_rate?: number;
  geom_rate?: number;
  squawk?: string;
}

async function fetchRegion([lat, lon]: [number, number]): Promise<Ac[]> {
  try {
    const res = await fetch(
      `https://api.adsb.lol/v2/point/${lat}/${lon}/250`,
      {
        headers: { "User-Agent": "Terra (github.com/abh1shekmishra/terra)" },
        next: { revalidate: 30 },
      },
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { ac?: Ac[] };
    return json.ac ?? [];
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const groups = await Promise.all(REGIONS.map(fetchRegion));
    const byHex = new Map<string, unknown>();

    for (const ac of groups.flat()) {
      const hex = ac.hex;
      const lat = ac.lat;
      const lon = ac.lon;
      if (!hex || typeof lat !== "number" || typeof lon !== "number") continue;
      if (byHex.has(hex)) continue;
      const heading = typeof ac.track === "number" ? ac.track : ac.true_heading;
      if (typeof heading !== "number") continue;
      // alt_baro is "ground" (string) when on the ground; skip those.
      const altFt =
        typeof ac.alt_baro === "number"
          ? ac.alt_baro
          : typeof ac.alt_geom === "number"
            ? ac.alt_geom
            : null;
      if (altFt === null) continue;
      const rateFpm =
        typeof ac.baro_rate === "number"
          ? ac.baro_rate
          : typeof ac.geom_rate === "number"
            ? ac.geom_rate
            : 0;
      byHex.set(hex, {
        id: hex,
        cs: (ac.flight ?? "").trim() || "unknown",
        co: "",
        lat: r4(lat),
        lng: r4(lon),
        hdg: ri(heading),
        alt: ri(altFt * FT_TO_M),
        vel: ri((typeof ac.gs === "number" ? ac.gs : 0) * KTS_TO_MS),
        vr: ri(rateFpm * FPM_TO_MS),
        sq: typeof ac.squawk === "string" ? ac.squawk : "",
      });
      if (byHex.size >= MAX_FLIGHTS) break;
    }

    const flights = [...byHex.values()];
    return NextResponse.json(
      { time: Date.now(), total: flights.length, flights },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=90",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { time: 0, total: 0, flights: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
