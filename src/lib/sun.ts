import * as THREE from "three";
import { latLngToVector3 } from "./geo";

/**
 * The subsolar point: the latitude/longitude on Earth where the sun is directly
 * overhead right now. Longitude tracks UTC (solar noon is at 0° at 12:00 UTC and
 * moves 15° west per hour); latitude is the sun's declination for the date.
 */
export function getSubsolarPoint(date: Date): { lat: number; lng: number } {
  const utcHours =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;

  let lng = (12 - utcHours) * 15;
  lng = ((((lng + 180) % 360) + 360) % 360) - 180; // normalise to [-180, 180]

  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000);
  const declination =
    -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  return { lat: declination, lng };
}

/**
 * Unit vector from Earth's centre toward the sun, in the same coordinate frame
 * the globe's geometry and all data markers use — so the day/night terminator
 * matches reality for every real-world location.
 */
export function getSunDirection(
  date: Date,
  target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 {
  const { lat, lng } = getSubsolarPoint(date);
  return target.copy(latLngToVector3(lat, lng, 1)).normalize();
}
