import { describe, it, expect } from "vitest";
import { initialState, reduce, type KingdomState, type Action } from "../kingdom";

// Group 7 — Determinism: same action sequence -> identical final state.
// The reducer uses no Math.random; events are fixed-order; everything is arithmetic.

function play(actions: Action[], scenario: "tutorial" | "growth" | "prosperity" = "tutorial"): KingdomState {
  let s = initialState(scenario);
  for (const a of actions) s = reduce(s, a);
  return s;
}

/** A representative sequence exercising production, building, research, events. */
const SEQUENCE: Action[] = [
  { type: "assignWorker", building: "farm" },
  { type: "assignWorker", building: "farm" },
  { type: "assignWorker", building: "farm" },
  { type: "build", plot: 2, building: "house" },
  { type: "endTurn" }, // turn 1: surplus, house queued
  { type: "build", plot: 3, building: "lumberCamp" },
  { type: "endTurn" }, // turn 2: house completes
  { type: "assignWorker", building: "lumberCamp" },
  { type: "endTurn" }, // turn 3: event fires
  { type: "chooseEvent", option: 0 }, // take travelers
  { type: "endTurn" }, // turn 4
  { type: "endTurn" }, // turn 5
];

describe("determinism", () => {
  it("identical action sequences produce byte-identical state (deep equal)", () => {
    const a = play(SEQUENCE);
    const b = play(SEQUENCE);
    expect(a).toEqual(b);
  });

  it("identical sequences produce identical JSON serialization", () => {
    const a = play(SEQUENCE);
    const b = play(SEQUENCE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("the log is identical across runs (the math story is reproducible)", () => {
    const a = play(SEQUENCE);
    const b = play(SEQUENCE);
    expect(a.log).toEqual(b.log);
    expect(a.log.length).toBeGreaterThan(0);
  });

  it("events draw in the same order every run (frozen deck, no shuffle)", () => {
    const seq: Action[] = [];
    for (let i = 0; i < 9; i++) seq.push({ type: "endTurn" }, { type: "chooseEvent", option: 1 });
    const a = play(seq, "growth");
    const b = play(seq, "growth");
    const aEvents = a.log.map((r) => r.eventDrawn?.id ?? null);
    const bEvents = b.log.map((r) => r.eventDrawn?.id ?? null);
    expect(aEvents).toEqual(bEvents);
  });

  it("reducer never mutates the input state (purity)", () => {
    const s0 = initialState("tutorial");
    const snapshot = JSON.stringify(s0);
    reduce(s0, { type: "assignWorker", building: "farm" });
    reduce(s0, { type: "build", plot: 2, building: "house" });
    reduce(s0, { type: "endTurn" });
    // s0 must be unchanged by any of those calls.
    expect(JSON.stringify(s0)).toBe(snapshot);
  });

  it("a full reign replays to an identical end state and score-relevant fields", () => {
    const seq: Action[] = [];
    // Drive ~12 turns of a simple farm-and-house loop.
    seq.push(
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
      { type: "assignWorker", building: "farm" },
    );
    for (let t = 0; t < 12; t++) {
      seq.push({ type: "endTurn" });
      seq.push({ type: "chooseEvent", option: 0 }); // no-op when no event pending
    }
    const a = play(seq);
    const b = play(seq);
    expect(a.population).toBe(b.population);
    expect(a.resources).toEqual(b.resources);
    expect(a.researched).toEqual(b.researched);
    expect(a.finished).toBe(b.finished);
    expect(a.allTurnsSurplus).toBe(b.allTurnsSurplus);
  });
});
