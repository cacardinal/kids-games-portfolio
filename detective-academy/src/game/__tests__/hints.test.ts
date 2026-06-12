// Hint-engine unit tests (spec: "Plus hint-engine unit tests — returns a valid next
// deduction for representative mid-case states"). Deterministic over solver semantics.

import { describe, expect, it } from "vitest";
import { generateAllCases } from "../generator";
import { resolveHint, hintTextForCount } from "../hints";
import { clearsSuspect } from "../solver";
import type { Case } from "../types";

const CASES: Case[] = generateAllCases();

describe("hint engine — fresh state (nothing cleared)", () => {
  it.each(CASES.map((c) => [c.id, c] as const))(
    "case %i points at a clearable innocent with a valid clue",
    (_id, c) => {
      const hint = resolveHint(c, []);
      expect(hint).not.toBeNull();
      // With uncleared innocents present, the first move must be a clear.
      expect(hint!.mode).toBe("clear");
      expect(hint!.focusClueId).toBeDefined();
      expect(hint!.targetSuspectId).toBeDefined();
      // The focused clue genuinely clears the targeted suspect (solver-validated).
      const clue = c.clues.find((cl) => cl.id === hint!.focusClueId)!;
      expect(clearsSuspect(c, clue, hint!.targetSuspectId!)).toBe(true);
      // The targeted suspect is an innocent (not the culprit).
      expect(hint!.targetSuspectId).not.toBe(c.culpritId);
    },
  );
});

describe("hint engine — all innocents cleared -> accusation hint", () => {
  it.each(CASES.map((c) => [c.id, c] as const))("case %i", (_id, c) => {
    const innocents = c.suspects.filter((s) => s.id !== c.culpritId).map((s) => s.id);
    const hint = resolveHint(c, innocents);
    expect(hint).not.toBeNull();
    expect(hint!.mode).toBe("accuse");
    expect(hint!.accuse).toBeDefined();
    expect(hint!.accuse!.culpritId).toBe(c.culpritId);
    // The two suggested clues are both implicating.
    expect(c.implicatingClueIds).toContain(hint!.accuse!.clueIdA);
    expect(c.implicatingClueIds).toContain(hint!.accuse!.clueIdB);
    expect(hint!.accuse!.clueIdA).not.toBe(hint!.accuse!.clueIdB);
  });
});

describe("hint engine — mid-case (one innocent cleared) targets a DIFFERENT uncleared innocent", () => {
  it.each(CASES.filter((c) => c.suspects.length >= 3).map((c) => [c.id, c] as const))(
    "case %i",
    (_id, c) => {
      const innocents = c.suspects.filter((s) => s.id !== c.culpritId);
      const firstCleared = [innocents[0].id];
      const hint = resolveHint(c, firstCleared);
      expect(hint).not.toBeNull();
      if (hint!.mode === "clear") {
        // Must not re-target the already-cleared suspect.
        expect(hint!.targetSuspectId).not.toBe(innocents[0].id);
        const clue = c.clues.find((cl) => cl.id === hint!.focusClueId)!;
        expect(clearsSuspect(c, clue, hint!.targetSuspectId!)).toBe(true);
      } else {
        // tier-1 with only 2 innocents -> after clearing one, the remaining is the
        // last innocent; that's still a clear, never accuse here. So accuse should
        // only appear when zero innocents remain. Guard that.
        expect(innocents.length).toBe(1);
      }
    },
  );
});

describe("hint engine — determinism", () => {
  it.each(CASES.map((c) => [c.id, c] as const))("case %i same state -> same hint", (_id, c) => {
    const a = resolveHint(c, []);
    const b = resolveHint(c, []);
    expect(a).toEqual(b);
  });
});

describe("hint engine — tier escalation text", () => {
  it("returns tier1 for count<=1, tier2 for 2, tier3 for >=3", () => {
    const c = CASES[0];
    const hint = resolveHint(c, [])!;
    expect(hintTextForCount(hint, 1)).toBe(hint.tier1);
    expect(hintTextForCount(hint, 2)).toBe(hint.tier2);
    expect(hintTextForCount(hint, 3)).toBe(hint.tier3);
    expect(hintTextForCount(hint, 5)).toBe(hint.tier3);
    // All three tiers are non-empty prose.
    expect(hint.tier1.length).toBeGreaterThan(0);
    expect(hint.tier2.length).toBeGreaterThan(0);
    expect(hint.tier3.length).toBeGreaterThan(0);
  });
});
