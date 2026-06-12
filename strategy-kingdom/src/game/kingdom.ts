// Strategy Kingdom — PURE reducer. NO React imports. Fully deterministic + testable.
//
// BINDING turn-resolution order (specs/strategy-kingdom.md §Core model):
//   (1) production  — per building: workers × (base + research bonus)
//   (2) consumption — population × 1 food
//   (3) growth      — surplus > 0 AND population < popCap -> +1; deficit -> food floors 0, growth paused
//   (4) build queue completes (placed previous turn)
//   (5) research    — library RP accrues; active target node completes at its cost
//   (6) every 3rd turn — next event card from the scenario's FIXED deck order becomes pendingChoice
//
// No fail state. Resources floor at 0, never negative. No Math.random anywhere
// (events are fixed-order; growth/production are arithmetic) -> determinism holds.

import {
  BUILDINGS,
  BUILDING_ORDER,
  RESEARCH,
  SCENARIOS,
  BASE_POPCAP,
  POPCAP_PER_HOUSE,
  CENSUS_POPCAP_PER_HOUSE,
  PLOT_COUNT,
  SURVEYING_PLOT_BONUS,
  type BuildingId,
  type ResearchId,
  type ResourceId,
  type ScenarioId,
  type EventCard,
  type EventEffect,
} from "./content";

export interface Resources {
  food: number;
  wood: number;
  stone: number;
  gold: number;
}

export interface KingdomState {
  scenarioId: ScenarioId;
  turn: number; // 1-based
  resources: Resources;
  population: number;
  popCap: number;
  plots: (BuildingId | null)[]; // length 12 (or 13 after Surveying)
  workers: Record<BuildingId, number>;
  researchPoints: number;
  researched: ResearchId[];
  /** The node the player is currently funding (completes when RP >= cost). */
  pendingResearch: ResearchId | null;
  buildQueue: { plot: number; building: BuildingId }[]; // completes next endTurn
  eventIndex: number; // how many cards drawn so far
  pendingChoice: EventCard | null;
  /** Receipt of the most recent event choice — the EXACT deltas applied (after
   *  caps/floors). The UI's resolution line states any modification from it.
   *  Cleared when the next turn resolves. (Absent on pre-receipt saves.) */
  lastResolution: ChoiceResolution | null;
  log: TurnReport[];
  /** True only if every resolved turn so far had a positive food surplus (Full Larder). */
  allTurnsSurplus: boolean;
  /** Set when turn limit reached or all goals met. */
  finished: boolean;
}

// ── TurnReport: the math story. The UI renders display strings FROM this. ──────
export interface ProductionLine {
  building: BuildingId;
  count: number; // number of this building producing (with >=1 worker)
  workers: number;
  base: number; // effective base per worker (with research)
  perWorker: number; // === base (kept explicit for the formula string)
  amount: number; // workers × base, summed across all of this building
  resource: ResourceId | "research";
}
export interface TurnReport {
  turn: number;
  /** Production lines, one per active building TYPE (idle excluded; see idleHands). */
  production: ProductionLine[];
  idleHands: number;
  /** Resource gains from production this turn (food/wood/stone/gold). */
  produced: Resources;
  researchProduced: number;
  /** Food consumed = population at consumption time. */
  consumed: number;
  /** Net food after production - consumption (can be negative; pre-floor). */
  foodNet: number;
  /** "surplus" (>0 and under cap grew pop), "even" (0), "deficit" (<0). */
  foodStatus: "surplus" | "even" | "deficit";
  grew: boolean; // population +1 this turn
  populationAfter: number;
  /** Build completions this turn. */
  completedBuilds: { plot: number; building: BuildingId }[];
  /** Research node completed this turn (if any). */
  completedResearch: ResearchId | null;
  /** Resources floored to 0 this turn (for "larder was bare" copy). */
  flooredResources: ResourceId[];
  /** Event card that entered after this resolution (if any). */
  eventDrawn: EventCard | null;
  /** Snapshot of resources after the whole resolution. */
  resourcesAfter: Resources;
}

export type Action =
  | { type: "assignWorker"; building: BuildingId }
  | { type: "unassignWorker"; building: BuildingId }
  | { type: "build"; plot: number; building: BuildingId }
  | { type: "research"; node: ResearchId }
  | { type: "chooseEvent"; option: 0 | 1 }
  | { type: "endTurn" };

