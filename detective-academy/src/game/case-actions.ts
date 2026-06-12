// Clearing + accusation validation with specific rejection copy (specs §"Mechanics";
// GDD §5.3 recap, §5.4 rejections). Pure functions over the case + solver.

import { clearsSuspect, consistentSuspects } from "./solver";
import type { AttributeClue, Case, Clue } from "./types";

// ---- Clearing ----

export interface ClearResult {
  ok: boolean;
  reason?: string; // rejection copy when ok === false (GDD §5.4)
}

function clueShortRef(c: Case, clue: Clue): string {
  if (clue.kind === "alibi") {
    const named = c.suspects.find((s) => s.id === clue.clearsSuspectId);
    return `${named?.name ?? "someone"}'s alibi`;
  }
  if (clue.kind === "attribute") {
    return `${clue.dimension} clue`;
  }
  return "that note";
}

function suspectValueOn(c: Case, suspectId: string, dim: "hair" | "accessory" | "pet"): string {
  const s = c.suspects.find((x) => x.id === suspectId)!;
  return dim === "hair" ? s.hair : dim === "accessory" ? s.accessory : s.pet;
}

/**
 * Validate citing `clueId` to clear `suspectId`. Solver-validated. On failure returns
 * the specific reason naming WHY it doesn't clear (GDD §5.4).
 */
export function validateClear(c: Case, suspectId: string, clueId: string): ClearResult {
  const clue = c.clues.find((cl) => cl.id === clueId);
  const suspect = c.suspects.find((s) => s.id === suspectId);
  if (!clue || !suspect) return { ok: false, reason: "That clue isn't in the file." };

  if (clearsSuspect(c, clue, suspectId)) {
    return { ok: true };
  }

  // Failure — pick the precise rejection.
  if (clue.kind === "flavor") {
    return { ok: false, reason: `That clue doesn't place anyone. It can't clear ${suspect.name}.` };
  }
  if (clue.kind === "alibi") {
    const other = c.suspects.find((s) => s.id === clue.clearsSuspectId);
    return {
      ok: false,
      reason: `That statement is about ${other?.name ?? "someone else"}, not ${suspect.name}.`,
    };
  }
  // attribute clue that doesn't clear this suspect
  const attr = clue as AttributeClue;
  const theirValue = suspectValueOn(c, suspectId, attr.dimension);
  if (theirValue === attr.value) {
    // suspect actually matches the detail
    return { ok: false, reason: `${suspect.name} matches that detail, so it doesn't clear them.` };
  }
  // (shouldn't reach here — if value differs, clearsSuspect is true — but keep a safe line)
  return {
    ok: false,
    reason: `That tells us about the culprit, but it doesn't rule ${suspect.name} out.`,
  };
}

// ---- Accusation ----

export interface AccuseResult {
  ok: boolean;
  reason?: string; // rejection copy (GDD §5.4) when ok === false
}

/**
 * Validate an accusation: exactly the culprit + exactly two clues from implicatingClueIds.
 * `clearedIds` lets us produce the "already cleared" rejection line.
 */
export function validateAccusation(
  c: Case,
  suspectId: string,
  clueIds: string[],
  clearedIds: string[],
): AccuseResult {
  const suspect = c.suspects.find((s) => s.id === suspectId);
  if (!suspect) return { ok: false, reason: "Pick a suspect to accuse." };

  if (clueIds.length < 2) {
    return { ok: false, reason: "An accusation needs two clues that point to the same person." };
  }

  const correctSuspect = suspectId === c.culpritId;
  const bothImplicate =
    clueIds.length === 2 && clueIds.every((id) => c.implicatingClueIds.includes(id));

  if (correctSuspect && bothImplicate) {
    return { ok: true };
  }

  // Rejections, most specific first.
  if (!correctSuspect) {
    if (clearedIds.includes(suspectId)) {
      // find a clue that cleared them, for the reference
      const clearer = c.clues.find((cl) => clearsSuspect(c, cl, suspectId));
      const ref = clearer ? clueShortRef(c, clearer) : "the evidence";
      return {
        ok: false,
        reason: `${suspect.name} was already cleared by ${ref}. They couldn't have done it.`,
      };
    }
    return {
      ok: false,
      reason: `The evidence doesn't point to ${suspect.name}. Check who each clue rules out.`,
    };
  }

  // Right suspect, but the two clues don't both implicate.
  return {
    ok: false,
    reason: `Right instinct — but those two clues don't both point to ${suspect.name}. Find the two that do.`,
  };
}

