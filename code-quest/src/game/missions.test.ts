import { describe, it, expect } from "vitest";
import { run, chipCount } from "./interpreter";
import type { Chip, Mission, SimpleOp } from "./interpreter";
import { MISSIONS } from "../data/missions";

// ---------- Group 4: all 12 missions ----------

describe("missions — every recorded solution wins", () => {
  for (const m of MISSIONS) {
    it(`M${m.id} ${m.title}: all ${m.solutions.length} recorded solution(s) reach win`, () => {
      expect(m.solutions.length).toBeGreaterThanOrEqual(1);
      for (let i = 0; i < m.solutions.length; i++) {
        const r = run(m, m.solutions[i]);
        expect(r.won, `M${m.id} solution[${i}] should win`).toBe(true);
      }
    });
  }
});

describe("missions — solutions[0] chip-count <= par (par is achievable)", () => {
  for (const m of MISSIONS) {
    it(`M${m.id} ${m.title}: sol[0] (${chipCount(m.solutions[0])}) <= par (${m.par})`, () => {
      expect(chipCount(m.solutions[0])).toBeLessThanOrEqual(m.par);
    });
  }
});

describe("missions — recorded win-step matches the GDD hand-trace", () => {
  // GDD §2.1 "wins at step" column.
  const expectedWinStep: Record<number, number> = {
    1: 3, 2: 3, 3: 5, 4: 7, 5: 5, 6: 11, 7: 9, 8: 9, 9: 5, 10: 11, 11: 9, 12: 17,
  };
  for (const m of MISSIONS) {
    it(`M${m.id}: sol[0] wins at step ${expectedWinStep[m.id]}`, () => {
      const r = run(m, m.solutions[0]);
      const last = r.trace[r.trace.length - 1];
      expect(last.event).toBe("win");
      expect(last.tick).toBe(expectedWinStep[m.id]);
    });
  }
});

// ---------- Sector-3 REPEAT-required proof via bounded BFS ----------
// Enumerate every loop-free program (MOVE/LEFT/RIGHT/ACTION) up to length = par, restricted to the
// mission's allowedOps minus REPEAT. Assert NONE wins. Then assert the shortest loop-free winner
// length is strictly greater than par (matches the GDD "loop-free min" column).

function loopFreeOps(m: Mission): SimpleOp[] {
  return m.allowedOps.filter((o): o is SimpleOp => o !== "REPEAT");
}

// Returns the minimal loop-free winning length up to maxLen, or null if none <= maxLen.
function minLoopFreeWin(m: Mission, maxLen: number): number | null {
  const ops = loopFreeOps(m);
  // BFS by program length. Prune branches that have already collided OR already won
  // (a won prefix needs no extension; a collided prefix can never recover).
  type Node = { program: Chip[] };
  let frontier: Node[] = [{ program: [] }];
  let counter = 0;
  for (let len = 1; len <= maxLen; len++) {
    const next: Node[] = [];
    for (const node of frontier) {
      for (const op of ops) {
        const program = [...node.program, { id: `b${counter++}`, op }];
        const r = run(m, program);
        if (r.won) {
          return len; // first winner found at this length
        }
        // Extend only if the run did not collide (collision means dead branch) and we have budget.
        const collided = r.trace.some((t) => t.event === "collision");
        if (!collided && len < maxLen) {
          next.push({ program });
        }
      }
    }
    frontier = next;
  }
  return null;
}

describe("sector 3 — pars are unreachable without REPEAT (bounded BFS over loop-free ops)", () => {
  // GDD §2.1 "loop-free min" column: the shortest loop-free program length.
  const loopFreeMin: Record<number, number> = { 9: 5, 10: 7, 11: 9, 12: 17 };
  const sector3 = MISSIONS.filter((m) => m.sector === 3);

  for (const m of sector3) {
    it(`M${m.id} ${m.title}: NO loop-free program of length <= par (${m.par}) wins`, () => {
      const found = minLoopFreeWin(m, m.par);
      expect(found, `a loop-free win at length <= par would break the REPEAT-required design`).toBeNull();
    });
  }

  // Confirm the loop-free minimum equals the GDD column (search a bit past par).
  // M12's loop-free min is 17, which is a large search; cap its search to keep tests fast but still
  // prove "> par": searching to par+1 (=7) and finding nothing already proves unreachability at par.
  for (const m of sector3) {
    const target = loopFreeMin[m.id];
    // Only verify the exact minimum where the search space is tractable (M9, M10, M11).
    if (m.id === 12) continue;
    it(`M${m.id}: shortest loop-free win is exactly ${target} (> par ${m.par})`, () => {
      const found = minLoopFreeWin(m, target);
      expect(found).toBe(target);
      expect(target).toBeGreaterThan(m.par);
    });
  }

  it("M12: shortest loop-free win exceeds par 6 (search to par+2 finds nothing)", () => {
    const m12 = MISSIONS.find((m) => m.id === 12)!;
    // Searching to length 8 (par+2) with 4 ops is 4^8 ≈ 65k leaves max (pruned heavily by collisions).
    const found = minLoopFreeWin(m12, 8);
    expect(found).toBeNull(); // no loop-free win within 8 chips, so par 6 is provably loop-required
  });
});