// ── Honest event arithmetic ───────────────────────────────────────────────────
// The EFFECTIVE outcome of an event effect against a given state: what resolution
// would actually apply once floors (resources never go below 0) and the housing
// cap (people fill only up to popCap) are honored. previewEffect() computes it
// WITHOUT mutating; applyEffect() applies exactly this outcome — one computation,
// two callers, so the option button, the resolution line, and the reducer can
// never disagree ("every number shown, every formula honest").
export interface EffectOutcome {
  /** Actual resource deltas (post-floor). e.g. stated −8 food at 3 food → −3. */
  food: number;
  wood: number;
  stone: number;
  gold: number;
  /** Actual research-point delta (post-floor). */
  research: number;
  /** Actual people added (post housing cap). */
  people: number;
  /** Stated newcomers who found no room (housing cap). 0 when none turned away. */
  peopleTurnedAway: number;
  /** Resources whose stated deduction was cut short by the 0 floor. */
  floored: ResourceId[];
  /** True if ANY stated number was modified by a cap or floor. */
  modified: boolean;
}

/** Receipt of a resolved event choice (stored on state by chooseEvent). */
export interface ChoiceResolution {
  cardId: string;
  title: string;
  option: 0 | 1;
  applied: EffectOutcome;
}

/** Pure dry-run of an event effect against the current state. */
export function previewEffect(state: KingdomState, effect: EventEffect): EffectOutcome {
  const out: EffectOutcome = {
    food: 0,
    wood: 0,
    stone: 0,
    gold: 0,
    research: 0,
    people: 0,
    peopleTurnedAway: 0,
    floored: [],
    modified: false,
  };
  const keys: ResourceId[] = ["food", "wood", "stone", "gold"];
  for (const k of keys) {
    const delta = effect[k];
    if (delta === undefined) continue;
    if (state.resources[k] + delta < 0) {
      out[k] = 0 - state.resources[k]; // floor at 0: give only what is held (0 - 0 = +0, never -0)
      out.floored.push(k);
      out.modified = true;
    } else {
      out[k] = delta;
    }
  }
  if (effect.research) {
    if (state.researchPoints + effect.research < 0) {
      out.research = 0 - state.researchPoints;
      out.modified = true;
    } else {
      out.research = effect.research;
    }
  }
  if (effect.people) {
    // People from events fill up to popCap; never exceed it.
    const room = Math.max(0, state.popCap - state.population);
    out.people = Math.min(effect.people, room);
    out.peopleTurnedAway = effect.people - out.people;
    if (out.peopleTurnedAway > 0) out.modified = true;
  }
  return out;
}

// ── Derived helpers (pure) ────────────────────────────────────────────────────

export function houseCount(state: KingdomState): number {
  return state.plots.filter((p) => p === "house").length;
}

export function buildingCount(state: KingdomState, id: BuildingId): number {
  return state.plots.filter((p) => p === id).length;
}

export function plotCount(state: KingdomState): number {
  return PLOT_COUNT + (state.researched.includes("surveying") ? SURVEYING_PLOT_BONUS : 0);
}

export function computePopCap(state: KingdomState): number {
  const perHouse = POPCAP_PER_HOUSE + (state.researched.includes("census") ? CENSUS_POPCAP_PER_HOUSE : 0);
  return BASE_POPCAP + perHouse * houseCount(state);
}

/** Effective base yield per worker for a building, given researched nodes. */
export function effectiveBase(id: BuildingId, researched: ResearchId[]): number {
  const def = BUILDINGS[id];
  let base = def.baseYield;
  const has = (n: ResearchId) => researched.includes(n);
  switch (id) {
    case "farm":
      if (has("irrigation")) base += 1;
      if (has("cropRotation")) base += 1;
      break;
    case "lumberCamp":
      if (has("wheelbarrow")) base += 1;
      break;
    case "quarry":
      if (has("wheelbarrow")) base += 1;
      if (has("masonry")) base += 1;
      break;
    case "market":
      if (has("coinage")) base += 1;
      if (has("guild")) base += 1;
      break;
    case "library":
      if (has("scriptorium")) base += 1;
      break;
    case "house":
      break;
  }
  return base;
}

/** Total worker slots available for a building type across all its plots. */
export function totalSlots(state: KingdomState, id: BuildingId): number {
  return buildingCount(state, id) * BUILDINGS[id].slots;
}

