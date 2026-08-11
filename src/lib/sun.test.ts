import { describe, it, expect } from "vitest";
import { getSubsolarPoint, getSunDirection } from "@/lib/sun";

describe("getSubsolarPoint", () => {
  it("puts the sun over the prime meridian at 12:00 UTC", () => {
    const p = getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
    expect(p.lng).toBeCloseTo(0, 5);
  });

  it("moves the subsolar longitude 15 degrees west per hour", () => {
    const p = getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 6, 0, 0)));
    expect(p.lng).toBeCloseTo(90, 5);
  });

  it("tracks solar declination across the seasons", () => {
    const june = getSubsolarPoint(new Date(Date.UTC(2026, 5, 21, 12)));
    const december = getSubsolarPoint(new Date(Date.UTC(2026, 11, 21, 12)));
    expect(june.lat).toBeGreaterThan(20); // northern summer
    expect(december.lat).toBeLessThan(-20); // southern summer
  });
});

describe("getSunDirection", () => {
  it("returns a unit vector", () => {
    const v = getSunDirection(new Date(Date.UTC(2026, 7, 11, 9, 30)));
    expect(v.length()).toBeCloseTo(1, 5);
  });
});
