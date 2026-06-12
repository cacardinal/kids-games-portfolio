// Independent brute-force solver (specs/detective-academy.md §"Solver").
//
// CONTRACT: This module MUST NOT share code or helper functions with generator.ts.
// It imports ONLY the data-model types. The whole point is that a shared bug cannot
// mask itself — the generator constructs a case, the solver independently re-derives
// the consistent set, and the generator's self-verification compares them.
//
// Semantics of inconsistency for a single clue against a suspect:
//   - alibi clue: inconsistent iff the clue's clearsSuspectId === suspect.id
//                 (the named suspect was elsewhere and could not be the culprit).
//   - attribute clue: inconsistent iff the suspect's value on the clue's dimension
//                 differs from the clue's value. loadBearing/twoStep are IRRELEVANT
//                 to filtering — a real attribute constraint either way. The `none`
//                 pet value is just another value on the `pet` dimension.
//   - flavor clue: constrains nobody (ignored).

import type {
  AttributeClue,
  AttributeDimension,
  Case,
  Clue,
  Suspect,
} from "./types";

/** The suspect's raw value (as a string) on a given attribute dimension. */
function suspectValueOn(suspect: Suspect, dimension: AttributeDimension): string {
  switch (dimension) {
    case "hair":
      return suspect.hair;
    case "accessory":
      return suspect.accessory;
    case "pet":
      return suspect.pet;
  }
}

/**
 * Is this suspect ruled OUT by this single clue?
 * (true = the clue is inconsistent with the suspect being the culprit.)
 */
function clueRulesOutSuspect(clue: Clue, suspect: Suspect): boolean {
  if (clue.kind === "flavor") return false;
  if (clue.kind === "alibi") return clue.clearsSuspectId === suspect.id;
  // attribute
  const attr = clue as AttributeClue;
  return suspectValueOn(suspect, attr.dimension) !== attr.value;
}

/**
 * Brute-force filter: which suspects are consistent with every clue in scope.
 * If clueIds is omitted, all clues in the case are used; otherwise only the
 * named subset (used by load-bearing / herring-removal tests).
 */
export function consistentSuspects(c: Case, clueIds?: string[]): string[] {
  const clues =
    clueIds === undefined
      ? c.clues
      : c.clues.filter((cl) => clueIds.includes(cl.id));
  const out: string[] = [];
  for (const s of c.suspects) {
    let ok = true;
    for (const cl of clues) {
      if (clueRulesOutSuspect(cl, s)) {
        ok = false;
        break;
      }
    }
    if (ok) out.push(s.id);
  }
  return out;
}

/**
 * Does a single clue clear (rule out) the given suspect? Powers the clearing
 * mechanic and the hint engine. A suspect is "cleared by" a clue when that one
 * clue, on its own, makes them inconsistent with being the culprit.
 */
export function clearsSuspect(
  c: Case,
  clue: Clue,
  suspectId: string,
): boolean {
  const suspect = c.suspects.find((s) => s.id === suspectId);
  if (!suspect) return false;
  return clueRulesOutSuspect(clue, suspect);
}
