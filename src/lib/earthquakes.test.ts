import { describe, it, expect } from "vitest";
import { feltRadiusKm, magnitudeColor, timeAgo } from "@/lib/earthquakes";

describe("feltRadiusKm", () => {
  it("anchors a surface M3 to ~20 km (USGS reference)", () => {
    expect(feltRadiusKm(3, 0)).toBeCloseTo(20, 5);
  });

  it("grows with magnitude", () => {
    expect(feltRadiusKm(5, 0)).toBeGreaterThan(feltRadiusKm(4, 0));
    expect(feltRadiusKm(4, 0)).toBeGreaterThan(feltRadiusKm(3, 0));
    expect(feltRadiusKm(5, 0)).toBeCloseTo(200, 3);
  });

  it("shrinks the surface radius as depth increases", () => {
    expect(feltRadiusKm(3, 10)).toBeLessThan(feltRadiusKm(3, 0));
    expect(feltRadiusKm(3, 10)).toBeCloseTo(Math.sqrt(400 - 100), 3);
  });

  it("returns 0 when the quake is too deep to be felt at the surface", () => {
    expect(feltRadiusKm(3, 30)).toBe(0);
  });

  it("caps the very largest events", () => {
    expect(feltRadiusKm(9, 0)).toBe(1500);
  });
});

describe("magnitudeColor", () => {
  it("shifts from green (low) toward red (high)", () => {
    const low = magnitudeColor(1);
    const high = magnitudeColor(6);
    expect(high.r).toBeGreaterThan(low.r);
    expect(low.g).toBeGreaterThan(high.g);
  });

  it("returns a valid 6-digit hex string", () => {
    expect(magnitudeColor(4).getHexString()).toMatch(/^[0-9a-f]{6}$/);
  });
});

describe("timeAgo", () => {
  const now = 1_000_000_000_000;
  it("formats seconds, minutes, hours and days", () => {
    expect(timeAgo(now - 5_000, now)).toBe("5s ago");
    expect(timeAgo(now - 120_000, now)).toBe("2m ago");
    expect(timeAgo(now - 7_200_000, now)).toBe("2h ago");
    expect(timeAgo(now - 2 * 86_400_000, now)).toBe("2d ago");
  });
});
