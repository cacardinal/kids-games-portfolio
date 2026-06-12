// Constructive, seeded, attempt-capped case generator
// (specs/detective-academy.md §"Case generation"; content from GDD §3).
//
// CONTRACT: This is the load-bearing module. It is CONSTRUCTIVE (it builds a case
// that is correct by construction) and then VERIFIES with the independent solver.
// It MUST NOT share helper code with solver.ts — verification only consumes the
// solver's public functions. All randomness flows from a single mulberry32(caseId)
// stream so Case N is frozen forever (draw order is the spec's frozen contract).

import { mulberry32, randInt } from "../lib/rng";
import {
  ACCESSORY_DIRECT,
  ACCESSORY_LABELS,
  ACCESSORY_TWOSTEP,
  ACCESSORY_VALUES,
  ALIBI_TEMPLATES,
  CRIME_LINES,
  // CASE_TITLES / ITEM_POOL retired from the generator (Fix 1: STORY_SEEDS drives
  // titles + intro item). HAIR_VALUES retired (Fix 4: hair comes from hairForName).
  FLAVOR_TEMPLATES,
  HAIR_DIRECT,
  HAIR_LABELS,
  HAIR_TWOSTEP,
  NAME_POOL,
  PET_DIRECT,
  PET_LABELS,
  PET_NONE,
  PET_TWOSTEP,
  PET_VALUES,
  PLACES,
  SETUP_LINES,
  STORY_SEEDS,
  hairForName,
  labelFor,
  type ClueTemplate,
  type Tier,
} from "../data/content";
import { consistentSuspects } from "./solver";
import type {
  Accessory,
  AttributeClue,
  AttributeDimension,
  Case,
  Clue,
  Hair,
  Pet,
  Place,
  Suspect,
} from "./types";

const ATTEMPT_CAP = 200;

interface TierConfig {
  tier: Tier;
  suspects: number;
}

function tierConfigFor(caseId: number): TierConfig {
  if (caseId <= 10) return { tier: 1, suspects: 3 };
  if (caseId <= 20) return { tier: 2, suspects: 4 };
  return { tier: 3, suspects: 5 };
}

// Fill a template's slots. Unused slots in a given template are simply absent.
function fill(
  template: string,
  slots: { name?: string; place?: Place; value?: string; valueShort?: string; item?: string },
): string {
  let out = template;
  if (slots.name !== undefined) out = out.replaceAll("{name}", slots.name);
  if (slots.place !== undefined) out = out.replaceAll("{place}", slots.place);
  if (slots.value !== undefined) out = out.replaceAll("{value}", slots.value);
  if (slots.valueShort !== undefined) out = out.replaceAll("{valueShort}", slots.valueShort);
  if (slots.item !== undefined) out = out.replaceAll("{item}", slots.item);
  return out;
}

function pickTemplate(rng: () => number, pool: ClueTemplate[], tier: Tier): ClueTemplate {
  const eligible = pool.filter((t) => t.minTier <= tier);
  return eligible[randInt(rng, eligible.length)];
}

function suspectValueOnDim(s: Suspect, dim: AttributeDimension): string {
  if (dim === "hair") return s.hair;
  if (dim === "accessory") return s.accessory;
  return s.pet;
}

// Build the prose for an attribute clue on a dimension/value, honoring twoStep.
// Fix 3: the filled text is always capitalized — some templates start with {value}
// ("glasses was snagged...", "black hair was all over...") which the value label leaves
// lowercase. Capitalizing here is the single guard for every attribute clue.
function attributeText(
  rng: () => number,
  dim: AttributeDimension,
  rawValue: string,
  tier: Tier,
  twoStep: boolean,
  location: Place,
): string {
  const label = labelFor(dim, rawValue);
  const slots = { value: label.value, valueShort: label.valueShort, place: location };

  let pool: ClueTemplate[];
  if (dim === "hair") {
    pool = twoStep ? HAIR_TWOSTEP : HAIR_DIRECT;
  } else if (dim === "accessory") {
    pool = twoStep ? ACCESSORY_TWOSTEP : ACCESSORY_DIRECT;
  } else if (rawValue === "none") {
    pool = PET_NONE;
  } else {
    // Fix 3: pet-appropriate phrasing. Restrict species-specific templates:
    //   P9  ("...walking {value}")    -> dog only (you don't walk a cat or a bird)
    //   P6  ("Birdseed... {value}")   -> bird only
    //   P5  ("{value} hair all over") -> dog/cat only ("a bird hair" reads wrong)
    pool = twoStep ? PET_TWOSTEP : PET_DIRECT;
    if (twoStep) {
      pool = rawValue === "bird"
        ? pool.filter((t) => t.id !== "P5")
        : pool.filter((t) => t.id !== "P6");
    } else if (rawValue !== "dog") {
      pool = pool.filter((t) => t.id !== "P9");
    }
  }

  const t = pickTemplate(rng, pool, tier);
  return capitalizeFirst(fill(t.text, slots));
}

