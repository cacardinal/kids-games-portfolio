import { describe, it, expect } from "vitest";
import { initialState, reduce, type KingdomState, type Action } from "../kingdom";

// Group 2 — Consumption + growth: surplus grows pop (capped by popCap),
// deficit pauses growth and floors food at 0.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

describe("consumption and growth", () => {
  it("surplus grows population by exactly 1", () => {
    let s = initialState("tutorial"); // pop 6, popCap 8
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" }, // 3×3=9 food, eat 6, +3
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.log[0].foodNet).toBe(3);
    expect(s.log[0].foodStatus).toBe("surplus");
    expect(s.log[0].grew).toBe(true);
    expect(s.population).toBe(7);
  });

  it("consumption = population × 1 food", () => {
    let s = initialState("tutorial");
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.log[0].consumed).toBe(6); // pop 6
  });

  it("growth is capped at popCap (no overgrowth without houses)", () => {
    let s = initialState("tutorial"); // popCap 8
    // Assign 3 farm workers, end many turns; pop should stop at 8.
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    for (let i = 0; i < 6; i++) s = reduce(s, { type: "endTurn" });
    expect(s.population).toBe(8); // capped, never exceeds 8 with 0 houses
    expect(s.popCap).toBe(8);
  });

  it("deficit pauses growth and floors food at 0, with no fail state", () => {
    let s = initialState("tutorial"); // food 8, pop 6
    // Assign NO farm workers: 0 food produced, eat 6. Net -6.
    s = reduce(s, { type: "endTurn" });
    expect(s.log[0].foodNet).toBe(-6);
    expect(s.log[0].foodStatus).toBe("deficit");
    expect(s.log[0].grew).toBe(false);
    expect(s.population).toBe(6); // no growth
    // food = 8 - 6 = 2 (stockpile, not floored yet)
    expect(s.resources.food).toBe(2);
    expect(s.finished).toBe(false); // no fail
  });

  it("food floors at 0, never negative", () => {
    let s = initialState("tutorial"); // food 8, pop 6
    // Two deficit turns with no farming: turn1 8-6=2, turn2 2-6 -> floor 0
    s = reduce(s, { type: "endTurn" });
    s = reduce(s, { type: "endTurn" });
    expect(s.resources.food).toBe(0);
    expect(s.log[1].flooredResources).toContain("food");
    expect(s.population).toBe(6);
  });

  it("even (net 0) is not surplus and does not grow", () => {
    let s = initialState("tutorial"); // pop 6
    // 2 farm workers × 3 = 6 food, eat 6, net 0.
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.log[0].foodNet).toBe(0);
    expect(s.log[0].foodStatus).toBe("even");
    expect(s.log[0].grew).toBe(false);
    expect(s.population).toBe(6);
  });

  it("Full Larder streak breaks on a non-surplus turn", () => {
    let s = initialState("tutorial");
    // Turn 1 surplus
    s = run(s, [
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.allTurnsSurplus).toBe(true);
    // Turn 2: remove workers -> deficit
    s = run(s, [
      { type: "unassignWorker", building: "farm" },
      { type: "unassignWorker", building: "farm" },
      { type: "unassignWorker", building: "farm" },
    ]);
    s = reduce(s, { type: "endTurn" });
    expect(s.allTurnsSurplus).toBe(false);
  });
});
