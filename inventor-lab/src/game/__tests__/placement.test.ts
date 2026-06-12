// Unit tests for placement validity, budget arithmetic, and star evaluation.
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../data/levels";
import { checkPlacement, remainingBudget, canAfford, evaluateStars, partFootprint, overlapFraction, MAX_OVERLAP_FRACTION } from "../placement";
import { placementsCost, PART_COST } from "../types";
import type { Placement } from "../types";

const L1 = LEVELS[0]; // budget 30, goal {540,470,280,110}, ball at (320,462)

describe("budget arithmetic", () => {
  it("placementsCost sums fixed part costs", () => {
    expect(placementsCost([])).toBe(0);
    expect(placementsCost([{ part: "plank", x: 0, y: 0, angleDeg: 0 }])).toBe(10);
    expect(
      placementsCost([
        { part: "ramp", x: 0, y: 0, angleDeg: 0 },
        { part: "column", x: 0, y: 0, angleDeg: 0 },
      ]),
    ).toBe(PART_COST.ramp + PART_COST.column);
  });
  it("remainingBudget decreases by placed cost", () => {
    expect(remainingBudget(L1, [])).toBe(30);
    expect(remainingBudget(L1, [{ part: "plank", x: 200, y: 300, angleDeg: 0 }])).toBe(20);
  });
  it("canAfford respects remaining budget", () => {
    const placed: Placement[] = [
      { part: "plank", x: 200, y: 300, angleDeg: 0 },
      { part: "plank", x: 200, y: 320, angleDeg: 0 },
    ]; // 20 spent, 10 left
    expect(canAfford(L1, placed, "plank")).toBe(true); // 10 left, plank costs 10
    expect(canAfford(L1, [...placed, { part: "plank", x: 0, y: 0, angleDeg: 0 }], "plank")).toBe(false); // 0 left
  });
});

describe("placement validity", () => {
  it("a valid open-space placement is ok", () => {
    const r = checkPlacement(L1, { part: "plank", x: 470, y: 520, angleDeg: 0 }, []);
    expect(r.ok).toBe(true);
  });
  it("intersecting the goal rect is forbidden", () => {
    // Goal is {540,470,280,110}; a plank centered inside it overlaps.
    const r = checkPlacement(L1, { part: "plank", x: 650, y: 500, angleDeg: 0 }, []);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("goal");
  });
  it("placing within 50px of an actor spawn is forbidden", () => {
    // Ball spawns at (320,462); a plank centered right on it is too close.
    const r = checkPlacement(L1, { part: "plank", x: 320, y: 462, angleDeg: 0 }, []);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("actor");
  });
  it("placing outside the world bounds is forbidden", () => {
    const r = checkPlacement(L1, { part: "plank", x: 10, y: 360, angleDeg: 0 }, []); // left edge < 0
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("bounds");
  });
  it("placing beyond budget is forbidden", () => {
    // Fill the budget (3 planks = 30), then a 4th is unaffordable.
    const placed: Placement[] = [
      { part: "plank", x: 200, y: 200, angleDeg: 0 },
      { part: "plank", x: 200, y: 240, angleDeg: 0 },
      { part: "plank", x: 200, y: 280, angleDeg: 0 },
    ];
    const r = checkPlacement(L1, { part: "plank", x: 470, y: 520, angleDeg: 0 }, placed);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("budget");
  });
});

describe("part footprints", () => {
  it("match the spec roster sizes", () => {
    expect(partFootprint("plank")).toEqual({ w: 120, h: 16 });
    expect(partFootprint("ramp")).toEqual({ w: 120, h: 80 });
    expect(partFootprint("bouncer")).toEqual({ w: 80, h: 16 });
    expect(partFootprint("crate")).toEqual({ w: 40, h: 40 });
    expect(partFootprint("column")).toEqual({ w: 24, h: 120 });
  });
});

