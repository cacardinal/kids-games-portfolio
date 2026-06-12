import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  previewEffect,
  type KingdomState,
  type Action,
} from "../kingdom";
import { effectiveOptionLabel, resolutionNoteLines, displaySeason } from "../display";
import { TUTORIAL_DECK, SCENARIOS } from "../content";

// Honest buttons (critic punch #1): an event option's preview must equal the
// deltas actually applied at resolution — capped, floored, and uncapped alike.
// previewEffect() IS the resolution computation (applyEffect applies it), so
// these tests pin the covenant: the button can never promise what the reducer
// won't deliver.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

/** Drive a fresh tutorial reign to the turn-3 event (Travelers: +2 people, −8 food / +5 gold). */
function toFirstEvent(setup: { food?: number; population?: number; popCap?: number } = {}): KingdomState {
  let s = initialState("tutorial");
  s = {
    ...s,
    population: setup.population ?? s.population,
    popCap: setup.popCap ?? s.popCap,
    resources: { ...s.resources, food: setup.food ?? s.resources.food },
  };
  s = run(s, [{ type: "endTurn" }, { type: "endTurn" }, { type: "endTurn" }]);
  expect(s.pendingChoice).not.toBeNull();
  return s;
}

/** Assert that a previewed outcome equals the state diff chooseEvent produces. */
function expectPreviewEqualsApplied(before: KingdomState, option: 0 | 1) {
  const effect = before.pendingChoice!.options[option].effect;
  const preview = previewEffect(before, effect);
  const after = reduce(before, { type: "chooseEvent", option });
  expect(after.resources.food - before.resources.food).toBe(preview.food);
  expect(after.resources.wood - before.resources.wood).toBe(preview.wood);
  expect(after.resources.stone - before.resources.stone).toBe(preview.stone);
  expect(after.resources.gold - before.resources.gold).toBe(preview.gold);
  expect(after.researchPoints - before.researchPoints).toBe(preview.research);
  expect(after.population - before.population).toBe(preview.people);
  // The reducer's receipt records the exact same outcome.
  expect(after.lastResolution).not.toBeNull();
  expect(after.lastResolution!.applied).toEqual(preview);
  return { preview, after };
}

