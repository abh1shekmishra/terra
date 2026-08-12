import { NextResponse } from "next/server";

/**
 * The *actual* flown path for one aircraft, from OpenSky's track endpoint. Unlike
 * a scheduled callsign→route lookup (which is often wrong: callsign reuse, return
 * legs, stale data), this is where the plane really went, so it always matches
 * the live position. Keyless. Each path point is [time, lat, lng, baro_alt,
 * true_track, on_ground]. Cached briefly since the track grows as the plane flies.
 */

type TrackPoint = [number, number, number, number | null, number | null, boolean];
interface OpenSkyTrack {
  icao24: string;
  callsign: string | null;
  path: TrackPoint[] | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hex = (searchParams.get("hex") ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{6}$/.test(hex)) {
    return NextResponse.json({ path: [] }, { status: 200 });
  }
  try {
    const res = await fetch(
      `https://opensky-network.org/api/tracks/all?icao24=${hex}&time=0`,
      { next: { revalidate: 30 } },
    );
    if (!res.ok) return NextResponse.json({ path: [] }, { status: 200 });
    const data = (await res.json()) as OpenSkyTrack;
    const raw = Array.isArray(data.path) ? data.path : [];
    const path = raw
      .filter((p) => typeof p[1] === "number" && typeof p[2] === "number")
      .map((p) => ({
        lat: p[1],
        lng: p[2],
        alt: typeof p[3] === "number" ? p[3] : 0,
      }));
    return NextResponse.json(
      { path, callsign: (data.callsign ?? "").trim() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { path: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
