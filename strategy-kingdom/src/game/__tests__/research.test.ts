import { describe, it, expect } from "vitest";
import { initialState, reduce, type KingdomState, type Action } from "../kingdom";
import { RESEARCH } from "../content";

// Group 4 — Research: prereqs enforced, multipliers apply from the NEXT production phase.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

/** End one turn and auto-resolve any event card (gold side, low cost) so research
 *  tests aren't blocked by the turn-3 event firing. */
function endTurn(state: KingdomState): KingdomState {
  let s = reduce(state, { type: "endTurn" });
  if (s.pendingChoice) s = reduce(s, { type: "chooseEvent", option: 1 });
  return s;
}

/** Helper: stand up a kingdom with a library staffed and some RP banked fast. */
function withLibrary(scenario: "tutorial" | "growth" | "prosperity" = "tutorial"): KingdomState {
  let s = initialState(scenario);
  s = { ...s, resources: { ...s.resources, wood: 100, stone: 100 }, population: 12, popCap: 24 };
  // Build a library on plot 2.
  s = reduce(s, { type: "build", plot: 2, building: "library" });
  // End a turn (with food to avoid clutter) to complete the library.
  s = run(s, [
    { type: "assignWorker", building: "farm" },
    { type: "assignWorker", building: "farm" },
    { type: "assignWorker", building: "farm" },
  ]);
  s = endTurn(s);
  return s;
}

describe("research", () => {
  it("the shaved node Scriptorium costs 5 RP (Director amendment, GDD authored 6)", () => {
    expect(RESEARCH.scriptorium.cost).toBe(5);
  });

  it("setting a research target requires its prereq", () => {
    let s = initialState("tutorial");
    // Crop Rotation requires Irrigation; not yet researched -> refused.
    s = reduce(s, { type: "research", node: "cropRotation" });
    expect(s.pendingResearch).toBeNull();
    // Irrigation has no prereq -> accepted.
    s = reduce(s, { type: "research", node: "irrigation" });
    expect(s.pendingResearch).toBe("irrigation");
  });

  it("a node completes when RP ≥ cost, deducting the cost", () => {
    let s = withLibrary();
    // 2 library workers × 1 RP = 2/turn. Target Irrigation (cost 4).
    s = reduce(s, { type: "research", node: "irrigation" });
    s = run(s, [
      { type: "assignWorker", building: "library" },
      { type: "assignWorker", building: "library" },
    ]);
    // Turn A: +2 RP (total 2). Not enough.
    s = endTurn(s);
    expect(s.researched).not.toContain("irrigation");
    expect(s.researchPoints).toBe(2);
    // Turn B: +2 RP (total 4) -> completes, cost deducted to 0.
    s = endTurn(s);
    expect(s.researched).toContain("irrigation");
    expect(s.researchPoints).toBe(0);
    expect(s.pendingResearch).toBeNull();
  });

  it("multiplier applies from the NEXT production phase, not the completion turn", () => {
    // Inject a state poised to complete Irrigation on the next endTurn: RP just
    // shy of cost, 2 library workers (+2 -> hits 4), 3 farm workers producing.
    let s = initialState("tutorial");
    s = {
      ...s,
      resources: { ...s.resources, food: 50 },
      population: 8,
      popCap: 12,
      researchPoints: 2,
      pendingResearch: "irrigation",
      plots: ["farm", "lumberCamp", "library", null, null, null, null, null, null, null, null, null],
      workers: { farm: 3, lumberCamp: 0, quarry: 0, market: 0, house: 0, library: 2 },
    };
    // Completion turn: production runs with base 3, THEN research completes (step 5).
    s = endTurn(s);
    const completionTurn = s.log[s.log.length - 1];
    expect(s.researched).toContain("irrigation");
    const farmAtCompletion = completionTurn.production.find((p) => p.building === "farm")!;
    expect(farmAtCompletion.base).toBe(3); // produced BEFORE the multiplier applied
    // Next turn: farm base is now 4.
    s = endTurn(s);
    const nextTurn = s.log[s.log.length - 1];
    const farmAfter = nextTurn.production.find((p) => p.building === "farm")!;
    expect(farmAfter.base).toBe(4);
  });

  it("Surveying opens a 13th plot", () => {
    let s = withLibrary();
    s = { ...s, researchPoints: 10 };
    s = reduce(s, { type: "research", node: "surveying" }); // cost 5
    s = endTurn(s);
    expect(s.researched).toContain("surveying");
    expect(s.plots.length).toBe(13);
  });

  it("Census adds +1 popCap per house", () => {
    let s = withLibrary();
    // Build 2 houses first (need Surveying prereq path: Census needs Surveying).
    s = { ...s, researchPoints: 20 };
    s = reduce(s, { type: "build", plot: 3, building: "house" });
    s = reduce(s, { type: "build", plot: 4, building: "house" });
    s = reduce(s, { type: "research", node: "surveying" });
    s = endTurn(s); // houses complete (popCap 8+8=16), surveying done
    const capBefore = s.popCap;
    expect(capBefore).toBe(16); // 2 houses × 4 + 8
    s = reduce(s, { type: "research", node: "census" });
    s = endTurn(s);
    expect(s.researched).toContain("census");
    // 2 houses × (4+1) + 8 = 18
    expect(s.popCap).toBe(18);
  });

  it("Great Hall grants +1 population immediately on completion", () => {
    let s = withLibrary();
    // Great Hall needs Census needs Surveying. Provide real houses so popCap has
    // genuine headroom (popCap is derived from houses, not injected).
    s = {
      ...s,
      researched: ["surveying", "census"],
      researchPoints: 20,
      population: 10,
      plots: ["farm", "lumberCamp", "library", "house", "house", null, null, null, null, null, null, null, null],
    };
    // With Census: popCap = 8 + (4+1)×2 = 18 -> room above pop 10.
    s = reduce(s, { type: "research", node: "greatHall" }); // cost 10
    const popBefore = s.population;
    s = endTurn(s);
    expect(s.researched).toContain("greatHall");
    expect(s.population).toBe(popBefore + 1);
  });
});
