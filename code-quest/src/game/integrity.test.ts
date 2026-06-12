import { describe, it, expect } from "vitest";
import { MISSIONS } from "../data/missions";
import type { Op } from "./interpreter";

const SECTOR_OPS: Record<1 | 2 | 3, Op[]> = {
  1: ["MOVE", "LEFT", "RIGHT"],
  2: ["MOVE", "LEFT", "RIGHT", "ACTION"],
  3: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
};

function count(grid: string[], ch: string): number {
  let n = 0;
  for (const row of grid) for (const c of row) if (c === ch) n++;
  return n;
}

describe("mission data integrity", () => {
  it("there are exactly 12 missions with ids 1..12", () => {
    expect(MISSIONS.length).toBe(12);
    expect(MISSIONS.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  for (const m of MISSIONS) {
    describe(`M${m.id} ${m.title}`, () => {
      it("grid is rectangular and within 10x8", () => {
        const w = m.grid[0].length;
        expect(m.grid.every((r) => r.length === w)).toBe(true);
        expect(w).toBeLessThanOrEqual(10);
        expect(m.grid.length).toBeLessThanOrEqual(8);
      });

      it("exactly one start (S)", () => {
        expect(count(m.grid, "S")).toBe(1);
      });

      it("goal count matches reachGoal (M12 has zero G by design)", () => {
        const g = count(m.grid, "G");
        if (m.objectives.reachGoal) {
          expect(g).toBe(1);
        } else {
          expect(g).toBe(0);
        }
      });

      it("collectAll implies >=1 crystal; activateAll implies >=1 beacon", () => {
        if (m.objectives.collectAll) expect(count(m.grid, "C")).toBeGreaterThanOrEqual(1);
        if (m.objectives.activateAll) expect(count(m.grid, "B")).toBeGreaterThanOrEqual(1);
      });

      it("only legal grid characters appear", () => {
        const legal = new Set([".", "#", "C", "B", "G", "S"]);
        for (const row of m.grid) for (const c of row) expect(legal.has(c)).toBe(true);
      });

      it("allowedOps respect sector gating", () => {
        const expected = SECTOR_OPS[m.sector];
        // allowedOps is exactly the sector's op set (order-independent)
        expect([...m.allowedOps].sort()).toEqual([...expected].sort());
        // sector 1 never has ACTION/REPEAT
        if (m.sector === 1) {
          expect(m.allowedOps).not.toContain("ACTION");
          expect(m.allowedOps).not.toContain("REPEAT");
        }
        // sector 2 has ACTION but not REPEAT
        if (m.sector === 2) {
          expect(m.allowedOps).toContain("ACTION");
          expect(m.allowedOps).not.toContain("REPEAT");
        }
        // sector 3 has REPEAT
        if (m.sector === 3) {
          expect(m.allowedOps).toContain("REPEAT");
        }
      });

      it("recorded solutions only use allowedOps", () => {
        const allowed = new Set(m.allowedOps);
        for (const sol of m.solutions) {
          for (const chip of sol) {
            expect(allowed.has(chip.op)).toBe(true);
            if (chip.op === "REPEAT") {
              for (const b of chip.body) {
                expect(allowed.has(b.op)).toBe(true);
                expect(b.op).not.toBe("REPEAT"); // no nesting
              }
            }
          }
        }
      });
    });
  }
});
