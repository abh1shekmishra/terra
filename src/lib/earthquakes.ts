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

export const EARTH_RADIUS_KM = 6371;

/**
 * Approximate "felt radius" (radius of perceptibility, ~MMI III) at the surface,
 * in km. Perceptibility radius from the hypocentre scales as 10^(0.5·M), anchored
 * to USGS's rule that an M3 is felt to ~20 km; we then project to the surface
 * using the hypocentral depth (deep/small quakes are barely felt at the surface).
 * This is an approximation in the spirit of the Allen, Wald & Worden (2012) IPE,
 * not a precise ShakeMap.
 */
export function feltRadiusKm(mag: number, depthKm: number): number {
  const hypocentral = 20 * Math.pow(10, 0.5 * (mag - 3));
  const surface = Math.sqrt(Math.max(hypocentral * hypocentral - depthKm * depthKm, 0));
  return Math.min(surface, 1500); // cap the very largest events
}

/** Felt radius expressed in globe world units, for the 3D shockwave dome. */
export function feltRadiusWorld(mag: number, depthKm: number, globeRadius: number): number {
  return (feltRadiusKm(mag, depthKm) / EARTH_RADIUS_KM) * globeRadius;
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
