import { NextResponse } from "next/server";

/**
 * Server-side proxy for CelesTrak orbital elements (TLE). Fetches a handful of
 * interesting groups, samples the enormous Starlink group down, and returns the
 * raw two-line elements so the client can propagate positions with SGP4. TLEs
 * change slowly, so this is cached for an hour. Always responds 200.
 */

const GROUPS = ["stations", "visual", "weather", "science", "gps-ops"] as const;
const STARLINK_SAMPLE = 500;

interface Sat {
  name: string;
  l1: string;
  l2: string;
  group: string;
}

function parseTle(text: string, group: string): Sat[] {
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const out: Sat[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const name = lines[i].trim();
    const l1 = lines[i + 1];
    const l2 = lines[i + 2];
    if (l1?.startsWith("1 ") && l2?.startsWith("2 ")) {
      out.push({ name, l1, l2, group });
    }
  }
  return out;
}

async function fetchGroup(group: string): Promise<Sat[]> {
  const res = await fetch(
    `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`,
    { cache: "no-store" },
  );
  if (!res.ok) return [];
  return parseTle(await res.text(), group);
}

export async function GET() {
  try {
    const [groups, starlink] = await Promise.all([
      Promise.all(GROUPS.map(fetchGroup)),
      fetchGroup("starlink"),
    ]);
    let sats = groups.flat();

    const step = Math.max(1, Math.floor(starlink.length / STARLINK_SAMPLE));
    sats = sats.concat(starlink.filter((_, i) => i % step === 0));

    return NextResponse.json(
      { count: sats.length, satellites: sats },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { count: 0, satellites: [], error: (error as Error).message },
      { status: 200 },
    );
  }
}
