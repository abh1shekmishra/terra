import { NextResponse } from "next/server";

/**
 * On-demand proxy for a single satellite's CelesTrak catalogue (SATCAT) record,
 * normalised into readable fields (owner, launch site, type, status). Cached a
 * day. Always responds 200 (null when unavailable).
 */

const OWNER: Record<string, string> = {
  US: "United States", PRC: "China", CIS: "Russia", ESA: "ESA (Europe)",
  ESRO: "ESA (Europe)", FR: "France", UK: "United Kingdom", JPN: "Japan",
  IND: "India", ISS: "ISS (International)", CA: "Canada", GER: "Germany",
  IT: "Italy", SPN: "Spain", LUXE: "Luxembourg", NZ: "New Zealand",
  ISRA: "Israel", IRAN: "Iran", NKOR: "North Korea", UAE: "UAE",
  AUS: "Australia", BRAZ: "Brazil", TURK: "Turkey", THAI: "Thailand",
  SAFR: "South Africa", SING: "Singapore", SKOR: "South Korea",
  ITSO: "Intelsat", SES: "SES", GLOB: "Globalstar", ORB: "Orbcomm",
  EUME: "EUMETSAT", EUTE: "Eutelsat", INMA: "Inmarsat", NATO: "NATO",
  O3B: "O3b / SES", AB: "Arabsat", ARGN: "Argentina", EGYP: "Egypt",
};

const SITE: Record<string, string> = {
  AFETR: "Cape Canaveral, USA", AFWTR: "Vandenberg, USA",
  KSCUT: "Kennedy Space Center, USA", KSC: "Kennedy Space Center, USA",
  TYMSC: "Baikonur, Kazakhstan", PKMTR: "Plesetsk, Russia",
  VOSTO: "Vostochny, Russia", GIK: "Jiuquan, China", JSC: "Jiuquan, China",
  XSC: "Xichang, China", TSC: "Taiyuan, China", WSC: "Wenchang, China",
  FRGUI: "Kourou, French Guiana", TANSC: "Tanegashima, Japan",
  KASC: "Kagoshima, Japan", SRILR: "Sriharikota, India",
  RLLC: "Māhia, New Zealand", NSC: "Naro, South Korea",
  YAVNE: "Palmachim, Israel", SEMLS: "Semnan, Iran", KWAJ: "Kwajalein",
  WLPIS: "Wallops, USA", ERAS: "Kodiak, USA", SEAL: "Sea Launch",
};

const TYPE: Record<string, string> = {
  PAY: "Payload", "R/B": "Rocket body", DEB: "Debris", UNK: "Unknown",
};

const STATUS: Record<string, string> = {
  "+": "Operational", "-": "Non-operational", P: "Partially operational",
  B: "Backup / standby", S: "Spare", X: "Extended mission", D: "Decayed",
  "?": "Unknown",
};

interface Raw {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  OBJECT_TYPE: string;
  OPS_STATUS_CODE: string;
  OWNER: string;
  LAUNCH_DATE: string;
  LAUNCH_SITE: string;
  APOGEE: number;
  PERIGEE: number;
}

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) return NextResponse.json(null);
  try {
    const res = await fetch(
      `https://celestrak.org/satcat/records.php?CATNR=${id}&FORMAT=json`,
      { next: { revalidate: 86_400 } },
    );
    if (!res.ok) throw new Error(`SATCAT responded ${res.status}`);
    const rows = (await res.json()) as Raw[];
    const r = rows[0];
    if (!r) return NextResponse.json(null);

    return NextResponse.json(
      {
        name: r.OBJECT_NAME,
        designator: r.OBJECT_ID,
        type: TYPE[r.OBJECT_TYPE] ?? r.OBJECT_TYPE,
        status: STATUS[r.OPS_STATUS_CODE] ?? "",
        owner: OWNER[r.OWNER] ?? r.OWNER,
        launchDate: r.LAUNCH_DATE ?? "",
        launchSite: SITE[r.LAUNCH_SITE] ?? r.LAUNCH_SITE ?? "",
        apogee: r.APOGEE ?? 0,
        perigee: r.PERIGEE ?? 0,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=172800",
        },
      },
    );
  } catch {
    return NextResponse.json(null);
  }
}
