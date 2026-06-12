// Headless physics suites (REQUIRED by specs/inventor-lab.md §"Required tests").
// Runs the SAME sim module the browser uses, under the fixed-timestep contract, in plain Node.
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../data/levels";
import { runLevel, MAX_STEPS } from "../sim";
import { placementsCost } from "../types";

describe("Level integrity", () => {
  it("has exactly 12 levels with ids 1..12", () => {
    expect(LEVELS).toHaveLength(12);
    expect(LEVELS.map((l) => l.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
  it("each level has exactly one hero actor", () => {
    for (const l of LEVELS) {
      expect(l.actors.filter((a) => a.hero)).toHaveLength(1);
    }
  });
  it("each knownSolution uses only allowed parts and stays within budget", () => {
    for (const l of LEVELS) {
      for (const p of l.knownSolution) expect(l.allowedParts).toContain(p.part);
      expect(placementsCost(l.knownSolution)).toBeLessThanOrEqual(l.budget);
    }
  });
});

describe("Required test 1 — knownSolution succeeds by step <=1000 (margin rule)", () => {
  for (const level of LEVELS) {
    it(`L${level.id} ${level.title}`, () => {
      const r = runLevel(level, level.knownSolution);
      expect(r.success).toBe(true);
      expect(r.successStep).not.toBeNull();
      expect(r.successStep!).toBeLessThanOrEqual(1000);
    });
  }
});

describe("Required test 2 — empty build fails for every level", () => {
  for (const level of LEVELS) {
    it(`L${level.id} ${level.title} empty fails`, () => {
      const r = runLevel(level, []);
      expect(r.success).toBe(false);
    });
  }
});

describe("Required test 3 — knownSolution minus any single part fails (no decorative parts)", () => {
  for (const level of LEVELS) {
    it(`L${level.id} ${level.title} every part is load-bearing`, () => {
      level.knownSolution.forEach((_, i) => {
        const minus = level.knownSolution.filter((_, j) => j !== i);
        const r = runLevel(level, minus);
        expect(r.success, `L${level.id} should FAIL without part #${i + 1}`).toBe(false);
      });
    });
  }
});

describe("Required test 4 — determinism (double-run identical success step)", () => {
  it("L1 knownSolution yields the identical success step twice", () => {
    const a = runLevel(LEVELS[0], LEVELS[0].knownSolution);
    const b = runLevel(LEVELS[0], LEVELS[0].knownSolution);
    expect(a.successStep).toBe(b.successStep);
    expect(a.heroEnd.x).toBe(b.heroEnd.x);
    expect(a.heroEnd.y).toBe(b.heroEnd.y);
  });
  it("every level is deterministic across two runs", () => {
    for (const level of LEVELS) {
      const a = runLevel(level, level.knownSolution);
      const b = runLevel(level, level.knownSolution);
      expect(a.successStep, `L${level.id} successStep`).toBe(b.successStep);
      expect(a.heroEnd.x).toBe(b.heroEnd.x);
      expect(a.heroEnd.y).toBe(b.heroEnd.y);
    }
  });
});

describe("Success has margin — hero settles inside the goal, not grazing an edge", () => {
  for (const level of LEVELS) {
    it(`L${level.id} hero settles with clearance`, () => {
      const r = runLevel(level, level.knownSolution);
      // Hero center should be at least ~15px inside the goal rect on x (clearance target ≥25px ideal).
      expect(r.heroEnd.x).toBeGreaterThan(level.goal.x + 12);
      expect(r.heroEnd.x).toBeLessThan(level.goal.x + level.goal.w - 12);
    });
  }
});

describe("Step budget is respected (no level needs the full 1200)", () => {
  it("MAX_STEPS is 1200", () => {
    expect(MAX_STEPS).toBe(1200);
  });
});
