// Deterministic hint engine (specs §"Hints"; GDD §2.4, §5.5).
// Computes the highest-value UNMADE deduction from current state over solver semantics.
// Same state always yields the same hint (deterministic, no randomness).

import type { AttributeClue, Case, Clue } from "./types";

export type HintTier = 1 | 2 | 3;

export interface HintResult {
  // The clue the player should focus on (if a clear is the next move), else undefined
  // when the next move is the accusation.
  focusClueId?: string;
  // For "accusation" hints, the culprit + the two clue ids to use.
  accuse?: { culpritId: string; clueIdA: string; clueIdB: string };
  // Copy for each tier (filled per GDD §5.5). The UI shows tier 1 first, then 2, then 3.
  tier1: string;
  tier2: string;
  tier3: string;
  // The suspect this hint is about (for clear hints), for UI scroll/targeting.
  targetSuspectId?: string;
  // Whether the next move is a clear or the accusation.
  mode: "clear" | "accuse";
}

const DIM_LABEL: Record<"hair" | "accessory" | "pet", string> = {
  hair: "hair",
  accessory: "accessory",
  pet: "pet",
};

// Human label for an attribute value as it appears in hint prose.
function valueLabel(clue: AttributeClue): string {
  // The clue.value is the raw value; we mirror the data label map minimally here so
  // hints read naturally. (Kept tiny + local; not shared with the generator's path.)
  const v = clue.value;
  if (clue.dimension === "hair") return `${v} hair`;
  if (clue.dimension === "accessory") {
    if (v === "glasses") return "glasses";
    return `a ${v}`;
  }
  if (v === "none") return "no pet";
  return `a ${v}`;
}

function suspectValueOn(c: Case, suspectId: string, dim: "hair" | "accessory" | "pet"): string {
  const s = c.suspects.find((x) => x.id === suspectId)!;
  return dim === "hair" ? s.hair : dim === "accessory" ? s.accessory : s.pet;
}

function clueShort(c: Case, clueId: string): string {
  const clue = c.clues.find((cl) => cl.id === clueId);
  if (!clue) return "that clue";
  if (clue.kind === "alibi") {
    const named = c.suspects.find((s) => s.id === clue.clearsSuspectId);
    return `${named?.name ?? "someone"}'s alibi`;
  }
  if (clue.kind === "attribute") {
    return `${DIM_LABEL[clue.dimension]} clue`;
  }
  return "that note";
}

/**
 * Resolve the best next hint for the current state.
 * `clearedIds` = suspects the player has already cleared.
 * Returns null only if the case is degenerate (should never happen for shipped cases).
 */
export function resolveHint(c: Case, clearedIds: string[]): HintResult | null {
  const cleared = new Set(clearedIds);
  const culprit = c.suspects.find((s) => s.id === c.culpritId);
  if (!culprit) return null;

  // Uncleared innocents, in stable suspect order (deterministic).
  const unclearedInnocents = c.suspects.filter(
    (s) => s.id !== c.culpritId && !cleared.has(s.id),
  );

  if (unclearedInnocents.length > 0) {
    // Pick the first uncleared innocent (stable order) and the single clue that clears them.
    const target = unclearedInnocents[0];
    const clearingClue = findClearingClue(c, target.id);
    if (!clearingClue) {
      // Should not happen (Group 2 guarantees eliminability); fall through to accuse.
    } else {
      return buildClearHint(c, target.id, clearingClue);
    }
  }

  // All innocents cleared (or none clearable) -> point at the accusation.
  const [clueIdA, clueIdB] = c.implicatingClueIds.slice(0, 2);
  return {
    mode: "accuse",
    accuse: { culpritId: c.culpritId, clueIdA, clueIdB },
    tier1:
      "Everyone but one is cleared. You're ready to accuse — find the two clues that point to them.",
    tier2: `${culprit.name} is the only suspect left. Two clues point straight at them.`,
    tier3: `It's ${culprit.name}. Accuse them with the ${clueShort(c, clueIdA)} and the ${clueShort(
      c,
      clueIdB,
    )}.`,
  };
}

// The single clue that clears `suspectId`. Prefer an alibi naming them; else the
// implicating attribute clue they fail to match (deterministic: first in clue order).
function findClearingClue(c: Case, suspectId: string): Clue | undefined {
  // Alibi naming them takes priority (clearest to read).
  const alibi = c.clues.find(
    (cl) => cl.kind === "alibi" && cl.clearsSuspectId === suspectId,
  );
  if (alibi) return alibi;
  // Else an attribute clue whose value differs from theirs (single-clue eliminating).
  return c.clues.find((cl) => {
    if (cl.kind !== "attribute") return false;
    return suspectValueOn(c, suspectId, cl.dimension) !== cl.value;
  });
}

function buildClearHint(c: Case, suspectId: string, clue: Clue): HintResult {
  const target = c.suspects.find((s) => s.id === suspectId)!;
  if (clue.kind === "alibi") {
    return {
      mode: "clear",
      focusClueId: clue.id,
      targetSuspectId: suspectId,
      tier1: "An alibi in the evidence clears one of your suspects. Find it.",
      tier2: `This statement places ${target.name} somewhere else. That clears ${target.name}.`,
      tier3: `${target.name} was in the ${target.alibiPlace} the whole time, so ${target.name} couldn't have done it. Clear them.`,
    };
  }
  // attribute clue
  const attr = clue as AttributeClue;
  const theirValue = suspectValueOn(c, suspectId, attr.dimension);
  const theirLabel =
    attr.dimension === "hair"
      ? `${theirValue} hair`
      : attr.dimension === "accessory"
        ? theirValue === "glasses"
          ? "glasses"
          : `a ${theirValue}`
        : theirValue === "none"
          ? "no pet"
          : `a ${theirValue}`;
  return {
    mode: "clear",
    focusClueId: clue.id,
    targetSuspectId: suspectId,
    tier1: `Look at the ${DIM_LABEL[attr.dimension]} clues. One of them rules someone out.`,
    tier2: "This clue is the one. Read it again — who can't match it?",
    tier3: `The culprit has ${valueLabel(attr)}. ${target.name} has ${theirLabel}, so ${target.name} is cleared.`,
  };
}

/** Convenience: the hint text for a given (1-based) hint count, clamped to tier 3. */
export function hintTextForCount(result: HintResult, count: number): string {
  if (count <= 1) return result.tier1;
  if (count === 2) return result.tier2;
  return result.tier3;
}
