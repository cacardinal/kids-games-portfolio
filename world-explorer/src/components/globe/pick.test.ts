import { describe, it, expect } from "vitest";
import { pickCountryAt } from "./pick";

// Region hit-mapping: lon/lat → country, same resolution rules as the flat
// WorldMap explore mode (featured countries get canonical names, backdrop
// countries fall back to the topojson feature name, ocean picks nothing).

describe("pickCountryAt", () => {
  it("finds featured countries at interior points", () => {
    expect(pickCountryAt([-100, 40])?.iso3).toBe("USA");
    expect(pickCountryAt([2.35, 46.6])?.iso3).toBe("FRA");
    expect(pickCountryAt([134, -25])?.iso3).toBe("AUS");
    expect(pickCountryAt([-52, -10])?.iso3).toBe("BRA");
    expect(pickCountryAt([79, 22])?.iso3).toBe("IND");
  });

  it("uses the canonical featured-country name", () => {
    expect(pickCountryAt([-100, 40])?.name).toBe("United States");
  });

  it("returns backdrop countries with the topojson name and empty iso3", () => {
    const hit = pickCountryAt([-42, 72]); // Greenland — not in the featured 45
    expect(hit).not.toBeNull();
    expect(hit!.name).toBe("Greenland");
    expect(hit!.iso3).toBe("");
  });

  it("returns null over open ocean", () => {
    expect(pickCountryAt([-40, 30])).toBeNull(); // mid-Atlantic
    expect(pickCountryAt([-140, -40])).toBeNull(); // south Pacific
  });

  it("returns null at the poles' empty ocean", () => {
    expect(pickCountryAt([0, 88])).toBeNull(); // Arctic ocean
  });
});