describe("star evaluation", () => {
  it("unsolved earns zero stars", () => {
    const s = evaluateStars(L1, L1.knownSolution, false);
    expect(s.count).toBe(0);
  });
  it("solved with the par build earns all three", () => {
    const s = evaluateStars(L1, L1.knownSolution, true); // 1 plank, cost 10, par {1,10}
    expect(s.solved).toBe(true);
    expect(s.underParParts).toBe(true);
    expect(s.underParCost).toBe(true);
    expect(s.count).toBe(3);
  });
  it("over-built solve earns only the solved star", () => {
    const over: Placement[] = [
      ...L1.knownSolution,
      { part: "plank", x: 200, y: 300, angleDeg: 0 },
      { part: "plank", x: 200, y: 320, angleDeg: 0 },
    ]; // 3 planks, cost 30 > par.parts 1 and par.cost 10
    const s = evaluateStars(L1, over, true);
    expect(s.solved).toBe(true);
    expect(s.underParParts).toBe(false);
    expect(s.underParCost).toBe(false);
    expect(s.count).toBe(1);
  });
});

// FIX 2 — overlap guard: a part substantially overlapping an existing placed part is rejected.
describe("placement overlap guard (FIX 2)", () => {
  it("overlapFraction is 1.0 for identical rects and 0 for disjoint", () => {
    expect(overlapFraction(0, 0, 120, 16, 0, 0, 120, 16)).toBeCloseTo(1, 6);
    expect(overlapFraction(0, 0, 120, 16, 500, 500, 120, 16)).toBe(0);
  });
  it("a duplicate plank dropped on an existing one is rejected as 'overlap'", () => {
    const existing: Placement[] = [{ part: "plank", x: 500, y: 300, angleDeg: 0 }];
    const r = checkPlacement(L1, { part: "plank", x: 500, y: 300, angleDeg: 0 }, existing);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("overlap");
  });
  it("a near-identical plank (small offset) still exceeds the 40% threshold and is rejected", () => {
    const existing: Placement[] = [{ part: "plank", x: 500, y: 300, angleDeg: 0 }];
    // offset 30px on a 120-wide plank => 75% horizontal overlap => >40%.
    const r = checkPlacement(L1, { part: "plank", x: 530, y: 300, angleDeg: 0 }, existing);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("overlap");
  });
  it("planks placed end-to-end (small overlap) are allowed", () => {
    const existing: Placement[] = [{ part: "plank", x: 460, y: 300, angleDeg: 0 }]; // spans x[400-520]
    // next plank spans x[500-620] => 20px overlap of 120 => 16.7% < 40% => allowed.
    const r = checkPlacement(L1, { part: "plank", x: 560, y: 300, angleDeg: 0 }, existing);
    expect(r.ok).toBe(true);
  });
  it("MAX_OVERLAP_FRACTION is 0.4", () => {
    expect(MAX_OVERLAP_FRACTION).toBe(0.4);
  });
});

// FIX 5 — editor-validity proof: every knownSolution placement must pass the EDITOR's placement rules
// (bounds, not in goal, outside actor clearance, no >40% overlap, within budget + allowedParts), placed
// incrementally exactly as a player would. This guarantees every documented solution is actually
// buildable in the UI — not merely physically valid in the headless sim.
describe("Required test 6 — every knownSolution is editor-placeable (FIX 5)", () => {
  for (const level of LEVELS) {
    it(`L${level.id} ${level.title} knownSolution passes all editor rules`, () => {
      const placed: Placement[] = [];
      level.knownSolution.forEach((p, i) => {
        // allowedParts gate (the tray only offers these).
        expect(level.allowedParts, `L${level.id} part #${i + 1} (${p.part}) not in allowedParts`).toContain(p.part);
        const check = checkPlacement(level, p, placed);
        expect(check.ok, `L${level.id} part #${i + 1} (${p.part}) rejected by editor: ${check.reason}`).toBe(true);
        placed.push(p);
      });
      // Whole-solution budget sanity (redundant with the incremental check, but explicit).
      expect(placementsCost(level.knownSolution)).toBeLessThanOrEqual(level.budget);
    });
  }
});