/** Idle hands = population - sum(assigned workers). Never negative. */
export function idleHands(state: KingdomState): number {
  let assigned = 0;
  for (const id of BUILDING_ORDER) assigned += state.workers[id] ?? 0;
  return Math.max(0, state.population - assigned);
}

/** Can the player afford to place this building right now? */
export function canAfford(state: KingdomState, id: BuildingId): boolean {
  const c = BUILDINGS[id].cost;
  return state.resources.wood >= c.wood && state.resources.stone >= c.stone;
}

/** Is this building at its map cap? */
export function atCap(state: KingdomState, id: BuildingId): boolean {
  const max = BUILDINGS[id].max;
  if (max === undefined) return false;
  // Count placed + queued of this type.
  const placed = buildingCount(state, id);
  const queued = state.buildQueue.filter((b) => b.building === id).length;
  return placed + queued >= max;
}

export function goalsMet(state: KingdomState): boolean {
  const g = SCENARIOS[state.scenarioId].goals;
  if (g.population !== undefined && state.population < g.population) return false;
  if (g.gold !== undefined && state.resources.gold < g.gold) return false;
  if (g.research !== undefined && state.researched.length < g.research) return false;
  return true;
}

// ── Initial state ─────────────────────────────────────────────────────────────
export function initialState(scenarioId: ScenarioId): KingdomState {
  // Start state (all scenarios): food 8, wood 8, stone 4, gold 0, pop 6, popCap 8,
  // pre-built 1 Farm + 1 Lumber Camp (plots 0 and 1), no workers assigned yet.
  const plots: (BuildingId | null)[] = new Array(PLOT_COUNT).fill(null);
  plots[0] = "farm";
  plots[1] = "lumberCamp";
  const state: KingdomState = {
    scenarioId,
    turn: 1,
    resources: { food: 8, wood: 8, stone: 4, gold: 0 },
    population: 6,
    popCap: BASE_POPCAP,
    plots,
    workers: { farm: 0, lumberCamp: 0, quarry: 0, market: 0, house: 0, library: 0 },
    researchPoints: 0,
    researched: [],
    pendingResearch: null,
    buildQueue: [],
    eventIndex: 0,
    pendingChoice: null,
    lastResolution: null,
    log: [],
    allTurnsSurplus: true,
    finished: false,
  };
  state.popCap = computePopCap(state);
  return state;
}

// ── Apply an event effect to resources/population (floors at 0). ───────────────
// Applies EXACTLY what previewEffect computes (never re-derives the arithmetic),
// so a dry-run preview and the applied resolution are equal by construction.
function applyEffect(state: KingdomState, effect: EventEffect): EffectOutcome {
  const outcome = previewEffect(state, effect);
  state.resources.food += outcome.food;
  state.resources.wood += outcome.wood;
  state.resources.stone += outcome.stone;
  state.resources.gold += outcome.gold;
  state.researchPoints += outcome.research;
  state.population += outcome.people;
  return outcome;
}

// ── The reducer ───────────────────────────────────────────────────────────────
export function reduce(state: KingdomState, action: Action): KingdomState {
  switch (action.type) {
    case "assignWorker":
      return assignWorker(state, action.building, +1);
    case "unassignWorker":
      return assignWorker(state, action.building, -1);
    case "build":
      return build(state, action.plot, action.building);
    case "research":
      return setResearch(state, action.node);
    case "chooseEvent":
      return chooseEvent(state, action.option);
    case "endTurn":
      return endTurn(state);
    default:
      return state;
  }
}

function clone(state: KingdomState): KingdomState {
  return {
    ...state,
    resources: { ...state.resources },
    plots: [...state.plots],
    workers: { ...state.workers },
    researched: [...state.researched],
    buildQueue: state.buildQueue.map((b) => ({ ...b })),
    log: state.log, // log entries are immutable once pushed; share the array ref until we push
  };
}

function assignWorker(state: KingdomState, id: BuildingId, dir: 1 | -1): KingdomState {
  if (state.finished) return state;
  const next = clone(state);
  const slots = totalSlots(next, id);
  const current = next.workers[id] ?? 0;
  if (dir === 1) {
    if (current >= slots) return state; // all slots full
    if (idleHands(next) <= 0) return state; // no free hands
    next.workers[id] = current + 1;
  } else {
    if (current <= 0) return state;
    next.workers[id] = current - 1;
  }
  return next;
}

