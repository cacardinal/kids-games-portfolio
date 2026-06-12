// Display-string derivation — "the visible math is the product."
// These functions turn the reducer's state and TurnReport into the EXACT strings
// the UI renders. The per-worker base always comes from effectiveBase() (the same
// function the reducer uses), so the projection on the resource bar and the ledger
// rows after END TURN are guaranteed to agree with what the reducer applies.
import {
  BUILDING_ORDER,
  BUILDINGS,
  SCENARIOS,
  seasonForTurn,
  type BuildingId,
  type ResourceId,
  type EventOption,
  type EventEffect,
} from "./content";
import {
  effectiveBase,
  buildingCount,
  idleHands,
  previewEffect,
  type KingdomState,
  type TurnReport,
  type ProductionLine,
  type ChoiceResolution,
} from "./kingdom";

export interface ResourceProjection {
  resource: ResourceId | "research";
  /** Per active building line: "Farm  3 × 3 = 9". */
  lines: { label: string; formula: string; amount: number }[];
  produced: number; // total produced next turn from current workers
  consumed: number; // food only; 0 for others
  net: number; // produced - consumed
  netLabel: string; // e.g. "+3 surplus" / "even" / "needs 2 more"
}

const RES_LABEL: Record<ResourceId | "research", string> = {
  food: "Food",
  wood: "Wood",
  stone: "Stone",
  gold: "Gold",
  research: "Research",
};

/** Which building feeds which resource (for the projection grouping). */
function buildingsFor(resource: ResourceId | "research"): BuildingId[] {
  return BUILDING_ORDER.filter((id) => BUILDINGS[id].produces === resource);
}

/** Project next turn's production for one resource from the CURRENT worker layout.
 *  Uses effectiveBase() — identical to the reducer's production phase. */
export function projectResource(state: KingdomState, resource: ResourceId | "research"): ResourceProjection {
  const lines: ResourceProjection["lines"] = [];
  let produced = 0;
  for (const id of buildingsFor(resource)) {
    const workers = state.workers[id] ?? 0;
    const count = buildingCount(state, id);
    if (count <= 0) continue;
    const base = effectiveBase(id, state.researched);
    const amount = workers * base;
    produced += amount;
    if (workers > 0) {
      lines.push({
        label: BUILDINGS[id].label,
        formula: `${workers} × ${base} = ${amount}`,
        amount,
      });
    }
  }
  const consumed = resource === "food" ? state.population : 0;
  const net = produced - consumed;
  let netLabel = "";
  if (resource === "food") {
    if (net > 0) netLabel = `+${net} surplus`;
    else if (net === 0) netLabel = "even, no growth";
    else netLabel = `need ${-net} more food`;
  }
  return { resource, lines, produced, consumed, net, netLabel };
}

/** Short delta string for the resource bar chip (projected next-turn change). */
export function resourceDelta(
  state: KingdomState,
  resource: ResourceId | "research",
): { text: string; dir: "up" | "down" | "flat" } {
  const p = projectResource(state, resource);
  if (resource === "food") {
    if (p.net > 0) return { text: `+${p.net}/turn`, dir: "up" };
    if (p.net < 0) return { text: `${p.net}/turn`, dir: "down" };
    return { text: "even", dir: "flat" };
  }
  if (p.produced > 0) return { text: `+${p.produced}/turn`, dir: "up" };
  return { text: "+0/turn", dir: "flat" };
}

/** The food formula trio for the Counsel/help line and food popover, e.g.
 *  "Farm: 3 × 3 = 9 food", "6 people eat 6", "Surplus 3. Your kingdom grows." */
export function foodFormulaLines(state: KingdomState): string[] {
  const p = projectResource(state, "food");
  const out: string[] = [];
  for (const l of p.lines) out.push(`${l.label}: ${l.formula} food`);
  if (p.lines.length === 0) out.push("No farmers yet: 0 food");
  out.push(`${state.population} people eat ${state.population}`);
  if (p.net > 0) out.push(`Surplus ${p.net}. Your kingdom grows.`);
  else if (p.net === 0) out.push("Even. No growth this season.");
  else out.push("The kingdom waits. More food first.");
  return out;
}

// ── Ledger rows for the END TURN sequence — built directly FROM the TurnReport ──
export interface LedgerRow {
  kind: "production" | "idle" | "consume" | "net" | "build" | "research";
  label: string;
  formula: string;
  amount: string;
  resource?: ResourceId | "research";
}

function resourceWord(r: ResourceId | "research"): string {
  return r === "research" ? "research" : r;
}

/** Turn a ProductionLine into its ledger string ("Farm  3 × 3 = +9 food"). */
function prodRow(line: ProductionLine): LedgerRow {
  return {
    kind: "production",
    label: BUILDINGS[line.building].label,
    formula: `${line.workers} × ${line.base}`,
    amount: `+${line.amount} ${resourceWord(line.resource)}`,
    resource: line.resource,
  };
}

