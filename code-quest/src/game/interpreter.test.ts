import { describe, it, expect } from "vitest";
import { run, expand, chipCount } from "./interpreter";
import type { Chip, Mission } from "./interpreter";

let idc = 0;
const c = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION"): Chip => ({ id: `t${idc++}`, op });
const repeat = (times: 2 | 3 | 4 | 5, body: Array<"MOVE" | "LEFT" | "RIGHT" | "ACTION">): Chip => ({
  id: `t${idc++}`,
  op: "REPEAT",
  times,
  body: body.map((op) => ({ id: `t${idc++}`, op })),
});

// Minimal mission factory.
function mk(partial: Partial<Mission> & Pick<Mission, "grid" | "startHeading" | "objectives">): Mission {
  return {
    id: partial.id ?? 0,
    sector: partial.sector ?? 1,
    title: partial.title ?? "test",
    brief: partial.brief ?? "",
    grid: partial.grid,
    startHeading: partial.startHeading,
    objectives: partial.objectives,
    allowedOps: partial.allowedOps ?? ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: partial.par ?? 99,
    solutions: partial.solutions ?? [],
  };
}

describe("interpreter — movement", () => {
  it("MOVE advances one tile in heading E", () => {
    const m = mk({ grid: ["S....G"], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const r = run(m, [c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.rover).toEqual({ x: 1, y: 0, heading: "E" });
  });

  it("MOVE advances south when heading S", () => {
    const m = mk({ grid: [".S..", "....", "....", ".G.."], startHeading: "S", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const r = run(m, [c("MOVE")]);
    expect(r.trace[0].rover).toEqual({ x: 1, y: 1, heading: "S" });
  });

  it("MOVE west and north decrement x/y", () => {
    const m = mk({ grid: ["...", ".S.", "..."], startHeading: "W", objectives: { reachGoal: false, collectAll: false, activateAll: false } });
    let r = run(m, [c("MOVE")]);
    expect(r.trace[0].rover).toMatchObject({ x: 0, y: 1 });
    const m2 = mk({ grid: ["...", ".S.", "..."], startHeading: "N", objectives: { reachGoal: false, collectAll: false, activateAll: false } });
    r = run(m2, [c("MOVE")]);
    expect(r.trace[0].rover).toMatchObject({ x: 1, y: 0 });
  });
});

describe("interpreter — rotation", () => {
  // Unreachable goal (walled off) so the run never trivially wins; pure rotations all execute.
  const m = mk({ grid: ["S#G"], startHeading: "N", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
  it("RIGHT rotates CW: N->E->S->W->N", () => {
    const r = run(m, [c("RIGHT"), c("RIGHT"), c("RIGHT"), c("RIGHT")]);
    expect(r.trace.map((t) => t.rover.heading).slice(0, 4)).toEqual(["E", "S", "W", "N"]);
  });
  it("LEFT rotates CCW: N->W->S->E->N", () => {
    const r = run(m, [c("LEFT"), c("LEFT"), c("LEFT"), c("LEFT")]);
    expect(r.trace.map((t) => t.rover.heading).slice(0, 4)).toEqual(["W", "S", "E", "N"]);
  });
});

describe("interpreter — collision + source-chip attribution", () => {
  it("MOVE into edge halts with collision carrying failing chip + tick", () => {
    const m = mk({ grid: ["S.."], startHeading: "W", objectives: { reachGoal: false, collectAll: false, activateAll: false } });
    const bad = c("MOVE");
    const r = run(m, [bad]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("collision");
    expect(last.sourceChipId).toBe(bad.id);
    expect(last.tick).toBe(1);
    expect(last.collisionWall).toBe("edge");
    expect(last.collisionDir).toBe("W");
    expect(r.won).toBe(false);
  });

  it("collision halts at the failing chip; later chips do not execute and rover stays put", () => {
    // S at (0,0) heading E; goal at (2,1) is unreachable while driving straight east, so no trivial win.
    // MOVE -> (1,0); MOVE -> (2,0); 3rd MOVE walks off the east edge -> collision at tick 3.
    const m = mk({ grid: ["S..", "..G"], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const a = c("MOVE"), b = c("MOVE"), cc = c("MOVE"), d = c("MOVE");
    const r = run(m, [a, b, cc, d]);
    const last = r.trace[r.trace.length - 1];
    expect(last.tick).toBe(3);
    expect(last.event).toBe("collision");
    expect(last.sourceChipId).toBe(cc.id); // the THIRD move is the failing chip
    expect(last.collisionDir).toBe("E");
    expect(last.collisionWall).toBe("edge");
    expect(last.rover).toMatchObject({ x: 2, y: 0 }); // last valid tile, not off-grid
    expect(r.trace.length).toBe(3); // 4th chip (d) never executed
    void d;
  });

  it("interior wall collision reports 'barrier'", () => {
    const m = mk({ grid: ["S#."], startHeading: "E", objectives: { reachGoal: false, collectAll: false, activateAll: false } });
    const r = run(m, [c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("collision");
    expect(last.collisionWall).toBe("barrier");
  });
});

describe("interpreter — ACTION semantics", () => {
  it("ACTION on a crystal collects it (event 'collect' when win does not yet fire)", () => {
    // Add a goal beyond the crystal so collecting does NOT instantly win — proves the collect label.
    const m = mk({ grid: ["SC.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: true, activateAll: false } });
    const r = run(m, [c("MOVE"), c("ACTION")]);
    const collect = r.trace.find((t) => t.event === "collect");
    expect(collect).toBeTruthy();
    expect(r.crystalsRemaining).toBe(0); // the crystal was removed
    expect(r.won).toBe(false); // goal not yet reached
  });

  it("ACTION on a beacon activates it (event 'activate' when win does not yet fire)", () => {
    const m = mk({ grid: ["SB.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: true } });
    const r = run(m, [c("MOVE"), c("ACTION")]);
    const act = r.trace.find((t) => t.event === "activate");
    expect(act).toBeTruthy();
    expect(r.beaconsRemaining).toBe(0);
    expect(r.won).toBe(false);
  });

  it("collecting the only crystal completes collectAll and wins instantly that tick", () => {
    const m = mk({ grid: ["SC"], startHeading: "E", objectives: { reachGoal: false, collectAll: true, activateAll: false } });
    const r = run(m, [c("MOVE"), c("ACTION")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("win"); // win label supersedes collect on the completing tick
    expect(r.won).toBe(true);
    expect(r.crystalsRemaining).toBe(0);
  });

  it("ACTION on empty tile is a harmless no-op (flagged, not a collision)", () => {
    // Give an unmet goal objective so the run does not trivially win before the no-op is observable.
    const m = mk({ grid: ["S.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const r = run(m, [c("ACTION")]); // ACTION on the empty start tile
    expect(r.trace[0].noop).toBe(true);
    expect(r.trace[0].event).toBeUndefined();
    expect(r.won).toBe(false);
    expect(r.trace.find((t) => t.event === "collision")).toBeUndefined();
  });
});

describe("interpreter — win evaluation", () => {
  it("win fires instantly the tick objectives are met, even with extra chips after", () => {
    const m = mk({ grid: ["S..G.."], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const r = run(m, [c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("win");
    expect(last.tick).toBe(3); // reaches G at step 3
    expect(r.won).toBe(true);
    expect(r.trace.length).toBe(3); // chips 4,5 never executed
  });

  it("stepping onto goal does NOT win when collect objective is unmet (goal shimmers)", () => {
    // S . C . G  ; reach goal at step 4 without collecting -> no win, end-without-win.
    const m = mk({ grid: ["S.C.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: true, activateAll: false } });
    const r = run(m, [c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE")]);
    expect(r.won).toBe(false);
    expect(r.reachedGoalWithoutWin).toBe(true);
    expect(r.crystalsRemaining).toBe(1);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("end");
  });

  it("goal completes reachGoal only once other objectives already met", () => {
    // collect crystal first, then reach goal -> win at the goal step.
    const m = mk({ grid: ["S.C.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: true, activateAll: false } });
    const r = run(m, [c("MOVE"), c("MOVE"), c("ACTION"), c("MOVE"), c("MOVE")]);
    expect(r.won).toBe(true);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("win");
    expect(last.rover).toMatchObject({ x: 4, y: 0 });
  });
});

describe("interpreter — end without win", () => {
  it("program exhausted without win ends with 'end' event + remaining tallies", () => {
    const m = mk({ grid: ["S.C.."], startHeading: "E", objectives: { reachGoal: false, collectAll: true, activateAll: false } });
    const r = run(m, [c("MOVE")]); // never collects
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("end");
    expect(r.won).toBe(false);
    expect(r.crystalsRemaining).toBe(1);
  });

  it("empty program yields a single end marker at the start tile", () => {
    const m = mk({ grid: ["S.G"], startHeading: "E", objectives: { reachGoal: true, collectAll: false, activateAll: false } });
    const r = run(m, []);
    expect(r.trace.length).toBe(1);
    expect(r.trace[0].event).toBe("end");
    expect(r.trace[0].rover).toEqual({ x: 0, y: 0, heading: "E" });
  });
});

describe("interpreter — REPEAT expansion ids", () => {
  it("expand preserves the source (body) chip id on every emitted command", () => {
    const program: Chip[] = [repeat(3, ["MOVE", "ACTION"])];
    const rp = program[0] as Extract<Chip, { op: "REPEAT" }>;
    const cmds = expand(program);
    expect(cmds.length).toBe(6);
    // body ids repeat in order across iterations
    const ids = cmds.map((c) => c.sourceChipId);
    expect(ids).toEqual([rp.body[0].id, rp.body[1].id, rp.body[0].id, rp.body[1].id, rp.body[0].id, rp.body[1].id]);
  });
});

describe("chipCount arithmetic", () => {
  it("counts a REPEAT chip and each body chip once", () => {
    const program: Chip[] = [c("MOVE"), repeat(4, ["MOVE", "ACTION"]), c("MOVE")];
    // 1 (MOVE) + 1 (REPEAT) + 2 (body) + 1 (MOVE) = 5
    expect(chipCount(program)).toBe(5);
  });
});