// ---- Recap (GDD §5.3) ----

export interface RecapData {
  lines: string[]; // the deduction chain, plain detective prose
  culpritName: string;
}

// Short justification phrase for an implicating attribute clue, culprit-facing.
function implicatingPhrase(clue: AttributeClue): string {
  const v = clue.value;
  if (clue.dimension === "hair") return `had ${v} hair`;
  if (clue.dimension === "accessory") {
    if (v === "glasses") return "wore glasses";
    return `wore a ${v}`;
  }
  if (v === "none") return "kept no pet";
  return `owns a ${v}`;
}

function implicatingLine(clue: AttributeClue): string {
  const v = clue.value;
  if (clue.dimension === "hair") {
    return `The hair clue meant the culprit had ${v} hair.`;
  }
  if (clue.dimension === "accessory") {
    const w = v === "glasses" ? "glasses" : `a ${v}`;
    return `The ${v === "glasses" ? "glasses" : v} clue meant the culprit wore ${w}.`;
  }
  if (v === "none") return "The pet clue meant the culprit kept no pet.";
  return `The pet clue meant the culprit owns a ${v}.`;
}

/**
 * Build the recap chain from the case + which suspects were cleared (GDD §5.3 template).
 */
export function buildRecap(c: Case, clearedIds: string[]): RecapData {
  const culprit = c.suspects.find((s) => s.id === c.culpritId)!;
  const clearedNames = c.suspects
    .filter((s) => clearedIds.includes(s.id) && s.id !== c.culpritId)
    .map((s) => s.name);

  const lines: string[] = [];

  // Implicating lines first.
  const implicating = c.implicatingClueIds
    .map((id) => c.clues.find((cl) => cl.id === id))
    .filter((cl): cl is AttributeClue => !!cl && cl.kind === "attribute");
  for (const cl of implicating) lines.push(implicatingLine(cl));

  // Alibi lines (for cleared innocents cleared via alibi).
  for (const s of c.suspects) {
    if (s.id === c.culpritId) continue;
    if (!clearedIds.includes(s.id)) continue;
    const alibi = c.clues.find(
      (cl) => cl.kind === "alibi" && cl.clearsSuspectId === s.id,
    );
    if (alibi) lines.push(`The ${s.alibiPlace} alibi put ${s.name} elsewhere.`);
  }

  if (clearedNames.length > 0) {
    lines.push(`That cleared ${joinNames(clearedNames)}.`);
  }

  const just = implicating.map((cl) => implicatingPhrase(cl));
  const justText = just.length >= 2 ? `${just[0]} and ${just[1]}` : just.join(" and ");
  lines.push(`${culprit.name} is the only one left — and ${justText}.`);
  lines.push("Case closed.");

  return { lines, culpritName: culprit.name };
}

function joinNames(names: string[]): string {
  if (names.length === 0) return "no one";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

// Whether ALL innocents are cleared (drives Methodical + accusation readiness display).
export function allInnocentsCleared(c: Case, clearedIds: string[]): boolean {
  return c.suspects
    .filter((s) => s.id !== c.culpritId)
    .every((s) => clearedIds.includes(s.id));
}

// Solver-derived: who is still in play (for UI "remaining" displays).
export function remainingSuspects(c: Case): string[] {
  return consistentSuspects(c);
}
