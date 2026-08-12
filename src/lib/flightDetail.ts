import { useQuery } from "@tanstack/react-query";

export interface FlightAirport {
  name: string;
  city: string;
  iata: string;
  icao: string;
  country: string;
  lat: number;
  lng: number;
}

export interface FlightDetail {
  airline: { name: string; iata: string; icao: string; radio: string } | null;
  flightIata: string | null;
  flightIcao: string | null;
  origin: FlightAirport | null;
  destination: FlightAirport | null;
  aircraft: {
    type: string;
    icaoType: string;
    manufacturer: string;
    registration: string;
    owner: string;
  } | null;
  photo: { thumbnail: string; link: string; credit: string } | null;
}

/**
 * Does the live position plausibly lie on the scheduled origin→destination route?
 * adsbdb returns the *scheduled* route for a callsign, which often doesn't match
 * the live aircraft (callsign reuse, return legs, repositioning, stale data). We
 * accept the route only if the aircraft is near the great circle (small
 * cross-track distance) and between the endpoints — otherwise the drawn arc would
 * be disconnected from the plane.
 */
export function isPositionOnRoute(
  origin: FlightAirport,
  destination: FlightAirport,
  lat: number,
  lng: number,
  maxCrossKm = 500,
): boolean {
  const R = 6371;
  const rad = Math.PI / 180;
  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  const φ1 = origin.lat * rad,
    λ1 = origin.lng * rad;
  const φ2 = destination.lat * rad,
    λ2 = destination.lng * rad;
  const φ3 = lat * rad,
    λ3 = lng * rad;

  const ang = (φa: number, λa: number, φb: number, λb: number) => {
    const dφ = φb - φa;
    const dλ = λb - λa;
    const a =
      Math.sin(dφ / 2) ** 2 +
      Math.cos(φa) * Math.cos(φb) * Math.sin(dλ / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  const bearing = (φa: number, λa: number, φb: number, λb: number) => {
    const y = Math.sin(λb - λa) * Math.cos(φb);
    const x =
      Math.cos(φa) * Math.sin(φb) -
      Math.sin(φa) * Math.cos(φb) * Math.cos(λb - λa);
    return Math.atan2(y, x);
  };

  const δ12 = ang(φ1, λ1, φ2, λ2);
  if (δ12 < 1e-6) return true;
  const δ13 = ang(φ1, λ1, φ3, λ3);
  const θ13 = bearing(φ1, λ1, φ3, λ3);
  const θ12 = bearing(φ1, λ1, φ2, λ2);

  const xt = Math.asin(clamp(Math.sin(δ13) * Math.sin(θ13 - θ12)));
  const crossKm = Math.abs(xt) * R;
  const along = Math.acos(clamp(Math.cos(δ13) / Math.cos(xt)));
  const progress = along / δ12;
  const behindOrigin = Math.cos(θ13 - θ12) < 0; // aircraft points away from dest

  return crossKm <= maxCrossKm && !behindOrigin && progress <= 1.2;
}

/** Enriched airline / route / aircraft / photo for one selected flight. */
export function useFlightDetail(callsign: string, hex: string, enabled = true) {
  const cs = callsign.trim();
  return useQuery({
    queryKey: ["flight-detail", cs, hex],
    queryFn: async (): Promise<FlightDetail> => {
      const res = await fetch(
        `/api/flight-detail?cs=${encodeURIComponent(cs)}&hex=${encodeURIComponent(hex)}`,
      );
      if (!res.ok) throw new Error(`flight detail failed (${res.status})`);
      return res.json();
    },
    enabled: enabled && (cs.length > 0 || hex.length > 0) && cs !== "unknown",
    staleTime: 60 * 60 * 1000, // static per flight; cache for the session
  });
}

export interface FlightTrackPoint {
  lat: number;
  lng: number;
  alt: number; // metres (barometric)
}

/**
 * The aircraft's real flown path (OpenSky tracks). This is the ground truth —
 * where the plane actually went — so it always matches the live position, unlike
 * a scheduled route. Refetches periodically since the track extends as it flies.
 */
export function useFlightTrack(hex: string, enabled = true) {
  const h = hex.trim();
  return useQuery({
    queryKey: ["flight-track", h],
    queryFn: async (): Promise<{ path: FlightTrackPoint[] }> => {
      const res = await fetch(`/api/flight-track?hex=${encodeURIComponent(h)}`);
      if (!res.ok) throw new Error(`flight track failed (${res.status})`);
      return res.json();
    },
    enabled: enabled && h.length > 0,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
