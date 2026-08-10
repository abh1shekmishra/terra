import { NextResponse } from "next/server";

/**
 * Server-side proxy for the OpenSky live aircraft feed. Fetching here (not in the
 * browser) avoids CORS, lets us cache to respect OpenSky's rate limits, and lets
 * us trim ~10k aircraft down to a compact sample before it reaches the client.
 * Always responds 200 with a (possibly empty) flights array so the layer is
 * never in a broken state.
 */

type State = (number | string | boolean | null)[];
interface OpenSkyResponse {
  time: number;
  states: State[] | null;
}

const MAX_FLIGHTS = 1200;

export async function GET() {
  try {
    const res = await fetch("https://opensky-network.org/api/states/all", {
      next: { revalidate: 45 },
    });
    if (!res.ok) throw new Error(`OpenSky responded ${res.status}`);
    const data = (await res.json()) as OpenSkyResponse;
    const states = data.states ?? [];

    const airborne: unknown[] = [];
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
      airborne.push({
        id: String(s[0]),
        cs: (typeof s[1] === "string" ? s[1] : "").trim() || "unknown",
        co: typeof s[2] === "string" ? s[2] : "",
        lat,
        lng,
        hdg: heading,
        alt,
        vel: typeof s[9] === "number" ? s[9] : 0,
      });
    }

    const step = Math.max(1, Math.floor(airborne.length / MAX_FLIGHTS));
    const flights =
      step > 1
        ? airborne.filter((_, i) => i % step === 0).slice(0, MAX_FLIGHTS)
        : airborne;

    return NextResponse.json(
      { time: data.time, total: airborne.length, flights },
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
