import { describe, it, expect } from "vitest";
import {
  run,
  expand,
  expandedLength,
  chipCount,
  canAppendToLoop,
  REPEAT_BODY_CAP,
  REPEAT_MIN_TIMES,
  REPEAT_MAX_TIMES,
} from "./interpreter";
import type { Chip, Mission } from "./interpreter";

let idc = 0;
const c = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION"): Chip => ({ id: `r${idc++}`, op });
const repeat = (times: 2 | 3 | 4 | 5, body: Array<"MOVE" | "LEFT" | "RIGHT" | "ACTION">): Chip => ({
  id: `r${idc++}`,
  op: "REPEAT",
  times,
  body: body.map((op) => ({ id: `r${idc++}`, op })),
});

function mk(grid: string[], startHeading: Mission["startHeading"], objectives: Mission["objectives"]): Mission {
  return {
    id: 0,
    sector: 3,
    title: "t",
    brief: "",
    grid,
    startHeading,
    objectives,
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: 99,
    solutions: [],
  };
}

describe("REPEAT — expansion order", () => {
  it("body executes in order, repeated times×", () => {
    const program: Chip[] = [repeat(2, ["MOVE", "LEFT"])];
    const cmds = expand(program).map((c) => c.op);
    expect(cmds).toEqual(["MOVE", "LEFT", "MOVE", "LEFT"]);
  });

  it("a literal chip after the loop appends after all iterations", () => {
    const program: Chip[] = [repeat(3, ["MOVE"]), c("ACTION")];
    const cmds = expand(program).map((c) => c.op);
    expect(cmds).toEqual(["MOVE", "MOVE", "MOVE", "ACTION"]);
  });
});

describe("REPEAT — ×n counts (2..5)", () => {
  for (const n of [2, 3, 4, 5] as const) {
    it(`×${n} emits the body n times`, () => {
      const program: Chip[] = [repeat(n, ["MOVE"])];
      expect(expandedLength(program)).toBe(n);
    });
  }
  it("times is bounded to 2..5", () => {
    expect(REPEAT_MIN_TIMES).toBe(2);
    expect(REPEAT_MAX_TIMES).toBe(5);
  });
});

describe("REPEAT — body editing invariants", () => {
  it("body holds up to 6 chips; canAppendToLoop blocks a 7th", () => {
    expect(REPEAT_BODY_CAP).toBe(6);
    const full = repeat(2, ["MOVE", "MOVE", "MOVE", "MOVE", "MOVE", "MOVE"]) as Extract<Chip, { op: "REPEAT" }>;
    expect(full.body.length).toBe(6);
    expect(canAppendToLoop(full, [full])).toBe(false);
    const room = repeat(2, ["MOVE"]) as Extract<Chip, { op: "REPEAT" }>;
    expect(canAppendToLoop(room, [room])).toBe(true);
  });
});

describe("REPEAT — no nesting (depth 1)", () => {
  it("the Chip type permits only simple ops in a body; a runtime nested REPEAT throws on expand", () => {
    // Construct an illegal nested structure by bypassing the type, to prove the runtime guard.
    const illegalBody = [{ id: "x", op: "REPEAT", times: 2, body: [{ id: "y", op: "MOVE" }] }] as unknown as Chip[];
    const illegal = { id: "outer", op: "REPEAT", times: 2, body: illegalBody } as unknown as Chip;
    expect(() => expand([illegal])).toThrow(/Nested REPEAT/);
  });
});

describe("REPEAT — chip-count arithmetic (REPEAT + body each once)", () => {
  it("counts REPEAT(1) + body chips, not the expansion", () => {
    const program: Chip[] = [repeat(5, ["MOVE", "ACTION", "MOVE", "ACTION", "RIGHT"])];
    // 1 REPEAT + 5 body = 6 source chips, regardless of times.
    expect(chipCount(program)).toBe(6);
    // but the expansion is 25 commands at ×5
    expect(expandedLength(program)).toBe(25);
  });

  it("source chip count is independent of times; expansion scales with times", () => {
    const a: Chip[] = [repeat(2, ["MOVE"])];
    const b: Chip[] = [repeat(5, ["MOVE"])];
    expect(chipCount(a)).toBe(chipCount(b)); // both 2 source chips
    expect(expandedLength(b)).toBeGreaterThan(expandedLength(a));
  });
});

describe("REPEAT — runtime trace fires win mid-expansion", () => {
  it("a loop wins on the exact iteration objectives are met, halting the rest", () => {
    // S....G with REPEAT 5x[MOVE]; win at the 5th MOVE (command 5), no trailing commands.
    const m = mk(["S....G"], "E", { reachGoal: true, collectAll: false, activateAll: false });
    const r = run(m, [repeat(5, ["MOVE"])]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("win");
    expect(last.tick).toBe(5);
    expect(r.trace.length).toBe(5);
  });
});
