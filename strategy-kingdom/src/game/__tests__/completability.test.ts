import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  goalsMet,
  buildingCount,
  idleHands,
  totalSlots,
  effectiveBase,
  type KingdomState,
} from "../kingdom";
import { BUILDINGS, SCENARIOS, RESEARCH, type ResearchId, type BuildingId } from "../content";

// Group 6 — Scenario completability: a scripted reasonable strategy (coded here,
// faithful to the GDD §5 intended-strategy sketches) meets each scenario's goals
// within its turn limit. Proves the balance is achievable with the Director's
// 1-RP Scriptorium shave applied.

/** Move a worker onto a building if there's a free slot and a free hand. */
function tryAssign(s: KingdomState, b: BuildingId): KingdomState {
  if (idleHands(s) <= 0) return s;
  if ((s.workers[b] ?? 0) >= totalSlots(s, b)) return s;
  return reduce(s, { type: "assignWorker", building: b });
}

/** First empty plot index. */
function emptyPlot(s: KingdomState): number {
  return s.plots.findIndex((p) => p === null);
}

/** Build a building on the first empty plot if affordable and not capped/queued. */
function tryBuild(s: KingdomState, b: BuildingId): KingdomState {
  const plot = emptyPlot(s);
  if (plot < 0) return s;
  return reduce(s, { type: "build", plot, building: b });
}

/** How much food this turn's current worker layout would produce. */
function foodPlanned(s: KingdomState): number {
  return (s.workers.farm ?? 0) * effectiveBase("farm", s.researched);
}

/** Rebalance farm workers so food production >= population + buffer (if slots allow).
 *  The buffer both guarantees a growth turn and keeps spare food so +people event
 *  options are affordable. */
function ensureFood(s: KingdomState, buffer: number): KingdomState {
  let cur = s;
  // Add farm workers until food >= pop + buffer or farm is full or no hands.
  let guard = 0;
  while (foodPlanned(cur) < cur.population + buffer && guard++ < 30) {
    const before = cur;
    cur = tryAssign(cur, "farm");
    if (cur === before) break; // can't add more
  }
  return cur;
}

/** Resolve a pending event. While the kingdom still needs people (pop below the
 *  scenario's population goal), take the +people option (option 0 — the kind /
 *  +people side on growth and prosperity cards, per the early-reader-path convention).
 *  Once population is satisfied, take whichever option grants the most gold. */
function resolveEvent(s: KingdomState, popGoal: number): KingdomState {
  if (!s.pendingChoice) return s;
  const card = s.pendingChoice;
  const a = card.options[0];
  const b = card.options[1];
  const aPeople = a.effect.people ?? 0;
  if (aPeople > 0 && s.population < popGoal) {
    return reduce(s, { type: "chooseEvent", option: 0 });
  }
  // Otherwise maximize gold (the comfortable leg).
  const ag = a.effect.gold ?? 0;
  const bg = b.effect.gold ?? 0;
  return reduce(s, { type: "chooseEvent", option: bg >= ag ? 1 : 0 });
}

// ── Tutorial Reign: farm for surplus, houses to lift cap, take +people events ──
function playTutorial(): { state: KingdomState; turnGoalMet: number } {
  let s = initialState("tutorial");
  let turnGoalMet = -1;
  const limit = SCENARIOS.tutorial.turnLimit;
  for (let t = 1; t <= limit && !s.finished; t++) {
    // Reset to a clean worker plan each turn: pull lumber off if we don't need wood.
    // Strategy: keep enough wood early to build, then farm-heavy.
    // 1) Make sure we have wood for the next house (need 4 wood, 2 stone).
    const wantWood = s.resources.wood < 4 && buildingCount(s, "house") < 5;
    s = ensureFood(s, 1); // at least +1 surplus
    if (wantWood) s = tryAssign(s, "lumberCamp");
    // 2) Build a house when we can afford one and aren't capped.
    if (s.resources.wood >= 4 && s.resources.stone >= 2 && buildingCount(s, "house") < 5) {
      s = tryBuild(s, "house");
    } else if (s.resources.wood >= 4 && buildingCount(s, "farm") < 4) {
      // else expand food capacity with a 2nd/3rd farm
      s = tryBuild(s, "farm");
    }
    // 3) Top up food after spending hands on wood (buffer 2 keeps people events payable).
    s = ensureFood(s, 2);
    // End the turn.
    s = reduce(s, { type: "endTurn" });
    // 4) Resolve any event: take the people while below the 14 goal.
    s = resolveEvent(s, 14);
    if (turnGoalMet < 0 && goalsMet(s)) turnGoalMet = s.log[s.log.length - 1].turn;
  }
  return { state: s, turnGoalMet };
}

