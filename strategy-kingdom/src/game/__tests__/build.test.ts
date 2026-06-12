import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  computePopCap,
  buildingCount,
  type KingdomState,
  type Action,
} from "../kingdom";

// Group 3 — Build: cost deduction, queue completes next turn, plot occupancy rules.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

describe("building", () => {
  it("cost deducts immediately on placement", () => {
    let s = initialState("tutorial"); // wood 8, stone 4
    s = reduce(s, { type: "build", plot: 2, building: "house" }); // costs 4 wood, 2 stone
    expect(s.resources.wood).toBe(4);
    expect(s.resources.stone).toBe(2);
    expect(s.buildQueue).toHaveLength(1);
    expect(s.plots[2]).toBeNull(); // not yet placed
  });

  it("queued build completes on the next endTurn (not before)", () => {
    let s = initialState("tutorial");
    s = reduce(s, { type: "build", plot: 2, building: "house" });
    // Need a surplus or it doesn't matter; end the turn.
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.plots[2]).toBe("house");
    expect(s.buildQueue).toHaveLength(0);
    expect(s.log[0].completedBuilds).toEqual([{ plot: 2, building: "house" }]);
  });

  it("a completed house raises popCap by 4", () => {
    let s = initialState("tutorial"); // popCap 8
    s = reduce(s, { type: "build", plot: 2, building: "house" });
    s = reduce(s, { type: "endTurn" });
    expect(s.popCap).toBe(12);
    expect(computePopCap(s)).toBe(12);
  });

  it("cannot build on an occupied plot", () => {
    let s = initialState("tutorial"); // plot 0 is a farm
    const before = { ...s.resources };
    s = reduce(s, { type: "build", plot: 0, building: "house" });
    expect(s.resources).toEqual(before); // unchanged
    expect(s.buildQueue).toHaveLength(0);
  });

  it("cannot build without enough resources", () => {
    let s = initialState("tutorial"); // stone 4
    // Library costs 5 wood, 4 stone — affordable once. Market costs 5 wood, 3 stone.
    // Build a market (5w,3s) leaving 3 wood, 1 stone, then a library is unaffordable.
    s = reduce(s, { type: "build", plot: 2, building: "market" });
    expect(s.resources.wood).toBe(3);
    expect(s.resources.stone).toBe(1);
    const before = { ...s.resources };
    s = reduce(s, { type: "build", plot: 3, building: "library" }); // needs 5w/4s
    expect(s.resources).toEqual(before); // refused, no deduction
  });

  it("respects map caps (Farm ≤ 4 counting the pre-built one)", () => {
    let s = initialState("tutorial");
    // Pre-built: 1 farm (plot 0). Give plenty of wood.
    s = { ...s, resources: { ...s.resources, wood: 100, stone: 100 } };
    // Build 3 more farms (plots 2,3,4) -> total 4. A 5th must be refused.
    s = reduce(s, { type: "build", plot: 2, building: "farm" });
    s = reduce(s, { type: "build", plot: 3, building: "farm" });
    s = reduce(s, { type: "build", plot: 4, building: "farm" });
    // Now 1 placed + 3 queued = 4 -> at cap. Attempt a 5th.
    const before = { ...s.resources };
    s = reduce(s, { type: "build", plot: 5, building: "farm" });
    expect(s.resources).toEqual(before); // refused
    s = reduce(s, { type: "endTurn" });
    expect(buildingCount(s, "farm")).toBe(4);
  });

  it("cannot queue two builds on the same plot", () => {
    let s = initialState("tutorial");
    s = { ...s, resources: { ...s.resources, wood: 100, stone: 100 } };
    s = reduce(s, { type: "build", plot: 2, building: "house" });
    const before = { ...s.resources };
    s = reduce(s, { type: "build", plot: 2, building: "farm" }); // same plot
    expect(s.resources).toEqual(before); // refused
    expect(s.buildQueue).toHaveLength(1);
  });
});
