import { NextResponse } from "next/server";

/**
 * On-demand enrichment for a single selected flight. Combines three free,
 * keyless sources:
 *   - adsbdb (callsign)  -> airline + origin/destination airports (with coords)
 *   - adsbdb (mode-s hex)-> aircraft type, registration, owner
 *   - planespotters (hex)-> a real photo of that exact airframe
 * Any source may be missing (private/military/unlisted flights), so every field
 * is optional and we always respond 200. Results are static per callsign/hex,
 * so we cache hard.
 */

interface AdsbAirport {
  name?: string;
  municipality?: string;
  iata_code?: string;
  icao_code?: string;
  country_name?: string;
  latitude?: number;
  longitude?: number;
}

interface Airport {
  name: string;
  city: string;
  iata: string;
  icao: string;
  country: string;
  lat: number;
  lng: number;
}

function normAirport(a: AdsbAirport | undefined): Airport | null {
  if (!a || typeof a.latitude !== "number" || typeof a.longitude !== "number") {
    return null;
  }
  return {
    name: a.name ?? "",
    city: a.municipality ?? "",
    iata: a.iata_code ?? "",
    icao: a.icao_code ?? "",
    country: a.country_name ?? "",
    lat: a.latitude,
    lng: a.longitude,
  };
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cs = (searchParams.get("cs") ?? "").trim().toUpperCase();
  const hex = (searchParams.get("hex") ?? "").trim().toLowerCase();

  const [routeRes, aircraftRes, photoRes] = await Promise.all([
    cs && cs !== "UNKNOWN"
      ? getJson(`https://api.adsbdb.com/v0/callsign/${encodeURIComponent(cs)}`)
      : null,
    hex ? getJson(`https://api.adsbdb.com/v0/aircraft/${encodeURIComponent(hex)}`) : null,
    hex
      ? getJson(`https://api.planespotters.net/pub/photos/hex/${encodeURIComponent(hex)}`)
      : null,
  ]);

  // adsbdb route
  const fr = (routeRes as { response?: { flightroute?: Record<string, unknown> } })
    ?.response?.flightroute;
  const airlineRaw = fr?.airline as Record<string, string> | undefined;
  const airline = airlineRaw
    ? {
        name: airlineRaw.name ?? "",
        iata: airlineRaw.iata ?? "",
        icao: airlineRaw.icao ?? "",
        radio: airlineRaw.callsign ?? "", // e.g. "SPEEDBIRD"
      }
    : null;

  // adsbdb aircraft
  const ac = (aircraftRes as { response?: { aircraft?: Record<string, string> } })
    ?.response?.aircraft;
  const aircraft = ac
    ? {
        type: ac.type ?? "",
        icaoType: ac.icao_type ?? "",
        manufacturer: ac.manufacturer ?? "",
        registration: ac.registration ?? "",
        owner: ac.registered_owner ?? "",
      }
    : null;

  // planespotters photo (fall back to adsbdb's own photo field)
  const photos = (photoRes as { photos?: Array<Record<string, unknown>> })?.photos;
  let photo: { thumbnail: string; link: string; credit: string } | null = null;
  if (photos && photos.length > 0) {
    const p = photos[0];
    const thumb = (p.thumbnail_large ?? p.thumbnail) as { src?: string } | undefined;
    if (thumb?.src) {
      photo = {
        thumbnail: thumb.src,
        link: typeof p.link === "string" ? p.link : "",
        credit: typeof p.photographer === "string" ? p.photographer : "",
      };
    }
  }
  if (!photo && ac?.url_photo_thumbnail) {
    photo = { thumbnail: ac.url_photo_thumbnail, link: ac.url_photo ?? "", credit: "" };
  }

  return NextResponse.json(
    {
      airline,
      flightIata: (fr?.callsign_iata as string) ?? null,
      flightIcao: (fr?.callsign_icao as string) ?? null,
      origin: normAirport(fr?.origin as AdsbAirport | undefined),
      destination: normAirport(fr?.destination as AdsbAirport | undefined),
      aircraft,
      photo,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
      },
    },
  );
}
