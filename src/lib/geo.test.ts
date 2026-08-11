import { describe, it, expect } from "vitest";
import { latLngToVector3, fibonacciSphere } from "@/lib/geo";

describe("latLngToVector3", () => {
  it("maps the north pole to +Y", () => {
    const v = latLngToVector3(90, 0, 1);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(1, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("maps the south pole to -Y regardless of longitude", () => {
    const v = latLngToVector3(-90, 123, 1);
    expect(v.y).toBeCloseTo(-1, 5);
  });

  it("places (0,0) on the +X axis", () => {
    const v = latLngToVector3(0, 0, 1);
    expect(v.x).toBeCloseTo(1, 5);
    expect(v.y).toBeCloseTo(0, 5);
    expect(v.z).toBeCloseTo(0, 5);
  });

  it("preserves the radius for any coordinate", () => {
    const cases: [number, number][] = [
      [0, 0],
      [35, -120],
      [-45, 80],
      [12, 170],
      [-33, -70],
    ];
    for (const [lat, lng] of cases) {
      expect(latLngToVector3(lat, lng, 2).length()).toBeCloseTo(2, 5);
    }
  });
});

describe("fibonacciSphere", () => {
  it("returns the requested number of points, all on the sphere", () => {
    const points = fibonacciSphere(500, 3);
    expect(points).toHaveLength(500);
    for (const p of points) {
      expect(p.length()).toBeCloseTo(3, 4);
    }
  });
});