/** Build the full ordered list of ledger rows for a resolved turn. */
export function ledgerRows(report: TurnReport): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const line of report.production) rows.push(prodRow(line));
  if (report.idleHands > 0) {
    rows.push({ kind: "idle", label: "Idle", formula: `${report.idleHands} hands`, amount: "+0" });
  }
  // Consumption
  rows.push({
    kind: "consume",
    label: "People",
    formula: `${report.consumed} eat`,
    amount: `−${report.consumed} food`,
    resource: "food",
  });
  // Net + growth
  if (report.foodStatus === "surplus") {
    rows.push({
      kind: "net",
      label: "Surplus",
      formula: report.grew ? "your kingdom grows" : "at the cap",
      amount: `+${report.foodNet}`,
    });
  } else if (report.foodStatus === "even") {
    rows.push({ kind: "net", label: "Even", formula: "no growth this season", amount: "0" });
  } else {
    rows.push({
      kind: "net",
      label: "Waiting",
      formula: "more food first",
      amount: report.flooredResources.includes("food") ? "0 food" : `${report.foodNet}`,
    });
  }
  // Build completions
  for (const b of report.completedBuilds) {
    rows.push({
      kind: "build",
      label: "Built",
      formula: BUILDINGS[b.building].label,
      amount: "ready",
    });
  }
  // Research completion
  if (report.completedResearch) {
    rows.push({
      kind: "research",
      label: "Discovered",
      formula: report.completedResearch,
      amount: "sealed",
    });
  }
  return rows;
}

// ── Honest event-option labels ──────────────────────────────────────────────
// An option button must show the EFFECTIVE outcome at the moment of choice. The
// numbers come from previewEffect() — the exact computation chooseEvent applies —
// so the button can never promise what resolution won't deliver.

export interface HonestOptionLabel {
  text: string;
  /** True when caps/floors changed the stated numbers (text shows the effective outcome). */
  modified: boolean;
}

function peoplePiece(got: number, turnedAway: number): string {
  const word = got === 1 ? "person" : "people";
  if (turnedAway <= 0) return `+${got} ${word}`;
  if (got === 0) return "+0 people (houses full)";
  return `+${got} ${word} (only room for ${got})`;
}

const FLOOR_PLACE: Record<ResourceId | "research", string> = {
  food: "larder",
  wood: "stores",
  stone: "stores",
  gold: "treasury",
  research: "library",
};

/** Render an event option honestly: the authored label verbatim when nothing
 *  would be modified, or the effective numbers (with the cap/floor named) when
 *  caps or floors would change the outcome right now. */
export function effectiveOptionLabel(state: KingdomState, option: EventOption): HonestOptionLabel {
  const outcome = previewEffect(state, option.effect);
  if (!outcome.modified) return { text: option.label, modified: false };

  const colon = option.label.indexOf(":");
  const verb = colon >= 0 ? option.label.slice(0, colon) : option.label;
  const pieces: string[] = [];
  // Effect keys are authored in the same order as the printed label.
  for (const key of Object.keys(option.effect) as (keyof EventEffect)[]) {
    const stated = option.effect[key];
    if (stated === undefined || stated === 0) continue;
    if (key === "people") {
      pieces.push(peoplePiece(outcome.people, outcome.peopleTurnedAway));
      continue;
    }
    const word = key === "research" ? "research" : key;
    const actual = key === "research" ? outcome.research : outcome[key as ResourceId];
    if (stated > 0) {
      pieces.push(`+${actual} ${word}`);
    } else if (actual === stated) {
      pieces.push(`−${-stated} ${word}`);
    } else {
      // Floored: charge only what is held, and say why.
      pieces.push(actual === 0 ? `−0 ${word} (none left)` : `−${-actual} ${word} (all you have)`);
    }
  }
  return { text: `${verb}: ${pieces.join(" · ")}`, modified: true };
}

/** Resolution lines for a resolved choice — one per modification, empty when the
 *  choice applied exactly as printed. ("Houses full — no room for travelers.") */
export function resolutionNoteLines(resolution: ChoiceResolution): string[] {
  const a = resolution.applied;
  const lines: string[] = [];
  if (a.peopleTurnedAway > 0) {
    lines.push(
      a.people === 0
        ? "Houses full — no room for travelers."
        : `Houses full — only ${a.people} ${a.people === 1 ? "person" : "people"} found room.`,
    );
  }
  for (const k of a.floored) {
    const gave = -a[k];
    lines.push(
      gave === 0
        ? `The ${FLOOR_PLACE[k]} was already bare — it stayed at zero.`
        : `The ${FLOOR_PLACE[k]} gave all it had — ${gave} ${k}.`,
    );
  }
  return lines;
}

/** Turn indicator string: "Season 3, fall". */
export function turnIndicator(turn: number): string {
  return `Season ${turn}, ${seasonForTurn(turn)}`;
}

/** The season number shown to the player. A finished reign stays clamped at its
 *  last played season (from the log) — never an out-of-range counter — which
 *  also covers saves made before the reducer stopped incrementing past the limit. */
export function displaySeason(state: KingdomState): number {
  if (state.finished && state.log.length > 0) {
    return state.log[state.log.length - 1].turn;
  }
  return Math.min(state.turn, SCENARIOS[state.scenarioId].turnLimit);
}

/** Idle hands label for the board. */
export function idleLabel(state: KingdomState): string {
  return `Idle: ${idleHands(state)} hands`;
}

export { RES_LABEL };