function build(state: KingdomState, plot: number, id: BuildingId): KingdomState {
  if (state.finished) return state;
  if (plot < 0 || plot >= plotCount(state)) return state;
  if (state.plots[plot] !== null) return state; // occupied
  if (state.buildQueue.some((b) => b.plot === plot)) return state; // already queued here
  if (!canAfford(state, id)) return state;
  if (atCap(state, id)) return state;
  const next = clone(state);
  const c = BUILDINGS[id].cost;
  next.resources.wood -= c.wood;
  next.resources.stone -= c.stone;
  next.buildQueue = [...next.buildQueue, { plot, building: id }];
  return next;
}

function setResearch(state: KingdomState, node: ResearchId): KingdomState {
  if (state.finished) return state;
  if (state.researched.includes(node)) return state; // already done
  const def = RESEARCH[node];
  if (def.prereq && !state.researched.includes(def.prereq)) return state; // prereq missing
  const next = clone(state);
  next.pendingResearch = node;
  return next;
}

function chooseEvent(state: KingdomState, option: 0 | 1): KingdomState {
  if (!state.pendingChoice) return state;
  const next = clone(state);
  const card = next.pendingChoice!;
  const opt = card.options[option];
  const applied = applyEffect(next, opt.effect);
  next.pendingChoice = null;
  // Record the receipt so the UI's resolution line can state any modification.
  next.lastResolution = { cardId: card.id, title: card.title, option, applied };
  return next;
}

function endTurn(state: KingdomState): KingdomState {
  if (state.finished) return state;
  if (state.pendingChoice) return state; // must resolve event first
  const next = clone(state);
  const scenario = SCENARIOS[next.scenarioId];
  next.lastResolution = null; // the turning season supersedes the choice receipt

  const report: TurnReport = {
    turn: next.turn,
    production: [],
    idleHands: 0,
    produced: { food: 0, wood: 0, stone: 0, gold: 0 },
    researchProduced: 0,
    consumed: 0,
    foodNet: 0,
    foodStatus: "even",
    grew: false,
    populationAfter: next.population,
    completedBuilds: [],
    completedResearch: null,
    flooredResources: [],
    eventDrawn: null,
    resourcesAfter: { ...next.resources },
  };

  // ── (1) PRODUCTION ──────────────────────────────────────────────────────────
  // For each building TYPE with assigned workers, workers × effectiveBase.
  // Workers assigned to a type are distributed across its plots, but the math is
  // pooled (count is informational for the formula line).
  for (const id of BUILDING_ORDER) {
    if (id === "house") continue;
    const workers = next.workers[id] ?? 0;
    if (workers <= 0) continue;
    const count = buildingCount(next, id);
    if (count <= 0) continue; // no building of this type (shouldn't happen if workers>0)
    const base = effectiveBase(id, next.researched);
    const amount = workers * base;
    const def = BUILDINGS[id];
    const resource = def.produces;
    if (resource === "research") {
      next.researchPoints += amount;
      report.researchProduced += amount;
    } else if (resource) {
      next.resources[resource] += amount;
      report.produced[resource] += amount;
    }
    report.production.push({
      building: id,
      count,
      workers,
      base,
      perWorker: base,
      amount,
      resource: resource ?? "food",
    });
  }
  report.idleHands = idleHands(next);

  // ── (2) CONSUMPTION ────────────────────────────────────────────────────────
  const eat = next.population * 1;
  report.consumed = eat;
  // foodNet is computed against THIS turn's food production vs consumption.
  report.foodNet = report.produced.food - eat;
  next.resources.food -= eat;
  if (next.resources.food < 0) {
    next.resources.food = 0;
    report.flooredResources.push("food");
  }

  // ── (3) GROWTH ──────────────────────────────────────────────────────────────
  // surplus = food produced this turn exceeded consumption.
  if (report.foodNet > 0) {
    report.foodStatus = "surplus";
    if (next.population < next.popCap) {
      next.population += 1;
      report.grew = true;
    }
  } else if (report.foodNet === 0) {
    report.foodStatus = "even";
  } else {
    report.foodStatus = "deficit";
    next.allTurnsSurplus = false;
  }
  // "even" or "deficit" both break the Full Larder streak (surplus EVERY turn).
  if (report.foodStatus !== "surplus") {
    next.allTurnsSurplus = false;
  }
  report.populationAfter = next.population;

  // ── (4) BUILD QUEUE COMPLETES ───────────────────────────────────────────────
  if (next.buildQueue.length > 0) {
    for (const b of next.buildQueue) {
      if (next.plots[b.plot] === null) {
        next.plots[b.plot] = b.building;
        report.completedBuilds.push({ plot: b.plot, building: b.building });
      }
    }
    next.buildQueue = [];
    // Houses changed popCap (and Census interacts) — recompute.
    next.popCap = computePopCap(next);
  }

  // ── (5) RESEARCH ────────────────────────────────────────────────────────────
  // RP already accrued in production. Complete the active target if affordable.
  if (next.pendingResearch) {
    const node = next.pendingResearch;
    const def = RESEARCH[node];
    const prereqOk = !def.prereq || next.researched.includes(def.prereq);
    if (prereqOk && next.researchPoints >= def.cost && !next.researched.includes(node)) {
      next.researchPoints -= def.cost;
      next.researched.push(node);
      report.completedResearch = node;
      next.pendingResearch = null;
      // Great Hall grants +1 population immediately on completion (capped by popCap).
      if (node === "greatHall") {
        next.popCap = computePopCap(next);
        if (next.population < next.popCap) next.population += 1;
        report.populationAfter = next.population;
      }
      // Surveying/Census change plot count / popCap — recompute popCap defensively.
      if (node === "surveying" || node === "census") {
        next.popCap = computePopCap(next);
        // Surveying opens a 13th plot slot.
        if (node === "surveying" && next.plots.length < plotCount(next)) {
          while (next.plots.length < plotCount(next)) next.plots.push(null);
        }
      }
    }
  }

  // ── (6) EVENT every 3rd turn ────────────────────────────────────────────────
  // Fires on turns 3,6,9,... using the scenario's FIXED deck order (no shuffle).
  let drawn: EventCard | null = null;
  if (next.turn % 3 === 0) {
    const deck = scenario.deck;
    if (next.eventIndex < deck.length) {
      drawn = deck[next.eventIndex];
      next.eventIndex += 1;
      next.pendingChoice = drawn;
      report.eventDrawn = drawn;
    }
  }

  // ── Finalize report + advance turn ──────────────────────────────────────────
  report.resourcesAfter = { ...next.resources };
  next.log = [...next.log, report];

  // End-of-reign check: goals met (banks early) OR turn limit reached.
  const reachedLimit = next.turn >= scenario.turnLimit;
  if (goalsMet(next) || reachedLimit) {
    next.finished = true;
  }
  // Advance the turn only while the reign continues — a finished reign stays on
  // its last played season, so no surface can ever show "season 13 of 12".
  if (!next.finished) {
    next.turn += 1;
  }

  return next;
}

