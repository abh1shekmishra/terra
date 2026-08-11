import { describe, it, expect } from "vitest";
import { categoryColor } from "@/lib/events";

describe("categoryColor", () => {
  it("maps known EONET categories to their colours", () => {
    expect(categoryColor("wildfires")).toBe("#f97316");
    expect(categoryColor("volcanoes")).toBe("#ef4444");
    expect(categoryColor("severeStorms")).toBe("#38bdf8");
  });

  it("falls back to a neutral colour for unknown categories", () => {
    expect(categoryColor("something-new")).toBe("#e5e7eb");
  });
});
