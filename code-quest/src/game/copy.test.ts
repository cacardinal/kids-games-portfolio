import { describe, it, expect } from "vitest";
import { run } from "./interpreter";
import type { Chip } from "./interpreter";
import { collisionCopy, successCopy, endCopy } from "../data/copy";
import { MISSIONS } from "../data/missions";

let idc = 0;
const c = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION"): Chip => ({ id: `cp${idc++}`, op });

// GDD §6.2 verified collision examples (real programs, real steps).
describe("collision copy matches GDD-verified examples", () => {
  it("M3 driving east without turning -> step 6, east wall", () => {
    const m3 = MISSIONS.find((m) => m.id === 3)!;
    const r = run(m3, [c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("collision");
    const text = collisionCopy(last.tick, last.collisionDir!, last.collisionWall!);
    expect(text).toBe("Collision at step 6. The rover hit the east wall.");
  });

  it("M3 turning south too early -> step 4, south wall", () => {
    const m3 = MISSIONS.find((m) => m.id === 3)!;
    const r = run(m3, [c("RIGHT"), c("MOVE"), c("MOVE"), c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("collision");
    const text = collisionCopy(last.tick, last.collisionDir!, last.collisionWall!);
    expect(text).toBe("Collision at step 4. The rover hit the south wall.");
  });

  it("M4 turning into the ridge early -> step 3, barrier", () => {
    const m4 = MISSIONS.find((m) => m.id === 4)!;
    // MOVE -> (1,0); RIGHT -> S; MOVE -> into the ridge '#' at (1,1) -> barrier collision at step 3.
    const r = run(m4, [c("MOVE"), c("RIGHT"), c("MOVE")]);
    const last = r.trace[r.trace.length - 1];
    expect(last.event).toBe("collision");
    expect(last.collisionWall).toBe("barrier");
    const text = collisionCopy(last.tick, last.collisionDir!, last.collisionWall!);
    expect(text).toBe("Collision at step 3. The rover hit the barrier.");
  });
});

// GDD §6.5 verified end-without-win example (M5, stepping onto goal without collecting).
describe("end-without-win copy matches GDD-verified example", () => {
  it("M5 reaching goal without collecting -> pad shimmered, 1 crystal left", () => {
    const m5 = MISSIONS.find((m) => m.id === 5)!;
    // S . C . G . ; drive straight to goal at (4,0) without ACTION.
    const r = run(m5, [c("MOVE"), c("MOVE"), c("MOVE"), c("MOVE")]);
    expect(r.won).toBe(false);
    expect(r.reachedGoalWithoutWin).toBe(true);
    expect(endCopy(m5, r)).toBe("The pad shimmered, but the mission is not done. 1 crystal still out there.");
  });
});

// §6.3 success citations include the clean-run clause when chips <= par.
describe("success copy", () => {
  it("M1 completion-only with par equal includes the clean-run clause", () => {
    const m1 = MISSIONS.find((m) => m.id === 1)!;
    expect(successCopy(m1, 3)).toBe("Pad reached. Mission complete. Clean run — 3 chips, par 3.");
  });
  it("M11 collect with chips below par", () => {
    const m11 = MISSIONS.find((m) => m.id === 11)!;
    expect(successCopy(m11, 4)).toBe("All samples collected. Mission complete. Clean run — 4 chips, par 6.");
  });
  it("M12 collect-only ring citation", () => {
    const m12 = MISSIONS.find((m) => m.id === 12)!;
    expect(successCopy(m12, 6)).toBe("Circuit complete. Every crystal collected. Clean run — 6 chips, par 6.");
  });
  it("over-par run omits the clean-run clause", () => {
    const m1 = MISSIONS.find((m) => m.id === 1)!;
    expect(successCopy(m1, 5)).toBe("Pad reached. Mission complete.");
  });
});