// ── Scoring ───────────────────────────────────────────────────────────────────
export interface ScoreBreakdown {
  population: number;
  goldFifths: number; // floor(gold / 5)
  researchBonus: number; // nodes × 3
  turnsBonus: number; // turnsRemaining × 2
  fullLarderBonus: number; // 10 or 0
  total: number;
  turnsRemaining: number;
  rank: "steward" | "reeve" | "magistrate" | "monarch";
}

/** turnReached = the turn the reign ended on (the last completed turn). */
export function scoreReign(state: KingdomState): ScoreBreakdown {
  const scenario = SCENARIOS[state.scenarioId];
  // The reign ends the moment goals met or limit hit; the last logged turn is the
  // turn reached. (The log is authoritative even for saves from before the
  // turn-stops-at-finish fix, where state.turn had incremented past it.)
  const turnReached = state.log.length > 0 ? state.log[state.log.length - 1].turn : scenario.turnLimit;
  const turnsRemaining = Math.max(0, scenario.turnLimit - turnReached);
  const population = state.population;
  const goldFifths = Math.floor(state.resources.gold / 5);
  const researchBonus = state.researched.length * 3;
  const turnsBonus = turnsRemaining * 2;
  const fullLarderBonus = state.allTurnsSurplus ? 10 : 0;
  const total = population + goldFifths + researchBonus + turnsBonus + fullLarderBonus;

  const t = scenario.ranks;
  let rank: ScoreBreakdown["rank"] = "steward";
  if (total >= t.monarch) rank = "monarch";
  else if (total >= t.magistrate) rank = "magistrate";
  else if (total >= t.reeve) rank = "reeve";
  // Steward is the floor: reaching reign end always earns at least Steward.

  return {
    population,
    goldFifths,
    researchBonus,
    turnsBonus,
    fullLarderBonus,
    total,
    turnsRemaining,
    rank,
  };
}
