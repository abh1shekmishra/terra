import { NextResponse } from "next/server";

/**
 * The live auroral oval from NOAA SWPC's OVATION model (keyless). The feed is a
 * global 1-degree grid of aurora probability; we keep only points with a
 * meaningful value (the oval near each pole) and downsample longitude to keep
 * the payload small. Longitudes come as 0..359 and are normalised to -180..180.
 * Updates every few minutes, so cached briefly. Always responds 200.
 */

const MIN_VALUE = 3; // aurora probability threshold to include a point

export async function GET() {
  try {
    const res = await fetch(
      "https://services.swpc.noaa.gov/json/ovation_aurora_latest.json",
      { next: { revalidate: 300 } },
    );
    if (!res.ok) throw new Error(`SWPC responded ${res.status}`);
    const data = (await res.json()) as {
      coordinates?: [number, number, number][];
      "Forecast Time"?: string;
    };

    const points: { lat: number; lng: number; val: number }[] = [];
    for (const [lng, lat, val] of data.coordinates ?? []) {
      if (val < MIN_VALUE) continue;
      if (lng % 2 !== 0) continue; // downsample longitude by 2
      points.push({ lat, lng: lng > 180 ? lng - 360 : lng, val });
    }

    return NextResponse.json(
      { forecastTime: data["Forecast Time"] ?? "", points },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { forecastTime: "", points: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
