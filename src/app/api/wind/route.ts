import { NextResponse } from "next/server";

/**
 * A coarse global surface-wind grid, fetched from Open-Meteo in a single bulk
 * request (keyless). We sample a regular lat/lng grid, convert each point's
 * meteorological speed+direction into eastward (u) and northward (v) components,
 * and return the grid for the client to interpolate and animate. Wind changes
 * slowly, so this is cached for an hour.
 */

const LAT_MIN = -80;
const LNG_MIN = -180;
const D = 10; // grid step in degrees
const N_LAT = 17; // -80..80
const N_LNG = 36; // -180..170

export async function GET() {
  try {
    const lats: number[] = [];
    const lngs: number[] = [];
    for (let i = 0; i < N_LAT; i++) {
      for (let j = 0; j < N_LNG; j++) {
        lats.push(LAT_MIN + i * D);
        lngs.push(LNG_MIN + j * D);
      }
    }

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(",")}` +
      `&longitude=${lngs.join(",")}` +
      `&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Open-Meteo responded ${res.status}`);
    const points = (await res.json()) as Array<{
      current?: { wind_speed_10m?: number; wind_direction_10m?: number };
    }>;

    const u: number[] = [];
    const v: number[] = [];
    for (const p of points) {
      const s = p.current?.wind_speed_10m ?? 0;
      const d = ((p.current?.wind_direction_10m ?? 0) * Math.PI) / 180;
      // Meteorological direction is where wind comes FROM.
      u.push(Math.round(-s * Math.sin(d) * 100) / 100);
      v.push(Math.round(-s * Math.cos(d) * 100) / 100);
    }

    return NextResponse.json(
      { latMin: LAT_MIN, lngMin: LNG_MIN, d: D, nLat: N_LAT, nLng: N_LNG, u, v },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { latMin: LAT_MIN, lngMin: LNG_MIN, d: D, nLat: N_LAT, nLng: N_LNG, u: [], v: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
