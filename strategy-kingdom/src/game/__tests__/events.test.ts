import { describe, it, expect } from "vitest";
import { initialState, reduce, type KingdomState, type Action } from "../kingdom";
import { TUTORIAL_DECK, GROWTH_DECK, PROSPERITY_DECK } from "../content";

// Group 5 — Events: fire on every 3rd turn in FIXED deck order; both options apply
// EXACTLY their stated arithmetic; floors respected.

function run(state: KingdomState, actions: Action[]): KingdomState {
  return actions.reduce((s, a) => reduce(s, a), state);
}

describe("events", () => {
  it("no event fires before turn 3", () => {
    let s = initialState("tutorial");
    s = reduce(s, { type: "endTurn" }); // turn 1
    expect(s.pendingChoice).toBeNull();
    s = reduce(s, { type: "endTurn" }); // turn 2
    expect(s.pendingChoice).toBeNull();
  });

  it("the first card (turn 3) is deck card #1 in fixed order", () => {
    let s = initialState("tutorial");
    s = reduce(s, { type: "endTurn" }); // 1
    s = reduce(s, { type: "endTurn" }); // 2
    s = reduce(s, { type: "endTurn" }); // 3 -> event
    expect(s.pendingChoice).not.toBeNull();
    expect(s.pendingChoice!.id).toBe(TUTORIAL_DECK[0].id);
    expect(s.pendingChoice!.title).toBe("Travelers at the Gate");
  });

  it("END TURN is blocked while a choice is pending", () => {
    let s = initialState("tutorial");
    s = run(s, [{ type: "endTurn" }, { type: "endTurn" }, { type: "endTurn" }]);
    expect(s.pendingChoice).not.toBeNull();
    const before = s;
    s = reduce(s, { type: "endTurn" }); // should be refused
    expect(s).toBe(before); // unchanged reference
  });

  it("cards draw in fixed order across the reign (3,6,9,12)", () => {
    let s = initialState("tutorial");
    const drawnIds: string[] = [];
    for (let t = 0; t < 12; t++) {
      s = reduce(s, { type: "endTurn" });
      if (s.pendingChoice) {
        drawnIds.push(s.pendingChoice.id);
        s = reduce(s, { type: "chooseEvent", option: 1 }); // gold side, cheap
      }
    }
    expect(drawnIds).toEqual([
      TUTORIAL_DECK[0].id,
      TUTORIAL_DECK[1].id,
      TUTORIAL_DECK[2].id,
      TUTORIAL_DECK[3].id,
    ]);
  });

  it("option A applies its exact arithmetic (Travelers: +2 people, -8 food)", () => {
    let s = initialState("tutorial");
    // Get to turn 3 with comfortable food and room for +2 people.
    s = { ...s, resources: { ...s.resources, food: 30 }, population: 6, popCap: 12 };
    s = run(s, [{ type: "endTurn" }, { type: "endTurn" }, { type: "endTurn" }]);
    const foodBefore = s.resources.food;
    const popBefore = s.population;
    s = reduce(s, { type: "chooseEvent", option: 0 });
    expect(s.population).toBe(popBefore + 2);
    expect(s.resources.food).toBe(foodBefore - 8);
  });

  it("option B applies its exact arithmetic (Travelers: +5 gold)", () => {
    let s = initialState("tutorial");
    s = { ...s, resources: { ...s.resources, food: 30 } };
    s = run(s, [{ type: "endTurn" }, { type: "endTurn" }, { type: "endTurn" }]);
    const goldBefore = s.resources.gold;
    s = reduce(s, { type: "chooseEvent", option: 1 });
    expect(s.resources.gold).toBe(goldBefore + 5);
  });

  it("an unaffordable cost floors at 0 and still resolves the rest", () => {
    let s = initialState("tutorial");
    // Force food to 3, then take a -8 food / +2 people card.
    s = { ...s, resources: { ...s.resources, food: 3 }, population: 6, popCap: 12 };
    s = run(s, [{ type: "endTurn" }, { type: "endTurn" }, { type: "endTurn" }]);
    // food after 3 endTurns with no farming: 3-6 floored to 0 each turn -> 0
    expect(s.resources.food).toBe(0);
    const popBefore = s.population;
    s = reduce(s, { type: "chooseEvent", option: 0 }); // +2 people, -8 food
    expect(s.resources.food).toBe(0); // floored, not negative
    expect(s.population).toBe(popBefore + 2); // people still arrive
  });

  it("growth deck draws 6 cards over 20 turns in fixed order", () => {
    let s = initialState("growth");
    s = { ...s, resources: { ...s.resources, food: 500 }, population: 10, popCap: 28 };
    const drawnIds: string[] = [];
    for (let t = 0; t < 20; t++) {
      s = reduce(s, { type: "endTurn" });
      if (s.pendingChoice) {
        drawnIds.push(s.pendingChoice.id);
        s = reduce(s, { type: "chooseEvent", option: 1 });
      }
      if (s.finished) break;
    }
    expect(drawnIds.slice(0, 6)).toEqual(GROWTH_DECK.slice(0, 6).map((c) => c.id));
  });

  it("prosperity deck card list matches authored order (sanity on first 8)", () => {
    const ids = PROSPERITY_DECK.slice(0, 8).map((c) => c.id);
    expect(ids).toEqual([
      "pro-1",
      "pro-2",
      "pro-3",
      "pro-4",
      "pro-5",
      "pro-6",
      "pro-7",
      "pro-8",
    ]);
  });
});
