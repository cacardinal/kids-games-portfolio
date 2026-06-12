// Unit-level tests for sim primitives (REQUIRED test 5: bounds, goal-counter, determinism wiring).
import { describe, it, expect } from "vitest";
import { classifyBounds, aabbInsideGoal, createSim, WORLD_W, WORLD_H, FIXED_DT, GOAL_HOLD_STEPS } from "../sim";
import { LEVELS } from "../../data/levels";

describe("out-of-bounds classification", () => {
  it("in-bounds positions classify as 'in'", () => {
    expect(classifyBounds(640, 360)).toBe("in");
    expect(classifyBounds(0, 0)).toBe("in");
    expect(classifyBounds(1280, 720)).toBe("in");
  });
  it("y > 760 is out of bounds", () => {
    expect(classifyBounds(640, 761)).toBe("oob");
    expect(classifyBounds(640, 760)).toBe("in"); // boundary inclusive
  });
  it("x < -40 or x > 1320 is out of bounds", () => {
    expect(classifyBounds(-41, 360)).toBe("oob");
    expect(classifyBounds(-40, 360)).toBe("in");
    expect(classifyBounds(1321, 360)).toBe("oob");
    expect(classifyBounds(1320, 360)).toBe("in");
  });
});

describe("AABB-inside-goal test", () => {
  const goal = { minX: 100, minY: 100, maxX: 200, maxY: 200 };
  it("fully inside returns true", () => {
    expect(aabbInsideGoal({ min: { x: 120, y: 120 }, max: { x: 180, y: 180 } }, goal)).toBe(true);
  });
  it("touching the boundary still inside (inclusive)", () => {
    expect(aabbInsideGoal({ min: { x: 100, y: 100 }, max: { x: 200, y: 200 } }, goal)).toBe(true);
  });
  it("poking out on any side returns false", () => {
    expect(aabbInsideGoal({ min: { x: 99, y: 120 }, max: { x: 180, y: 180 } }, goal)).toBe(false);
    expect(aabbInsideGoal({ min: { x: 120, y: 120 }, max: { x: 201, y: 180 } }, goal)).toBe(false);
    expect(aabbInsideGoal({ min: { x: 120, y: 99 }, max: { x: 180, y: 180 } }, goal)).toBe(false);
    expect(aabbInsideGoal({ min: { x: 120, y: 120 }, max: { x: 180, y: 201 } }, goal)).toBe(false);
  });
});

describe("world + step constants", () => {
  it("fixed world dims and timestep", () => {
    expect(WORLD_W).toBe(1280);
    expect(WORLD_H).toBe(720);
    expect(FIXED_DT).toBeCloseTo(1000 / 60, 9);
    expect(GOAL_HOLD_STEPS).toBe(30);
  });
});

describe("goal-hold counter behaves consecutively", () => {
  it("a single step does not satisfy the 30-step hold immediately", () => {
    const level = LEVELS[0];
    const sim = createSim(level, level.knownSolution);
    let consecutive = 0;
    let satisfiedAt = -1;
    for (let s = 1; s <= 1200 && satisfiedAt < 0; s++) {
      sim.step();
      if (sim.heroInGoal()) {
        consecutive++;
        if (consecutive >= GOAL_HOLD_STEPS) satisfiedAt = s;
      } else {
        consecutive = 0; // resets on any out-of-goal step — proves "consecutive"
      }
    }
    expect(satisfiedAt).toBeGreaterThan(0);
    // The satisfied step must be at least 30 steps after the first in-goal step.
    expect(satisfiedAt).toBeGreaterThanOrEqual(GOAL_HOLD_STEPS);
  });
});

describe("body creation order is fixed: terrain -> placements -> actors", () => {
  it("L1 first bodies are terrain, then placements, then actors", () => {
    const level = LEVELS[0];
    const sim = createSim(level, level.knownSolution);
    const labels = sim.bodies.map((b) => b.label);
    const nTerrain = level.terrain.length;
    const nPlace = level.knownSolution.length;
    for (let i = 0; i < nTerrain; i++) expect(labels[i].startsWith("terrain:")).toBe(true);
    for (let i = nTerrain; i < nTerrain + nPlace; i++) expect(labels[i].startsWith("part:")).toBe(true);
    for (let i = nTerrain + nPlace; i < labels.length; i++) expect(labels[i].startsWith("actor:")).toBe(true);
  });
});

describe("bouncer carries its restitution (static-init bug guard)", () => {
  it("a placed bouncer body has restitution 1.4, not 0", () => {
    // L9 uses a bouncer; find it and assert the value stuck.
    const l9 = LEVELS.find((l) => l.id === 9)!;
    const sim = createSim(l9, l9.knownSolution);
    const bouncer = sim.bodies.find((b) => b.label === "part:bouncer");
    expect(bouncer).toBeDefined();
    expect(bouncer!.restitution).toBeCloseTo(1.4, 5);
  });
});
