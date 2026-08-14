import { NextResponse } from "next/server";

/**
 * Upcoming rocket launches from Launch Library 2 (thespacedevs), keyless. The
 * anonymous API is rate limited (~15/hour), so we fetch a batch and cache hard.
 * Each launch is normalised to its pad coordinates plus the details we show.
 * Always responds 200 with a (possibly empty) list.
 */

interface LL2Launch {
  id: string;
  name?: string;
  net?: string;
  status?: { name?: string; abbrev?: string };
  launch_service_provider?: { name?: string };
  rocket?: { configuration?: { name?: string; full_name?: string } };
  mission?: { name?: string; description?: string; type?: string };
  pad?: {
    name?: string;
    latitude?: string | number;
    longitude?: string | number;
    location?: { name?: string };
  };
  image?: string | null;
  url?: string;
}

export async function GET() {
  try {
    const res = await fetch(
      "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=40&hide_recent_previous=true",
      { next: { revalidate: 7200 } },
    );
    if (!res.ok) throw new Error(`Launch Library responded ${res.status}`);
    const data = (await res.json()) as { results?: LL2Launch[] };

    const launches = [];
    for (const l of data.results ?? []) {
      const lat = Number(l.pad?.latitude);
      const lng = Number(l.pad?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      launches.push({
        id: l.id,
        name: l.name ?? "Launch",
        net: l.net ?? "",
        status: l.status?.abbrev ?? "",
        statusName: l.status?.name ?? "",
        provider: l.launch_service_provider?.name ?? "",
        rocket:
          l.rocket?.configuration?.name ??
          l.rocket?.configuration?.full_name ??
          "",
        pad: l.pad?.name ?? "",
        location: l.pad?.location?.name ?? "",
        lat,
        lng,
        mission: l.mission?.name ?? "",
        missionDesc: l.mission?.description ?? "",
        image: l.image ?? null,
        url: l.url ?? "",
      });
    }

    return NextResponse.json(
      { count: launches.length, launches },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=14400",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { count: 0, launches: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