// ── Growth Reign: houses lead, feed the growing pop, take every +people event ──
function playGrowth(): { state: KingdomState; turnGoalMet: number } {
  let s = initialState("growth");
  let turnGoalMet = -1;
  const limit = SCENARIOS.growth.turnLimit;
  for (let t = 1; t <= limit && !s.finished; t++) {
    // Houses are the priority until popCap reaches 28 (5 houses).
    // Keep lumber/quarry staffed enough to fund houses; farm to feed.
    s = ensureFood(s, 1);
    // Need wood+stone for houses: staff lumber and (after we have a quarry) quarry.
    if (s.resources.wood < 6) s = tryAssign(s, "lumberCamp");
    if (buildingCount(s, "quarry") > 0 && s.resources.stone < 4) s = tryAssign(s, "quarry");
    // Build order: a quarry early (for stone), then houses, then a 2nd/3rd farm.
    // (Quarry is wood-only — 5 wood — so stone never gates the stone engine.)
    if (buildingCount(s, "quarry") === 0 && s.resources.wood >= 5) {
      s = tryBuild(s, "quarry");
    } else if (
      buildingCount(s, "house") < 5 &&
      s.resources.wood >= 4 &&
      s.resources.stone >= 2
    ) {
      s = tryBuild(s, "house");
    } else if (buildingCount(s, "farm") < 4 && s.resources.wood >= 4) {
      s = tryBuild(s, "farm");
    }
    s = ensureFood(s, 2);
    s = reduce(s, { type: "endTurn" });
    s = resolveEvent(s, 25); // take the people while below the 25 goal
    if (turnGoalMet < 0 && goalsMet(s)) turnGoalMet = s.log[s.log.length - 1].turn;
  }
  return { state: s, turnGoalMet };
}

// ── Prosperity Reign: phased plan (GDD §5C) — found, then research + houses +
// an early Market, then fill the population and let gold ride. Food-multiplier
// research is prioritized so 2-3 farms can feed 28; the early Market plus gold
// events carry the treasury to 80. ──────────────────────────────────────────────
//
// Prosperity research priority (faithful to "research in cost order as RP allows"
// but front-loading the food multipliers the population goal depends on):
const PROSPERITY_RESEARCH_PRIORITY: ResearchId[] = [
  "irrigation", // farm +1 (food) — cheapest, food first
  "scriptorium", // library +1 RP (shaved to 5) — speeds the rest
  "cropRotation", // farm +1 again (food headroom for 28)
  "wheelbarrow", // lumber/quarry +1 (materials)
  "coinage", // market +1 (gold)
  "masonry", // quarry +1 (materials)
  "surveying",
  "census",
  "guild",
  "greatHall",
];
function nextProsperityResearch(s: KingdomState): ResearchId | null {
  for (const id of PROSPERITY_RESEARCH_PRIORITY) {
    if (s.researched.includes(id)) continue;
    const def = RESEARCH[id];
    if (def.prereq && !s.researched.includes(def.prereq)) continue;
    return id;
  }
  return null;
}

function playProsperity(): { state: KingdomState; turnGoalMet: number } {
  let s = initialState("prosperity");
  let turnGoalMet = -1;
  const limit = SCENARIOS.prosperity.turnLimit;
  const goalResearch = SCENARIOS.prosperity.goals.research ?? 6;
  for (let t = 1; t <= limit && !s.finished; t++) {
    const stillBuilding =
      buildingCount(s, "farm") < 3 ||
      buildingCount(s, "quarry") < 1 ||
      buildingCount(s, "library") < 1 ||
      buildingCount(s, "house") < 5 ||
      buildingCount(s, "market") < 2;

    // Fund building materials while there's still something to build.
    if (stillBuilding && s.resources.wood < 9) s = tryAssign(s, "lumberCamp");
    if (stillBuilding && buildingCount(s, "quarry") > 0 && s.resources.stone < 9) {
      s = tryAssign(s, "quarry");
    }

    // Build priority: quarry -> 2nd farm -> library -> Market #1 (early!) ->
    // houses -> 3rd farm -> Market #2. (Quarry is wood-only: 5 wood.)
    if (buildingCount(s, "quarry") === 0 && s.resources.wood >= 5) {
      s = tryBuild(s, "quarry");
    } else if (buildingCount(s, "farm") < 2 && s.resources.wood >= 4) {
      s = tryBuild(s, "farm");
    } else if (buildingCount(s, "library") === 0 && s.resources.wood >= 5 && s.resources.stone >= 4) {
      s = tryBuild(s, "library");
    } else if (buildingCount(s, "market") < 1 && s.resources.wood >= 5 && s.resources.stone >= 3) {
      s = tryBuild(s, "market"); // Market #1 runs gold through the whole reign
    } else if (buildingCount(s, "house") < 5 && s.resources.wood >= 4 && s.resources.stone >= 2) {
      s = tryBuild(s, "house");
    } else if (buildingCount(s, "farm") < 3 && s.resources.wood >= 4) {
      s = tryBuild(s, "farm");
    } else if (buildingCount(s, "market") < 2 && s.resources.wood >= 5 && s.resources.stone >= 3) {
      s = tryBuild(s, "market");
    }

    // Research: while under the goal, staff the library and set the next target.
    if (s.researched.length < goalResearch && buildingCount(s, "library") > 0) {
      s = tryAssign(s, "library");
      s = tryAssign(s, "library");
      const target = nextProsperityResearch(s);
      if (target && s.pendingResearch !== target) {
        s = reduce(s, { type: "research", node: target });
      }
    }

    // Food (with a buffer so people events stay payable).
    s = ensureFood(s, 3);
    // Staff the Market(s) every turn for gold — the comfortable leg.
    s = tryAssign(s, "market");
    s = tryAssign(s, "market");
    s = tryAssign(s, "market");
    s = tryAssign(s, "market");

    s = reduce(s, { type: "endTurn" });
    s = resolveEvent(s, 28); // take people until pop 28, then maximize gold
    if (turnGoalMet < 0 && goalsMet(s)) turnGoalMet = s.log[s.log.length - 1].turn;
  }
  return { state: s, turnGoalMet };
}