describe("event option preview === applied deltas", () => {
  it("uncapped: room to grow and a full larder apply exactly the stated numbers", () => {
    const s = toFirstEvent({ food: 30, population: 6, popCap: 12 });
    const { preview } = expectPreviewEqualsApplied(s, 0); // +2 people, −8 food
    expect(preview.people).toBe(2);
    expect(preview.food).toBe(-8);
    expect(preview.modified).toBe(false);
    expect(preview.peopleTurnedAway).toBe(0);
    expect(preview.floored).toEqual([]);
  });

  it("uncapped: the gold option applies exactly (+5 gold)", () => {
    const s = toFirstEvent({ food: 30 });
    const { preview } = expectPreviewEqualsApplied(s, 1);
    expect(preview.gold).toBe(5);
    expect(preview.modified).toBe(false);
  });

  it("housing cap: at full houses, +2 people previews and applies as +0 (food still charged)", () => {
    const s = toFirstEvent({ food: 40, population: 8, popCap: 8 }); // 8 eaters × 3 turns leaves 16
    const { preview, after } = expectPreviewEqualsApplied(s, 0);
    expect(preview.people).toBe(0);
    expect(preview.peopleTurnedAway).toBe(2);
    expect(preview.food).toBe(-8); // the stated cost is unmodified
    expect(preview.modified).toBe(true);
    expect(after.population).toBe(8);
  });

  it("housing cap, partial: room for 1 of the stated 2", () => {
    const s = toFirstEvent({ food: 30, population: 7, popCap: 8 });
    const { preview, after } = expectPreviewEqualsApplied(s, 0);
    expect(preview.people).toBe(1);
    expect(preview.peopleTurnedAway).toBe(1);
    expect(preview.modified).toBe(true);
    expect(after.population).toBe(8);
  });

  it("resource floor: −8 food at 4 food previews and applies as −4 (floored)", () => {
    let s = toFirstEvent({ food: 30, population: 6, popCap: 12 });
    s = { ...s, resources: { ...s.resources, food: 4 } };
    const { preview, after } = expectPreviewEqualsApplied(s, 0);
    expect(preview.food).toBe(-4);
    expect(preview.floored).toEqual(["food"]);
    expect(preview.people).toBe(2); // the people still arrive
    expect(preview.modified).toBe(true);
    expect(after.resources.food).toBe(0);
  });

  it("resource floor at zero: −8 food at 0 food previews and applies as 0", () => {
    let s = toFirstEvent({ food: 30, population: 6, popCap: 12 });
    s = { ...s, resources: { ...s.resources, food: 0 } };
    const { preview } = expectPreviewEqualsApplied(s, 0);
    expect(preview.food).toBe(0);
    expect(preview.floored).toEqual(["food"]);
  });

  it("previewEffect never mutates the state it reads", () => {
    const s = toFirstEvent({ food: 40, population: 8, popCap: 8 });
    const snapshot = JSON.stringify(s);
    previewEffect(s, s.pendingChoice!.options[0].effect);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe("honest option labels and resolution lines", () => {
  const festivalHold = TUTORIAL_DECK[3].options[0]; // "Hold it: +2 people, -6 food"

  it("unmodified options render the authored label verbatim", () => {
    const s = { ...initialState("tutorial"), population: 6, popCap: 12 };
    const l = effectiveOptionLabel(s, festivalHold);
    expect(l.modified).toBe(false);
    expect(l.text).toBe("Hold it: +2 people, -6 food");
  });

  it("at full housing the button shows the EFFECTIVE outcome", () => {
    const s = { ...initialState("tutorial"), population: 8, popCap: 8 };
    const l = effectiveOptionLabel(s, festivalHold);
    expect(l.modified).toBe(true);
    expect(l.text).toBe("Hold it: +0 people (houses full) · −6 food");
  });

  it("partial room and a short larder both show their effective numbers", () => {
    let s = initialState("tutorial");
    s = { ...s, population: 7, popCap: 8, resources: { ...s.resources, food: 4 } };
    const l = effectiveOptionLabel(s, festivalHold); // stated +2 people, −6 food
    expect(l.modified).toBe(true);
    expect(l.text).toBe("Hold it: +1 person (only room for 1) · −4 food (all you have)");
  });

  it("the resolution line states the housing-cap modification", () => {
    let s = toFirstEvent({ food: 40, population: 8, popCap: 8 });
    s = reduce(s, { type: "chooseEvent", option: 0 });
    const lines = resolutionNoteLines(s.lastResolution!);
    expect(lines).toEqual(["Houses full — no room for travelers."]);
  });

  it("the resolution line states a floored deduction", () => {
    let s = toFirstEvent({ food: 30, population: 6, popCap: 12 });
    s = { ...s, resources: { ...s.resources, food: 4 } };
    s = reduce(s, { type: "chooseEvent", option: 0 });
    const lines = resolutionNoteLines(s.lastResolution!);
    expect(lines).toContain("The larder gave all it had — 4 food.");
  });

  it("an exact (unmodified) resolution produces no note", () => {
    let s = toFirstEvent({ food: 30, population: 6, popCap: 12 });
    s = reduce(s, { type: "chooseEvent", option: 0 });
    expect(resolutionNoteLines(s.lastResolution!)).toEqual([]);
  });
});

describe("endgame: the season counter never leaves the reign's range", () => {
  it("a full tutorial reign finishes ON season 12, never 13 of 12", () => {
    let s = initialState("tutorial");
    for (let t = 0; t < 12; t++) {
      s = reduce(s, { type: "endTurn" });
      if (s.pendingChoice) s = reduce(s, { type: "chooseEvent", option: 1 });
    }
    expect(s.finished).toBe(true);
    expect(s.log.length).toBe(12);
    expect(s.turn).toBe(SCENARIOS.tutorial.turnLimit); // stays on the last played season
    expect(displaySeason(s)).toBe(12);
  });

  it("an early goal finish stays on the season the goal was met", () => {
    let s = initialState("tutorial");
    s = { ...s, population: 14, popCap: 16 }; // goal: population ≥ 14
    s = reduce(s, { type: "endTurn" });
    expect(s.finished).toBe(true);
    expect(s.turn).toBe(1);
    expect(displaySeason(s)).toBe(1);
  });

  it("displaySeason clamps legacy saves whose turn ran past the limit", () => {
    let s = initialState("tutorial");
    for (let t = 0; t < 12; t++) {
      s = reduce(s, { type: "endTurn" });
      if (s.pendingChoice) s = reduce(s, { type: "chooseEvent", option: 1 });
    }
    const legacy = { ...s, turn: 13 }; // pre-fix saves incremented past the limit
    expect(displaySeason(legacy)).toBe(12);
  });
});
