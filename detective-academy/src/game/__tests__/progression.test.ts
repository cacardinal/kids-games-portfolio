// Progression + actions tests: XP table, ranks, cosmetics, clearing/accusation validation,
// recap. Cross-checks the GDD's worked examples (§2.2) and director amendments.

import { describe, expect, it } from "vitest";
import {
  CARD_STYLES,
  cardStyleForRank,
  computeXp,
  quickStudyThresholdMs,
  rankForXp,
  RANKS,
  unlockedCardStyles,
} from "../progression";
import { generateCase } from "../generator";
import {
  allInnocentsCleared,
  buildRecap,
  validateAccusation,
  validateClear,
} from "../case-actions";

describe("XP — GDD §2.2 worked examples (Fix 6: Methodical +60)", () => {
  it("flawless first tier-1 = 275 (100 + 50 + 40 + 60 + 25)", () => {
    expect(
      computeXp({ tier: 1, firstTry: true, hintFree: true, methodical: true, firstTimeClear: true })
        .total,
    ).toBe(275);
  });
  it("replay tier-1 hint-free + first-try + methodical (no first-time) = 250", () => {
    expect(
      computeXp({ tier: 1, firstTry: true, hintFree: true, methodical: true, firstTimeClear: false })
        .total,
    ).toBe(250);
  });
  it("messy first tier-1 (hints, accused before clearing, one wrong) = 125", () => {
    expect(
      computeXp({ tier: 1, firstTry: false, hintFree: false, methodical: false, firstTimeClear: true })
        .total,
    ).toBe(125);
  });
  it("floor for a closed case is base + 0 bonuses", () => {
    expect(
      computeXp({ tier: 3, firstTry: false, hintFree: false, methodical: false, firstTimeClear: false })
        .total,
    ).toBe(220);
  });

  // Fix 6 intent: methodical must out-earn the straight-to-accuse speedrun on the same
  // case. Speedrun = first-try + hint-free but NOT methodical (accused without clearing).
  it("methodical path out-earns the straight-to-accuse speedrun", () => {
    const speedrun = computeXp({
      tier: 1, firstTry: true, hintFree: true, methodical: false, firstTimeClear: true,
    }).total; // 100 + 50 + 40 + 25 = 215
    const methodicalRun = computeXp({
      tier: 1, firstTry: true, hintFree: true, methodical: true, firstTimeClear: true,
    }).total; // 275
    expect(methodicalRun).toBeGreaterThan(speedrun);
    expect(methodicalRun - speedrun).toBe(60);
  });
});

describe("Ranks — GDD §2.3 thresholds", () => {
  it("maps cumulative XP to the right rank", () => {
    expect(rankForXp(0).id).toBe("cadet");
    expect(rankForXp(249).id).toBe("cadet");
    expect(rankForXp(250).id).toBe("junior");
    expect(rankForXp(799).id).toBe("junior");
    expect(rankForXp(800).id).toBe("detective");
    expect(rankForXp(1800).id).toBe("senior");
    expect(rankForXp(3400).id).toBe("inspector");
    expect(rankForXp(5600).id).toBe("chief");
    expect(rankForXp(99999).id).toBe("chief");
  });
});

describe("Cosmetics — director amendment: 6 cards, one per rank", () => {
  it("has exactly 6 ID-card styles", () => {
    expect(CARD_STYLES).toHaveLength(6);
  });
  it("every rank mints exactly one card", () => {
    for (const r of RANKS) {
      expect(cardStyleForRank(r.id), `rank ${r.id} must mint a card`).toBeDefined();
    }
  });
  it("unlockedCardStyles is cumulative by rank", () => {
    expect(unlockedCardStyles("cadet")).toHaveLength(1);
    expect(unlockedCardStyles("junior")).toHaveLength(2);
    expect(unlockedCardStyles("chief")).toHaveLength(6);
  });
});

describe("Quick Study — director amendment: tier-relative timer", () => {
  it("is 90 / 150 / 210 seconds by tier", () => {
    expect(quickStudyThresholdMs(1)).toBe(90_000);
    expect(quickStudyThresholdMs(2)).toBe(150_000);
    expect(quickStudyThresholdMs(3)).toBe(210_000);
  });
});

describe("Clearing validation + rejection copy", () => {
  const c = generateCase(1);
  const innocent = c.suspects.find((s) => s.id !== c.culpritId)!;

  it("accepts the correct clearing clue", () => {
    // find a clue that actually clears this innocent
    const clue = c.clues.find((cl) => validateClear(c, innocent.id, cl.id).ok);
    expect(clue, "an innocent must have a clearing clue").toBeDefined();
    expect(validateClear(c, innocent.id, clue!.id).ok).toBe(true);
  });

  it("rejects a non-clearing clue with a specific reason", () => {
    const nonClearing = c.clues.find((cl) => !validateClear(c, innocent.id, cl.id).ok);
    if (nonClearing) {
      const r = validateClear(c, innocent.id, nonClearing.id);
      expect(r.ok).toBe(false);
      expect(r.reason).toBeTruthy();
      expect(r.reason).toContain(innocent.name);
    }
  });
});

describe("Accusation validation + rejection copy", () => {
  const c = generateCase(1);

  it("accepts culprit + the two implicating clues", () => {
    const [a, b] = c.implicatingClueIds;
    expect(validateAccusation(c, c.culpritId, [a, b], []).ok).toBe(true);
  });

  it("rejects fewer than two clues", () => {
    const r = validateAccusation(c, c.culpritId, [c.implicatingClueIds[0]], []);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("two clues");
  });

  it("rejects the wrong suspect", () => {
    const innocent = c.suspects.find((s) => s.id !== c.culpritId)!;
    const [a, b] = c.implicatingClueIds;
    const r = validateAccusation(c, innocent.id, [a, b], []);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain(innocent.name);
  });

  it("rejects an already-cleared suspect with the 'already cleared' line", () => {
    const innocent = c.suspects.find((s) => s.id !== c.culpritId)!;
    const [a, b] = c.implicatingClueIds;
    const r = validateAccusation(c, innocent.id, [a, b], [innocent.id]);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("already cleared");
  });

  it("rejects right suspect with non-implicating clues", () => {
    const nonImpl = c.clues.find((cl) => !c.implicatingClueIds.includes(cl.id));
    if (nonImpl) {
      const r = validateAccusation(c, c.culpritId, [c.implicatingClueIds[0], nonImpl.id], []);
      expect(r.ok).toBe(false);
      expect(r.reason).toContain("don't both point");
    }
  });
});

describe("Recap builder", () => {
  it("ends with 'Case closed.' and names the culprit", () => {
    const c = generateCase(1);
    const innocents = c.suspects.filter((s) => s.id !== c.culpritId).map((s) => s.id);
    const recap = buildRecap(c, innocents);
    expect(recap.lines[recap.lines.length - 1]).toBe("Case closed.");
    const culprit = c.suspects.find((s) => s.id === c.culpritId)!;
    expect(recap.culpritName).toBe(culprit.name);
    expect(recap.lines.some((l) => l.includes(culprit.name))).toBe(true);
  });

  it("allInnocentsCleared is true only when every innocent is cleared", () => {
    const c = generateCase(21);
    const innocents = c.suspects.filter((s) => s.id !== c.culpritId).map((s) => s.id);
    expect(allInnocentsCleared(c, [])).toBe(false);
    expect(allInnocentsCleared(c, innocents.slice(0, 1))).toBe(false);
    expect(allInnocentsCleared(c, innocents)).toBe(true);
  });
});
