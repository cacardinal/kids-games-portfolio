import { describe, it, expect } from "vitest";
import { initialState, reduce, scoreReign, type KingdomState } from "../kingdom";
import { SCENARIOS } from "../content";

// Group 8 — Completed-reign persistence, resume-block, and legacy-save migration.
// These tests operate entirely on the pure game layer (kingdom.ts) and the store
// logic ported here as plain functions, keeping them React-free and fast.

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Drive a reign to finished state with minimal actions (3 workers on farm, endTurn
 *  loop until finished, resolve any events with option 1 to stay gold-safe). */
function runToFinished(scenarioId: "tutorial" | "growth" | "prosperity"): KingdomState {
  let s = initialState(scenarioId);
  // Assign 3 farm workers once (enough surplus to avoid starvation through 12 turns).
  for (let i = 0; i < 3; i++) s = reduce(s, { type: "assignWorker", building: "farm" });
  const limit = SCENARIOS[scenarioId].turnLimit + 5; // safety ceiling
  let guard = 0;
  while (!s.finished && guard++ < limit) {
    if (s.pendingChoice) {
      s = reduce(s, { type: "chooseEvent", option: 1 }); // gold side, never costs food
    } else {
      s = reduce(s, { type: "endTurn" });
    }
  }
  return s;
}

// Minimal stub of the store's completed-reign migration logic (extracted from
// store.ts pickProfile so it can be unit-tested without React/Zustand).
interface CompletedRecord {
  rank: ReturnType<typeof scoreReign>["rank"];
  seasons: number;
  state: KingdomState;
}

function migrateLegacySave(activeReign: KingdomState | null): {
  activeReign: KingdomState | null;
  completedReigns: Record<string, CompletedRecord>;
} {
  const completedReigns: Record<string, CompletedRecord> = {};
  if (activeReign && activeReign.finished) {
    const score = scoreReign(activeReign);
    completedReigns[activeReign.scenarioId] = {
      rank: score.rank,
      seasons: activeReign.log.length,
      state: activeReign,
    };
    return { activeReign: null, completedReigns };
  }
  return { activeReign, completedReigns };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("completion persists on reign end", () => {
  it("a finished Tutorial reign carries finished=true and a non-empty log", () => {
    const s = runToFinished("tutorial");
    expect(s.finished).toBe(true);
    expect(s.log.length).toBeGreaterThan(0);
    expect(s.log.length).toBeLessThanOrEqual(SCENARIOS.tutorial.turnLimit);
  });

  it("scoreReign on a finished reign returns a rank and a positive total", () => {
    const s = runToFinished("tutorial");
    const score = scoreReign(s);
    expect(score.rank).toBeDefined();
    expect(["steward", "reeve", "magistrate", "monarch"]).toContain(score.rank);
    expect(score.total).toBeGreaterThan(0);
  });

  it("a CompletedRecord assembled from a finished reign has the correct seasons count", () => {
    const s = runToFinished("tutorial");
    const score = scoreReign(s);
    const record: CompletedRecord = {
      rank: score.rank,
      seasons: s.log.length,
      state: s,
    };
    expect(record.seasons).toBe(s.log.length);
    expect(record.state.finished).toBe(true);
  });

  it("scoring a stored CompletedRecord.state is idempotent (same score twice)", () => {
    const s = runToFinished("tutorial");
    const score = scoreReign(s);
    const record: CompletedRecord = { rank: score.rank, seasons: s.log.length, state: s };
    const scoreAgain = scoreReign(record.state);
    expect(scoreAgain).toEqual(score);
  });
});

describe("resume blocked on a finished reign", () => {
  it("endTurn is a no-op on a finished state (reducer blocks re-entry)", () => {
    const s = runToFinished("tutorial");
    expect(s.finished).toBe(true);
    const sAfter = reduce(s, { type: "endTurn" });
    // Reducer returns the same reference when the action is blocked.
    expect(sAfter).toBe(s);
  });

  it("assignWorker is a no-op on a finished state", () => {
    const s = runToFinished("tutorial");
    const sAfter = reduce(s, { type: "assignWorker", building: "farm" });
    expect(sAfter).toBe(s);
  });

  it("build is a no-op on a finished state", () => {
    const s = runToFinished("tutorial");
    const emptyPlot = s.plots.findIndex((p) => p === null);
    if (emptyPlot < 0) return; // no empty plot: skip (edge case with no plots left)
    const sAfter = reduce(s, { type: "build", plot: emptyPlot, building: "house" });
    expect(sAfter).toBe(s);
  });
});

describe("legacy-save migration", () => {
  it("a finished activeReign is migrated to completedReigns and activeReign is cleared", () => {
    const finishedReign = runToFinished("tutorial");
    const result = migrateLegacySave(finishedReign);
    expect(result.activeReign).toBeNull();
    expect(result.completedReigns["tutorial"]).toBeDefined();
    expect(result.completedReigns["tutorial"].state.finished).toBe(true);
  });

  it("migration preserves the rank from scoreReign", () => {
    const finishedReign = runToFinished("tutorial");
    const score = scoreReign(finishedReign);
    const result = migrateLegacySave(finishedReign);
    expect(result.completedReigns["tutorial"].rank).toBe(score.rank);
  });

  it("migration preserves the seasons count (log length)", () => {
    const finishedReign = runToFinished("tutorial");
    const result = migrateLegacySave(finishedReign);
    expect(result.completedReigns["tutorial"].seasons).toBe(finishedReign.log.length);
  });

  it("a non-finished activeReign is NOT migrated (normal in-progress save)", () => {
    const s = initialState("tutorial");
    // Advance one turn — not finished.
    const oneStep = reduce(s, { type: "endTurn" });
    expect(oneStep.finished).toBe(false);
    const result = migrateLegacySave(oneStep);
    expect(result.activeReign).toBe(oneStep); // unchanged
    expect(Object.keys(result.completedReigns)).toHaveLength(0);
  });

  it("a null activeReign is a no-op (fresh save)", () => {
    const result = migrateLegacySave(null);
    expect(result.activeReign).toBeNull();
    expect(Object.keys(result.completedReigns)).toHaveLength(0);
  });
});