// ── No stone softlock (critic punch #2) ───────────────────────────────────────
// The Quarry is the only stone income, so its cost is wood-only. A Library-first
// opening (which spends ALL the starting stone) must still reach a Quarry on
// ordinary wood income — no dead seasons waiting for a rescue event card.
describe("no stone softlock (Quarry costs wood only)", () => {
  it("the ruling: Quarry build cost is 5 wood, 0 stone", () => {
    expect(BUILDINGS.quarry.cost).toEqual({ wood: 5, stone: 0 });
  });

  it("Growth Reign, Library first: a Quarry is buildable from a no-stone state by season 2", () => {
    let s = initialState("growth");
    // Library first: 5 wood / 4 stone — spends every starting stone.
    s = reduce(s, { type: "build", plot: 2, building: "library" });
    expect(s.resources.stone).toBe(0);
    expect(s.resources.wood).toBe(3);

    // Ordinary worker income: 3 on the farm (feed 6), 3 cutting wood.
    for (let i = 0; i < 3; i++) s = tryAssign(s, "farm");
    for (let i = 0; i < 3; i++) s = tryAssign(s, "lumberCamp");
    s = reduce(s, { type: "endTurn" }); // season 1: +6 wood -> 9, library completes
    expect(s.resources.stone).toBe(0); // still zero stone income anywhere
    expect(s.resources.wood).toBeGreaterThanOrEqual(BUILDINGS.quarry.cost.wood);

    // Season 2: the Quarry goes up on wood alone — before the first event card
    // (turn 3) could ever play rescue.
    const before = s;
    s = tryBuild(s, "quarry");
    expect(s).not.toBe(before); // the build was accepted
    expect(s.buildQueue.some((b) => b.building === "quarry")).toBe(true);
    s = reduce(s, { type: "endTurn" });
    expect(buildingCount(s, "quarry")).toBe(1);
    expect(s.log[s.log.length - 1].turn).toBeLessThanOrEqual(2);
  });
});

describe("scenario completability (GDD intended strategies)", () => {
  it("Tutorial Reign: population ≥ 14 within 12 turns", () => {
    const { state, turnGoalMet } = playTutorial();
    expect(state.population).toBeGreaterThanOrEqual(14);
    expect(turnGoalMet).toBeGreaterThan(0);
    expect(turnGoalMet).toBeLessThanOrEqual(12);
    // eslint-disable-next-line no-console
    console.log(`[completability] Tutorial: goal met turn ${turnGoalMet}, final pop ${state.population}`);
  });

  it("Growth Reign: population ≥ 25 within 20 turns", () => {
    const { state, turnGoalMet } = playGrowth();
    expect(state.population).toBeGreaterThanOrEqual(25);
    expect(turnGoalMet).toBeGreaterThan(0);
    expect(turnGoalMet).toBeLessThanOrEqual(20);
    // eslint-disable-next-line no-console
    console.log(`[completability] Growth: goal met turn ${turnGoalMet}, final pop ${state.population}`);
  });

  it("Prosperity Reign: pop ≥ 28 AND gold ≥ 80 AND ≥ 6 research within 24 turns", () => {
    const { state, turnGoalMet } = playProsperity();
    expect(state.population).toBeGreaterThanOrEqual(28);
    expect(state.resources.gold).toBeGreaterThanOrEqual(80);
    expect(state.researched.length).toBeGreaterThanOrEqual(6);
    expect(turnGoalMet).toBeGreaterThan(0);
    expect(turnGoalMet).toBeLessThanOrEqual(24);
    // eslint-disable-next-line no-console
    console.log(
      `[completability] Prosperity: goal met turn ${turnGoalMet}, final pop ${state.population}, gold ${state.resources.gold}, research ${state.researched.length}`,
    );
  });
});
