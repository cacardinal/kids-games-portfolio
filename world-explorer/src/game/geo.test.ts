import { describe, it, expect } from "vitest";
import { centroidOf, distanceBetween, classifyHeat, isWarmHalf, isSmallTarget } from "./geo";

// REQUIRED SUITE #4 — geo.ts centroid/distance sanity.
describe("geo helpers", () => {
  it("centroids land in a plausible lon/lat range", () => {
    const [lon, lat] = centroidOf("FRA");
    expect(lon).toBeGreaterThan(-10);
    expect(lon).toBeLessThan(20);
    expect(lat).toBeGreaterThan(35);
    expect(lat).toBeLessThan(55);
  });

  it("France is nearer Germany than Australia", () => {
    expect(distanceBetween("FRA", "DEU")).toBeLessThan(distanceBetween("FRA", "AUS"));
  });

  it("Peru is nearer Brazil than Japan", () => {
    expect(distanceBetween("PER", "BRA")).toBeLessThan(distanceBetween("PER", "JPN"));
  });

  it("distance is symmetric and zero to self", () => {
    expect(distanceBetween("USA", "CAN")).toBeCloseTo(distanceBetween("CAN", "USA"), 6);
    expect(distanceBetween("JPN", "JPN")).toBeCloseTo(0, 6);
  });

  it("the farthest pairs are genuinely far (> 2 radians across the globe)", () => {
    // Argentina ↔ Japan are nearly antipodal.
    expect(distanceBetween("ARG", "JPN")).toBeGreaterThan(2);
  });
});

// REQUIRED SUITE #5 — Warmer/colder classifier is monotonic with distance.
describe("warmer/colder classifier", () => {
  it("a correct tap is 'correct'", () => {
    expect(classifyHeat("ECU", "ECU")).toBe("correct");
  });

  it("vs a fixed prior, a closer tap never reads colder than a farther tap", () => {
    // answer ECU, prior a far country (AUS). Test a sweep of taps ordered by distance.
    const answer = "ECU";
    const prior = "AUS";
    const candidates = ["PER", "COL", "BRA", "MEX", "USA", "FRA", "EGY", "CHN", "JPN"];
    const withDist = candidates
      .filter((c) => c !== answer)
      .map((c) => ({ c, d: distanceBetween(c, answer) }))
      .sort((a, b) => a.d - b.d);

    // Map each verdict to a "warmth rank": warmer/still-warm/close = high, colder = low.
    const rank = (iso: string): number => {
      const s = classifyHeat(iso, answer, prior);
      if (s === "warmer") return 2;
      if (s === "still-warm") return 1;
      if (s === "still-cold") return -1;
      if (s === "colder") return -2;
      return 0;
    };
    // As distance increases, warmth rank must be non-increasing (monotonic).
    for (let i = 1; i < withDist.length; i++) {
      expect(
        rank(withDist[i].c),
        `${withDist[i].c} (farther) should not be warmer than ${withDist[i - 1].c}`,
      ).toBeLessThanOrEqual(rank(withDist[i - 1].c));
    }
  });

  it("first wrong tap uses absolute bands (close < mid < far by distance)", () => {
    const answer = "BRA";
    // A neighbor, a mid, and a far country with no prior.
    const close = classifyHeat("PER", answer);
    const far = classifyHeat("JPN", answer);
    const closeD = distanceBetween("PER", answer);
    const farD = distanceBetween("JPN", answer);
    expect(closeD).toBeLessThan(farD);
    // The closer one must be classified at least as warm as the farther one.
    const band = (s: string) => (s === "first-close" ? 2 : s === "first-mid" ? 1 : 0);
    expect(band(close)).toBeGreaterThanOrEqual(band(far));
  });

  it("moving strictly toward the answer reads 'warmer'", () => {
    // answer RUS; prior far (NZL), tap a near neighbor (CHN).
    expect(classifyHeat("CHN", "RUS", "NZL")).toBe("warmer");
  });

  it("moving strictly away reads 'colder'", () => {
    // answer RUS; prior near (CHN), tap far (BRA).
    expect(classifyHeat("BRA", "RUS", "CHN")).toBe("colder");
  });

  it("isWarmHalf agrees with warm verdicts", () => {
    expect(isWarmHalf("warmer")).toBe(true);
    expect(isWarmHalf("colder")).toBe(false);
  });
});

// Small-target zoom rule — larger<44px OR minor<24px (Fix 4).
describe("small-target zoom rule", () => {
  it("a comfortably large country is NOT a small target", () => {
    // e.g. Brazil-sized in a region view: both dimensions well above thresholds.
    expect(isSmallTarget(126, 109)).toBe(false);
  });

  it("a genuinely tiny country (both dims small) IS a small target", () => {
    // larger dimension below 44px — the original rule already caught this.
    expect(isSmallTarget(13, 12)).toBe(true);
  });

  it("a CHL-like thin sliver (huge height, ~8px width) IS a small target", () => {
    // Chile: very tall but a narrow ribbon. The larger dimension (height) clears
    // 44px, so the old larger<44 rule MISSED it; the minor<24 clause catches it.
    const tallHeight = 240; // px — far above the 44px larger-dim floor
    const sliverWidth = 8; // px — the failing minor dimension
    expect(Math.max(tallHeight, sliverWidth)).toBeGreaterThanOrEqual(44); // old rule: false
    expect(isSmallTarget(sliverWidth, tallHeight)).toBe(true); // new rule: true
  });

  it("a target sitting right at the minor floor (24px) is NOT small", () => {
    expect(isSmallTarget(24, 200)).toBe(false);
    expect(isSmallTarget(23.9, 200)).toBe(true);
  });
});
