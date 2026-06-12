import { describe, it, expect } from "vitest";
import { MISSIONS } from "../data/missions";
import { compareWinner, metricValue, sharedScaleShapes, formatMetric } from "./compare";
import { COUNTRY_BY_ISO3 } from "../data/countries";

// REQUIRED SUITE #2 — Compare correctness. Derived winner matches stored values
// for every compare mission, AND every compare pair is ≥2.5x apart (GDD safety).
describe("compare correctness", () => {
  const compares = MISSIONS.filter((m) => m.type === "compare") as Extract<
    (typeof MISSIONS)[number],
    { type: "compare" }
  >[];

  it("there are 3 compare missions", () => {
    expect(compares.length).toBe(3);
  });

  it("derived winner is the country with the larger stored metric", () => {
    for (const m of compares) {
      const a = metricValue(m.aIso3, m.metric);
      const b = metricValue(m.bIso3, m.metric);
      const expected = a >= b ? m.aIso3 : m.bIso3;
      expect(compareWinner(m.aIso3, m.bIso3, m.metric), m.id).toBe(expected);
    }
  });

  it("known winners (from GDD §3.4) match", () => {
    const am6 = compares.find((m) => m.id === "am-6")!;
    expect(compareWinner(am6.aIso3, am6.bIso3, am6.metric)).toBe("CAN");
    const ef6 = compares.find((m) => m.id === "ef-6")!;
    expect(compareWinner(ef6.aIso3, ef6.bIso3, ef6.metric)).toBe("NGA");
    const ao6 = compares.find((m) => m.id === "ao-6")!;
    expect(compareWinner(ao6.aIso3, ao6.bIso3, ao6.metric)).toBe("IND");
  });

  it("every compare pair is at least 2.5x apart (fact-checker-proof margin)", () => {
    for (const m of compares) {
      const a = metricValue(m.aIso3, m.metric);
      const b = metricValue(m.bIso3, m.metric);
      const ratio = Math.max(a, b) / Math.min(a, b);
      expect(ratio, `${m.id} ratio ${ratio.toFixed(1)}x`).toBeGreaterThanOrEqual(2.5);
    }
  });

  it("compare pairs reference distinct countries", () => {
    for (const m of compares) {
      expect(m.aIso3).not.toBe(m.bIso3);
      expect(COUNTRY_BY_ISO3[m.aIso3]).toBeTruthy();
      expect(COUNTRY_BY_ISO3[m.bIso3]).toBeTruthy();
    }
  });
});

// Fix 1 — TRUE relative scale. Both compare silhouettes share ONE projection scale
// so on-screen size is geographically honest: the bigger country renders bigger.
describe("shared-scale compare silhouettes", () => {
  const BOX_W = 100;
  const BOX_H = 76;
  const PAD = 6;
  const ext = (s: { width: number; height: number }) => Math.max(s.width, s.height);

  it("Canada renders larger than Mexico, by roughly the sqrt of their area ratio", () => {
    const res = sharedScaleShapes("CAN", "MEX", BOX_W, BOX_H, PAD);
    const can = res.byIso3["CAN"];
    const mex = res.byIso3["MEX"];
    expect(can).toBeTruthy();
    expect(mex).toBeTruthy();

    // Neither floored → the cards show the genuine shared-scale relationship.
    expect(can.floored).toBe(false);
    expect(mex.floored).toBe(false);
    expect(res.notToScale).toBe(false);

    // Decisive: Canada's rendered extent must be clearly larger than Mexico's.
    const ratio = ext(can) / ext(mex);
    expect(ratio).toBeGreaterThan(1.5);

    // "Roughly the sqrt of the area ratio": linear size scales with √area. Canada
    // sits far north, so the shared Mercator legitimately amplifies it ABOVE the
    // equal-area expectation — never below it. Assert the rendered ratio is at
    // least ~√(area ratio) and stays within a sane Mercator band (never inverts).
    const areaRatio = COUNTRY_BY_ISO3["CAN"].areaKm2 / COUNTRY_BY_ISO3["MEX"].areaKm2;
    const sqrtAreaRatio = Math.sqrt(areaRatio); // ≈ 2.25
    expect(ratio).toBeGreaterThanOrEqual(sqrtAreaRatio * 0.9);
    expect(ratio).toBeLessThanOrEqual(sqrtAreaRatio * 3);
  });

  it("the larger country fills (near) the full box; the smaller stays smaller", () => {
    const res = sharedScaleShapes("CAN", "MEX", BOX_W, BOX_H, PAD);
    const can = res.byIso3["CAN"];
    const mex = res.byIso3["MEX"];
    // Canada (the larger) is fitted to the padded box on at least one axis.
    expect(ext(can)).toBeGreaterThan((BOX_H - 2 * PAD) * 0.9);
    // Mexico renders strictly smaller than Canada at the shared scale.
    expect(ext(mex)).toBeLessThan(ext(can));
  });

  it("scale sharing is symmetric in argument order", () => {
    const ab = sharedScaleShapes("CAN", "MEX", BOX_W, BOX_H, PAD);
    const ba = sharedScaleShapes("MEX", "CAN", BOX_W, BOX_H, PAD);
    expect(ext(ab.byIso3["CAN"])).toBeCloseTo(ext(ba.byIso3["CAN"]), 3);
    expect(ext(ab.byIso3["MEX"])).toBeCloseTo(ext(ba.byIso3["MEX"]), 3);
  });

  it("a tiny country against a giant is floored and flagged not-to-scale", () => {
    // Jamaica (~11k km²) vs Canada (~10M km²): without a floor Jamaica would be a
    // sub-pixel speck, so it is bumped to the minimum and the card notes it.
    const res = sharedScaleShapes("CAN", "JAM", BOX_W, BOX_H, PAD);
    expect(res.byIso3["JAM"].floored).toBe(true);
    expect(res.byIso3["CAN"].floored).toBe(false);
    expect(res.notToScale).toBe(true);
    // Even floored, Jamaica must not exceed Canada.
    expect(ext(res.byIso3["JAM"])).toBeLessThan(ext(res.byIso3["CAN"]));
  });
});

// Fix 2 — player-facing area strings use km² (not km2).
describe("area reveal copy uses km²", () => {
  it("formats areas with the superscript-2 unit and never the ASCII 'km2'", () => {
    const can = formatMetric("CAN", "areaKm2");
    const mex = formatMetric("MEX", "areaKm2");
    expect(can).toContain("km²");
    expect(can).not.toContain("km2");
    expect(mex).toContain("km²");
    expect(mex).not.toContain("km2");
  });
});
