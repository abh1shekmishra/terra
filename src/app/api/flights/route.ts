import { NextResponse } from "next/server";

/**
 * Server-side proxy for the OpenSky live aircraft feed. Fetching here (not in the
 * browser) avoids CORS, lets us cache to respect OpenSky's rate limits, and lets
 * us trim each aircraft's state to the fields we use with rounded numbers. We
 * return *all* airborne aircraft (not a sample) so client-side search can find
 * any flight or airline; the scene still renders a light subset for framerate.
 * Always responds 200 with a (possibly empty) flights array so the layer is
 * never in a broken state.
 */

type State = (number | string | boolean | null)[];
interface OpenSkyResponse {
  time: number;
  states: State[] | null;
}

// A hard ceiling so a pathological feed can't blow up the payload.
const MAX_FLIGHTS = 20000;
const r4 = (n: number) => Math.round(n * 1e4) / 1e4; // ~11 m of lat/lng precision
const ri = (n: number) => Math.round(n);

export async function GET() {
  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      next: { revalidate: 45 },
    });
    if (!res.ok) throw new Error(`OpenSky responded ${res.status}`);
    const data = (await res.json()) as OpenSkyResponse;
    const states = data.states ?? [];

    const flights: unknown[] = [];
    for (const s of states) {
      const lng = s[5];
      const lat = s[6];
      const onGround = s[8];
      const heading = s[10];
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      if (onGround === true) continue;
      if (typeof heading !== "number") continue;
      const alt =
        typeof s[13] === "number" ? s[13] : typeof s[7] === "number" ? s[7] : 0;
      flights.push({
        id: String(s[0]),
        cs: (typeof s[1] === "string" ? s[1] : "").trim() || "unknown",
        co: typeof s[2] === "string" ? s[2] : "",
        lat: r4(lat),
        lng: r4(lng),
        hdg: ri(heading),
        alt: ri(alt),
        vel: ri(typeof s[9] === "number" ? s[9] : 0),
        vr: ri(typeof s[11] === "number" ? s[11] : 0), // vertical rate (m/s)
        sq: typeof s[14] === "string" ? s[14] : "", // transponder squawk
      });
      if (flights.length >= MAX_FLIGHTS) break;
    }

    return NextResponse.json(
      { time: data.time, total: flights.length, flights },
      {
        headers: {
          "Cache-Control": "public, s-maxage=45, stale-while-revalidate=120",
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
