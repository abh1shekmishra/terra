import * as THREE from "three";
import { useQuery } from "@tanstack/react-query";

/** A single earthquake, normalised from the USGS GeoJSON feed. */
export interface Earthquake {
  id: string;
  mag: number;
  place: string;
  time: number; // epoch ms
  depth: number; // km below the surface
  lat: number;
  lng: number;
  url: string;
}

/** Past 24 hours, all magnitudes. Updated by USGS about once a minute. */
const USGS_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

interface UsgsFeature {
  id: string;
  properties: { mag: number | null; place: string | null; time: number; url: string };
  geometry: { coordinates: [number, number, number] } | null;
}
interface UsgsResponse {
  features: UsgsFeature[];
}

export async function fetchEarthquakes(): Promise<Earthquake[]> {
  const res = await fetch(USGS_FEED);
  if (!res.ok) throw new Error(`USGS feed responded ${res.status}`);
  const json = (await res.json()) as UsgsResponse;

  return json.features
    .filter((f) => f.geometry !== null && f.properties.mag !== null)
    .map((f) => ({
      id: f.id,
      mag: f.properties.mag as number,
      place: f.properties.place ?? "Unknown location",
      time: f.properties.time,
      depth: f.geometry!.coordinates[2],
      lng: f.geometry!.coordinates[0],
      lat: f.geometry!.coordinates[1],
      url: f.properties.url,
    }))
    .sort((a, b) => a.mag - b.mag); // draw larger quakes last, on top
}

/** Live earthquakes, refreshed every minute. Shared across every consumer. */
export function useEarthquakes() {
  return useQuery({
    queryKey: ["earthquakes"],
    queryFn: fetchEarthquakes,
    refetchInterval: 60_000,
  });
}

/** Colour ramp: green (small) → yellow → orange → red (large). */
export function magnitudeColor(mag: number): THREE.Color {
  const m = Math.max(0, Math.min(7, mag));
  const hue = 0.33 * (1 - m / 7); // 0.33 green → 0.0 red
  return new THREE.Color().setHSL(hue, 0.9, 0.55);
}

/** Marker radius in world units, scaled by magnitude. */
export function magnitudeSize(mag: number): number {
  return 0.014 + Math.max(0.5, mag) * 0.006;
}

/** Compact "3m ago" / "5h ago" from an epoch timestamp. */
export function timeAgo(time: number, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - time) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
