// Verify the browser SimRuntime (rAF accumulator path) produces the SAME outcome as the headless
// runLevel for every level — i.e. the shared sim is truly shared and the accumulator is faithful.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SimRuntime, type RunOutcome } from "../runtime";
import { runLevel } from "../sim";
import { LEVELS } from "../../data/levels";

// Drive rAF + performance.now with a virtual clock so the accumulator advances deterministically.
function driveRuntime(levelIdx: number): Promise<RunOutcome> {
  const level = LEVELS[levelIdx];
  return new Promise((resolve) => {
    let outcome: RunOutcome | null = null;
    const rt = new SimRuntime(level, level.knownSolution, {
      onFrame: () => {},
      onEnd: (o) => {
        outcome = o;
      },
    });
    rt.start();
    // pump frames: each frame advances the virtual clock by 16.7ms (one fixed step worth).
    let guard = 0;
    while (rt.isRunning() && guard < 5000) {
      guard++;
      clock += 1000 / 60;
      const cb = rafQueue.shift();
      if (cb) cb(clock);
      else break;
    }
    rt.stop();
    resolve(outcome ?? { kind: "fail", reason: "timeout", step: 0 });
  });
}

let clock = 0;
let rafQueue: ((t: number) => void)[] = [];

beforeEach(() => {
  clock = 0;
  rafQueue = [];
  vi.stubGlobal("performance", { now: () => clock });
  vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => {
    rafQueue.push(cb);
    return rafQueue.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("browser runtime parity with headless sim", () => {
  for (let i = 0; i < LEVELS.length; i++) {
    it(`L${LEVELS[i].id} ${LEVELS[i].title} succeeds via the rAF runtime`, async () => {
      const headless = runLevel(LEVELS[i], LEVELS[i].knownSolution);
      const browser = await driveRuntime(i);
      expect(browser.kind).toBe("success");
      // Same success step (the accumulator runs exactly one fixed step per virtual frame here).
      if (browser.kind === "success") {
        expect(browser.step).toBe(headless.successStep);
      }
    });
  }
});

// Drive an arbitrary placement list (not just the knownSolution) through the rAF runtime.
function driveCustom(levelIdx: number, placements: typeof LEVELS[number]["knownSolution"]): RunOutcome {
  const level = LEVELS[levelIdx];
  let outcome: RunOutcome | null = null;
  const rt = new SimRuntime(level, placements, { onFrame: () => {}, onEnd: (o) => { outcome = o; } });
  rt.start();
  let guard = 0;
  while (rt.isRunning() && guard < 5000) {
    guard++;
    clock += 1000 / 60;
    const cb = rafQueue.shift();
    if (cb) cb(clock); else break;
  }
  rt.stop();
  return outcome ?? { kind: "fail", reason: "timeout", step: 0 };
}

describe("FIX 4 — early-settle termination", () => {
  it("a build that comes fully to rest ends as 'settled' well before MAX_STEPS", () => {
    // L11 empty (launch): the hammer ball drops the chute and rests on the ground; the crate hero never
    // leaves its pedestal. Everything is at rest, so the run should be called early via the settle
    // detector rather than running the full 1200 steps.
    const l11Idx = LEVELS.findIndex((l) => l.id === 11);
    const o = driveCustom(l11Idx, []);
    expect(o.kind).toBe("fail");
    if (o.kind === "fail") {
      expect(o.reason).toBe("settled");
      expect(o.step).toBeLessThan(700); // settled early, not a 1200-step timeout
    }
  });
});

describe("FIX 4 — tap-to-skip yields the same outcome", () => {
  it("skip() fast-forwards to the identical success step as the paced run", () => {
    // Start a known-good run, immediately skip, and confirm the success step matches the headless sim.
    const level = LEVELS[0];
    let outcome: RunOutcome | null = null;
    const rt = new SimRuntime(level, level.knownSolution, { onFrame: () => {}, onEnd: (o) => { outcome = o; } });
    rt.start();
    rt.skip(); // run all remaining steps synchronously
    rt.stop();
    const headless = runLevel(level, level.knownSolution);
    expect(outcome).not.toBeNull();
    expect(outcome!.kind).toBe("success");
    if (outcome!.kind === "success") expect(outcome!.step).toBe(headless.successStep);
  });
});