interface BuildAttempt {
  case: Case | null;
}

// One full constructive attempt. Returns a case or null (caller retries under the cap).
function buildOnce(
  caseId: number,
  rng: () => number,
  cfg: TierConfig,
  attemptState: { count: number },
): BuildAttempt {
  const { tier, suspects: nSuspects } = cfg;

  // --- Step 1: sample distinct-named suspects with attribute vectors. ---
  // Distinct names AND distinct full vectors (redraw a suspect if its full vector
  // duplicates another's; all redraws share the one attempt counter).
  const namesShuffled = (() => {
    const arr = NAME_POOL.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  })();
  const names = namesShuffled.slice(0, nSuspects);

  // Fix 1: the case location is the seed's location (woven through title + intro + clues),
  // NOT a free draw.
  const seed = STORY_SEEDS[caseId - 1];
  const location: Place = seed.location;

  const suspects: Suspect[] = [];
  const seenVectors = new Set<string>();
  for (let i = 0; i < nSuspects; i++) {
    // Fix 4: hair is the name's FIXED trait (stable look across every case). Only
    // accessory/pet/alibiPlace are redrawn to keep full vectors distinct.
    const hair: Hair = hairForName(names[i]);
    let accessory: Accessory = ACCESSORY_VALUES[0];
    let pet: Pet = PET_VALUES[0];
    // alibiPlace must differ from the case location (so an alibi genuinely clears).
    let alibiPlace: Place = location;
    let ok = false;
    while (!ok) {
      if (attemptState.count++ >= ATTEMPT_CAP) {
        return { case: null };
      }
      accessory = ACCESSORY_VALUES[randInt(rng, ACCESSORY_VALUES.length)];
      pet = PET_VALUES[randInt(rng, PET_VALUES.length)];
      do {
        alibiPlace = PLACES[randInt(rng, PLACES.length)];
      } while (alibiPlace === location);
      const vec = `${hair}|${accessory}|${pet}`;
      if (!seenVectors.has(vec)) {
        seenVectors.add(vec);
        ok = true;
      }
    }
    suspects.push({ id: `s${i}`, name: names[i], hair, accessory, pet, alibiPlace });
  }

  // --- Step 2: pick culprit. ---
  const culprit = suspects[randInt(rng, suspects.length)];
  const innocents = suspects.filter((s) => s.id !== culprit.id);

  // --- Step 3: constructive elimination plan. ---
  // For each attribute dimension, which innocents does the culprit's value eliminate?
  const dims: AttributeDimension[] = ["hair", "accessory", "pet"];
  const eliminatedBy = (dim: AttributeDimension): Suspect[] => {
    const cv = suspectValueOnDim(culprit, dim);
    return innocents.filter((s) => suspectValueOnDim(s, dim) !== cv);
  };

  // Candidate implicating dimensions: those where the culprit eliminates >= 1 innocent.
  const candidateDims = dims.filter((d) => eliminatedBy(d).length >= 1);
  if (candidateDims.length < 2) {
    // Not enough dimensional spread to mint >= 2 implicating clues. Redraw.
    return { case: null };
  }

  // Choose >= 2 implicating dimensions, seeded. Greedy: shuffle candidates, take >=2,
  // preferring a set that covers as many innocents as possible (so fewer need alibis,
  // and the case feels deduced rather than alibi-heavy). We always take exactly 2 for
  // tiers 1-2; tier 3 may take a 3rd to make room for twoStep variety.
  const dimOrder = (() => {
    const arr = candidateDims.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randInt(rng, i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  })();
  const implicatingDims = dimOrder.slice(0, tier === 3 && dimOrder.length >= 3 ? 3 : 2);

  // tier 3 needs >= 1 twoStep implicating clue. Choose which implicating dim is twoStep.
  const twoStepDimIndex = tier === 3 ? randInt(rng, implicatingDims.length) : -1;

  const clues: Clue[] = [];
  const implicatingClueIds: string[] = [];
  let clueSeq = 0;
  const nextClueId = () => `c${clueSeq++}`;

  // Track which innocents are eliminated by at least one IMPLICATING attribute clue.
  const coveredInnocents = new Set<string>();

  implicatingDims.forEach((dim, idx) => {
    const rawValue = suspectValueOnDim(culprit, dim);
    const twoStep = idx === twoStepDimIndex; // only ever true on tier 3
    const id = nextClueId();
    const text = attributeText(rng, dim, rawValue, tier, twoStep, location);
    const clue: AttributeClue = {
      id,
      kind: "attribute",
      dimension: dim,
      value: rawValue,
      text,
      twoStep,
      loadBearing: true,
    };
    clues.push(clue);
    implicatingClueIds.push(id);
    for (const s of eliminatedBy(dim)) coveredInnocents.add(s.id);
  });

  // For innocents NOT eliminated by an implicating attribute clue, add an alibi clue.
  for (const inn of innocents) {
    if (coveredInnocents.has(inn.id)) continue;
    const t = pickTemplate(rng, ALIBI_TEMPLATES, tier);
    const text = fill(t.text, { name: inn.name, place: inn.alibiPlace });
    clues.push({ id: nextClueId(), kind: "alibi", clearsSuspectId: inn.id, text });
  }

  // --- Step 4: red herrings (Fix 2 — reasoning ramp). ---
  // Tier 2 gets EXACTLY 1 herring (pulled forward from tier 3); tier 3 keeps >= 2.
  // Tier 1 stays herring-free. Herrings never change the consistent set (verified).
  if (tier === 2) {
    addHerrings(rng, clues, nextClueId, culprit, innocents, location, tier, 1);
  } else if (tier === 3) {
    addHerrings(rng, clues, nextClueId, culprit, innocents, location, tier, 2);
  }

  // Shuffle clue presentation order (seeded) so the implicating clues aren't always first.
  shuffleInPlace(rng, clues);

  // Fix 1: intro is woven from the case's story seed — the crime line's {place} is the
  // case location and {item} is the seed item, so the briefing can never name a room or
  // object that the rest of the case contradicts. Title comes from the seed (unique).
  const intro = composeIntro(rng, seed.location, seed.item);
  const title = seed.title;

  const built: Case = {
    id: caseId,
    seed: caseId,
    tier,
    title,
    intro,
    location,
    suspects,
    clues,
    culpritId: culprit.id,
    implicatingClueIds,
  };

  // --- Step 5: verify with the INDEPENDENT solver. ---
  if (!verify(built)) return { case: null };

  return { case: built };
}

// Add `target` red herrings. At tier 3 (target >= 2) the first herring may be a
// loadBearing:false ATTRIBUTE clue whose value eliminates NOBODY new (a "real" clue
// that's still noise), with the remainder pure flavor. At tier 2 (target === 1) we use
// a single pure-flavor herring — simplest, and guaranteed never to touch the consistent
// set. Every herring is pure noise to the solver, so the consistent set is unchanged
// (Step-5 verify enforces this for both tiers).
function addHerrings(
  rng: () => number,
  clues: Clue[],
  nextClueId: () => string,
  culprit: Suspect,
  innocents: Suspect[],
  location: Place,
  tier: Tier,
  target: number,
): void {
  let added = 0;

  // Attribute herring only when we want >= 2 (tier 3): an attribute clue whose value
  // matches the culprit but ALL suspects share it (eliminates nobody -> non-load-bearing).
  if (target >= 2) {
    const allSuspects = [culprit, ...innocents];
    const dimShuffle = shuffleCopy(rng, ["hair", "accessory", "pet"] as AttributeDimension[]);
    for (const dim of dimShuffle) {
      const cv = suspectValueOnDim(culprit, dim);
      const everyoneShares = allSuspects.every((s) => suspectValueOnDim(s, dim) === cv);
      if (everyoneShares) {
        const text = attributeText(rng, dim, cv, tier, false, location);
        const clue: AttributeClue = {
          id: nextClueId(),
          kind: "attribute",
          dimension: dim,
          value: cv,
          text,
          twoStep: false,
          loadBearing: false,
        };
        clues.push(clue);
        added++;
        break;
      }
    }
  }

  // Fill the rest with pure-flavor herrings (guaranteed pure noise).
  const flavorPool = FLAVOR_TEMPLATES.filter((t) => t.minTier <= tier);
  const flavorOrder = shuffleCopy(rng, flavorPool);
  let fi = 0;
  while (added < target) {
    const t = flavorOrder[fi % flavorOrder.length];
    const text = fill(t.text, { place: location });
    clues.push({ id: nextClueId(), kind: "flavor", text });
    added++;
    fi++;
  }
}

// Fix 1: the intro's {place}/{item} are passed in from the case's story seed (NOT drawn
// independently), so the briefing stays coherent with the title and clues. Fix 3: the
// composed sentence is always capitalized — some crime lines begin with {item}
// ("the trophy vanished...") which would otherwise start lowercase.
function composeIntro(rng: () => number, place: Place, item: string): string {
  const crime = CRIME_LINES[randInt(rng, CRIME_LINES.length)];
  const setup = SETUP_LINES[randInt(rng, SETUP_LINES.length)];
  const crimeFilled = fill(crime, { place, item });
  return capitalizeFirst(`${crimeFilled} ${setup}`);
}

// Capitalize the first alphabetic character of a string (leaves the rest untouched).
function capitalizeFirst(s: string): string {
  const i = s.search(/[A-Za-z]/);
  if (i === -1) return s;
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
}

function shuffleInPlace<T>(rng: () => number, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function shuffleCopy<T>(rng: () => number, arr: readonly T[]): T[] {
  const out = arr.slice();
  shuffleInPlace(rng, out);
  return out;
}

// Self-verification using ONLY the independent solver's public API (spec step 5).
function verify(c: Case): boolean {
  // (a) exactly one consistent suspect, and it is the intended culprit.
  const consistent = consistentSuspects(c);
  if (consistent.length !== 1 || consistent[0] !== c.culpritId) return false;

  // (b) >= 2 implicating clues; each matches the culprit and eliminates >= 1 innocent.
  if (c.implicatingClueIds.length < 2) return false;
  const culprit = c.suspects.find((s) => s.id === c.culpritId);
  if (!culprit) return false;
  for (const id of c.implicatingClueIds) {
    const clue = c.clues.find((cl) => cl.id === id);
    if (!clue || clue.kind !== "attribute") return false;
    // matches the culprit
    if (suspectValueOnDim(culprit, clue.dimension) !== clue.value) return false;
    // eliminates >= 1 innocent
    const eliminates = c.suspects.some(
      (s) => s.id !== c.culpritId && suspectValueOnDim(s, clue.dimension) !== clue.value,
    );
    if (!eliminates) return false;
  }

  // (c) per-innocent single-clue eliminability: each innocent ruled out by >= 1 single clue.
  for (const s of c.suspects) {
    if (s.id === c.culpritId) continue;
    const eliminable = c.clues.some((cl) => consistentSuspects(c, [cl.id]).indexOf(s.id) === -1);
    if (!eliminable) return false;
  }

  // (d) >= 1 strictly load-bearing clue: removing it yields >= 2 consistent suspects.
  const allIds = c.clues.map((cl) => cl.id);
  const hasLoadBearing = c.clues.some((cl) => {
    const without = allIds.filter((id) => id !== cl.id);
    return consistentSuspects(c, without).length >= 2;
  });
  if (!hasLoadBearing) return false;

  // (e) red herrings (Fix 2): tier 2 needs >= 1, tier 3 needs >= 2. In BOTH cases,
  // removing ALL herrings must leave the consistent set unchanged (herrings are noise).
  if (c.tier === 2 || c.tier === 3) {
    const herringIds = c.clues
      .filter((cl) => cl.kind === "flavor" || (cl.kind === "attribute" && !cl.loadBearing))
      .map((cl) => cl.id);
    const minHerrings = c.tier === 3 ? 2 : 1;
    if (herringIds.length < minHerrings) return false;
    const nonHerring = allIds.filter((id) => !herringIds.includes(id));
    const before = consistentSuspects(c).slice().sort();
    const after = consistentSuspects(c, nonHerring).slice().sort();
    if (before.length !== after.length || before.some((v, i) => v !== after[i])) return false;
  }

  // (f) tier 3 also requires >= 1 twoStep implicating clue.
  if (c.tier === 3) {
    const hasTwoStep = c.implicatingClueIds.some((id) => {
      const cl = c.clues.find((x) => x.id === id);
      return cl?.kind === "attribute" && cl.twoStep;
    });
    if (!hasTwoStep) return false;
  }

  return true;
}

/**
 * Generate Case N. Deterministic for a given caseId; throws if it cannot build a
 * valid case within the 200-attempt cap (spec: hard cap -> throw).
 */
export function generateCase(caseId: number): Case {
  const cfg = tierConfigFor(caseId);
  const rng = mulberry32(caseId);
  const attemptState = { count: 0 };
  // The whole construction draws from one stream; on a failed attempt we re-enter
  // buildOnce, which continues consuming the SAME stream (so the attempt cap is a
  // true global budget and the result for caseId stays frozen).
  while (attemptState.count < ATTEMPT_CAP) {
    const res = buildOnce(caseId, rng, cfg, attemptState);
    if (res.case) return res.case;
  }
  throw new Error(
    `generateCase(${caseId}): exceeded ${ATTEMPT_CAP}-attempt cap without a valid case`,
  );
}

/** Generate all 30 shipped cases (1..30). */
export function generateAllCases(): Case[] {
  const out: Case[] = [];
  for (let id = 1; id <= 30; id++) out.push(generateCase(id));
  return out;
}

export const TOTAL_CASES = 30;

// Re-export labels for UI use without importing data directly everywhere.
export { ACCESSORY_LABELS, HAIR_LABELS, PET_LABELS };
