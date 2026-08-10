import { NextResponse } from "next/server";

/**
 * Server-side proxy for NASA's EONET natural-event feed. Normalises each event
 * to a single latest point, and (because wildfires dominate the feed by ~100x)
 * keeps every rarer event while sampling wildfires down, so volcanoes and storms
 * stay visible instead of being drowned out. Always responds 200.
 */

interface EonetGeometry {
  date: string;
  type: string;
  coordinates: number[] | number[][][];
}
interface EonetEvent {
  id: string;
  title: string;
  categories: { id: string; title: string }[];
  geometry: EonetGeometry[];
}
interface EonetResponse {
  events: EonetEvent[];
}

const MAX_TOTAL = 1500;
const MAX_WILDFIRES = 1100;

function centroid(ring: number[][]): [number, number] {
  let x = 0;
  let y = 0;
  for (const c of ring) {
    x += c[0];
    y += c[1];
  }
  return [x / ring.length, y / ring.length];
}

export async function GET() {
  try {
    const res = await fetch(
      "https://eonet.gsfc.nasa.gov/api/v3/events?status=open",
      { next: { revalidate: 300 } },
    );
    if (!res.ok) throw new Error(`EONET responded ${res.status}`);
    const data = (await res.json()) as EonetResponse;

    const normalised = [];
    for (const ev of data.events) {
      const geom = ev.geometry[ev.geometry.length - 1];
      if (!geom) continue;

      let lng: number;
      let lat: number;
      if (geom.type === "Point") {
        const c = geom.coordinates as number[];
        lng = c[0];
        lat = c[1];
      } else {
        const ring = (geom.coordinates as number[][][])[0];
        if (!ring || ring.length === 0) continue;
        [lng, lat] = centroid(ring);
      }
      if (typeof lat !== "number" || typeof lng !== "number") continue;

      const cat = ev.categories[0] ?? { id: "unknown", title: "Event" };
      normalised.push({
        id: ev.id,
        title: ev.title,
        cat: cat.id,
        catLabel: cat.title,
        lat,
        lng,
        date: geom.date,
      });
    }

    const wildfires = normalised.filter((e) => e.cat === "wildfires");
    const others = normalised.filter((e) => e.cat !== "wildfires");
    const step = Math.max(1, Math.floor(wildfires.length / MAX_WILDFIRES));
    const sampledWildfires =
      step > 1 ? wildfires.filter((_, i) => i % step === 0) : wildfires;
    const events = [...others, ...sampledWildfires].slice(0, MAX_TOTAL);

    return NextResponse.json(
      { total: normalised.length, events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { total: 0, events: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
