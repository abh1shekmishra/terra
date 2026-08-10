import * as THREE from "three";

/**
 * Convert latitude/longitude (in degrees) to a 3D point on the surface of a
 * sphere of the given radius. This is the core mapping that lets any
 * geographic data point (an earthquake, an airport, a wildfire) be placed
 * correctly on the globe.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number,
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from the north pole
  const theta = (lng + 180) * (Math.PI / 180); // azimuthal angle
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Evenly distribute `count` points across the surface of a sphere using the
 * Fibonacci lattice. Used to build the stylised "dot globe" surface.
 */
export function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 down to -1
    const r = Math.sqrt(1 - y * y); // radius of the ring at this height
    const t = goldenAngle * i;
    const x = Math.cos(t) * r;
    const z = Math.sin(t) * r;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
}
