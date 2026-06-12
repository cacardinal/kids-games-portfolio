import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  effectiveBase,
  type KingdomState,
  type Action,
} from "../kingdom";

// Group 1 — Production math: workers × base × multiplier across research states.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

describe("production math", () => {
  it("farm base: 3 workers × 3 = 9 food (no research)", () => {
    let s = initialState("tutorial");
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    expect(s.workers.farm).toBe(3);
    s = reduce(s, { type: "endTurn" });
    const rep = s.log[0];
    const farmLine = rep.production.find((p) => p.building === "farm")!;
    expect(farmLine.workers).toBe(3);
    expect(farmLine.base).toBe(3);
    expect(farmLine.amount).toBe(9); // 3 × 3
    expect(rep.produced.food).toBe(9);
  });

  it("lumber camp: 2 workers × 2 = 4 wood", () => {
    let s = initialState("tutorial");
    s = run(s, [
      { type: "assignWorker", building: "lumberCamp" },
      { type: "assignWorker", building: "lumberCamp" },
    ]);
    s = reduce(s, { type: "endTurn" });
    const line = s.log[0].production.find((p) => p.building === "lumberCamp")!;
    expect(line.amount).toBe(4);
    expect(s.log[0].produced.wood).toBe(4);
  });

  it("effectiveBase reflects research multipliers (additive to base)", () => {
    expect(effectiveBase("farm", [])).toBe(3);
    expect(effectiveBase("farm", ["irrigation"])).toBe(4);
    expect(effectiveBase("farm", ["irrigation", "cropRotation"])).toBe(5);
    expect(effectiveBase("lumberCamp", ["wheelbarrow"])).toBe(3);
    expect(effectiveBase("quarry", ["wheelbarrow"])).toBe(3);
    expect(effectiveBase("quarry", ["wheelbarrow", "masonry"])).toBe(4);
    expect(effectiveBase("market", ["coinage"])).toBe(3);
    expect(effectiveBase("market", ["coinage", "guild"])).toBe(4);
    expect(effectiveBase("library", ["scriptorium"])).toBe(2);
  });

  it("fully-researched farm shows the GDD's max product 3 × 5 = 15", () => {
    let s = initialState("tutorial");
    // Inject researched state directly (reducer is pure; this is a math assertion).
    s = { ...s, researched: ["irrigation", "cropRotation"] };
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    const line = s.log[0].production.find((p) => p.building === "farm")!;
    expect(line.base).toBe(5);
    expect(line.amount).toBe(15);
  });

  it("idle hands are reported (population − assigned)", () => {
    let s = initialState("tutorial"); // pop 6
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    // 6 pop − 2 assigned = 4 idle
    expect(s.log[0].idleHands).toBe(4);
  });

  it("cannot assign more workers than slots", () => {
    let s = initialState("tutorial");
    // Farm has 3 slots; try to assign 4.
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    expect(s.workers.farm).toBe(3);
  });

  it("cannot assign more workers than free hands", () => {
    let s = initialState("tutorial"); // pop 6
    // Two farms (6 slots) + ... but only 6 population. Assign 3 farm + 3 lumber = 6, then fail.
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "lumberCamp" },
      { type: "assignWorker", building: "lumberCamp" },
      { type: "assignWorker", building: "lumberCamp" },
      { type: "assignWorker", building: "lumberCamp" }, // 4th lumber would need a 7th hand
    ]);
    expect(s.workers.farm).toBe(3);
    expect(s.workers.lumberCamp).toBe(3);
    expect(s.population).toBe(6);
  });
});
