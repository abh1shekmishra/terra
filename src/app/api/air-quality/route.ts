import { NextResponse } from "next/server";

/**
 * A coarse global air-quality grid (US AQI), fetched from Open-Meteo in one bulk
 * request (keyless). Same shape as the wind grid: a regular lat/lng lattice the
 * client interpolates and renders as a pollution heat field. AQI changes slowly,
 * so this is cached for an hour. Always responds 200.
 */

const LAT_MIN = -80;
const LNG_MIN = -180;
const D = 10;
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
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats.join(",")}` +
      `&longitude=${lngs.join(",")}&current=us_aqi`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) throw new Error(`Open-Meteo AQ responded ${res.status}`);
    const points = (await res.json()) as Array<{
      current?: { us_aqi?: number | null };
    }>;

    const aqi = points.map((p) => Math.round(p.current?.us_aqi ?? 0));

    return NextResponse.json(
      { latMin: LAT_MIN, lngMin: LNG_MIN, d: D, nLat: N_LAT, nLng: N_LNG, aqi },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { latMin: LAT_MIN, lngMin: LNG_MIN, d: D, nLat: N_LAT, nLng: N_LNG, aqi: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
