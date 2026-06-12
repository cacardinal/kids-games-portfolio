// Browser physics runtime: a rAF accumulator that consumes fixed 1000/60 slices (<=4 steps/frame),
// driving the SHARED sim module. StrictMode-safe — create in start(), full teardown in stop().
// Wall-clock never affects physics; the accumulator only decides HOW MANY fixed steps to run.
import { createSim, FIXED_DT, MAX_STEPS, GOAL_HOLD_STEPS, type SimHandle } from "./sim";
import type { Level, Placement } from "./types";

// FIX 4 — early-settle: if every dynamic body's speed stays below this for SETTLE_STEPS consecutive
// steps (and success hasn't fired), the run is called early with a "settled" failure.
const SETTLE_SPEED_EPSILON = 0.35;
const SETTLE_STEPS = 90;

export type RunOutcome =
  | { kind: "success"; step: number }
  | { kind: "fail"; reason: "out-of-bounds" | "timeout" | "settled"; step: number };

// FIX 7 — a brief chalk-dust burst emitted at a meaningful contact point.
export interface DustBurst { x: number; y: number; intensity: number }

export interface RuntimeCallbacks {
  // Called every rendered frame with current body positions so the React layer can paint.
  onFrame: (sim: SimHandle, step: number) => void;
  onImpact?: (kind: "wood" | "wall" | "bouncer", speed: number) => void;
  onDust?: (burst: DustBurst) => void;
  onEnd: (outcome: RunOutcome, trace: { x: number; y: number }[]) => void;
}

export class SimRuntime {
  private sim: SimHandle | null = null;
  private raf = 0;
  private acc = 0;
  private last = 0;
  private step = 0;
  private consecutive = 0;
  private running = false;
  private trace: { x: number; y: number }[] = [];
  private prevSpeeds = new Map<number, number>();
  private settleCount = 0;

  private level: Level;
  private placements: Placement[];
  private cb: RuntimeCallbacks;

  constructor(level: Level, placements: Placement[], cb: RuntimeCallbacks) {
    this.level = level;
    this.placements = placements;
    this.cb = cb;
  }

  start() {
    if (this.running) return;
    this.sim = createSim(this.level, this.placements);
    this.running = true;
    this.acc = 0;
    this.step = 0;
    this.consecutive = 0;
    this.settleCount = 0;
    this.trace = [];
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // FIX 4 — tap-anywhere-to-skip: run the remaining steps synchronously straight to the outcome.
  // (Still the fixed-timestep contract — just no rAF pacing. Determinism is preserved.)
  skip() {
    if (!this.running || !this.sim) return;
    cancelAnimationFrame(this.raf);
    while (this.running) {
      this.advance();
      if (this.step >= MAX_STEPS) break;
    }
  }

  private frame = (now: number) => {
    if (!this.running || !this.sim) return;
    let dt = now - this.last;
    this.last = now;
    if (dt > 100) dt = 100; // tab-switch guard: never simulate a huge backlog
    this.acc += dt;

    let stepsThisFrame = 0;
    while (this.acc >= FIXED_DT && stepsThisFrame < 4) {
      this.acc -= FIXED_DT;
      stepsThisFrame++;
      this.advance();
      if (!this.running) break;
    }

    if (this.running) {
      this.cb.onFrame(this.sim, this.step);
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  // One fixed physics step + success/fail/impact bookkeeping.
  private advance() {
    if (!this.sim) return;
    this.detectImpacts();
    this.sim.step();
    this.step++;

    const hp = this.sim.heroBody.position;
    this.trace.push({ x: hp.x, y: hp.y });

    if (this.sim.isOutOfBounds()) {
      this.finish({ kind: "fail", reason: "out-of-bounds", step: this.step });
      return;
    }
    if (this.sim.heroInGoal()) {
      this.consecutive++;
      if (this.consecutive >= GOAL_HOLD_STEPS) {
        this.finish({ kind: "success", step: this.step });
        return;
      }
    } else {
      this.consecutive = 0;
    }
    // FIX 4 — early-settle: every dynamic body resting (speed < epsilon) for SETTLE_STEPS in a row, with
    // no success, means nothing more will happen. End early with the "settled" failure framing. (Only
    // arms after a short warm-up so the initial at-rest crate/ball don't trip it.)
    if (this.step > 20 && this.allDynamicSettled()) {
      this.settleCount++;
      if (this.settleCount >= SETTLE_STEPS) {
        this.finish({ kind: "fail", reason: "settled", step: this.step });
        return;
      }
    } else {
      this.settleCount = 0;
    }
    if (this.step >= MAX_STEPS) {
      this.finish({ kind: "fail", reason: "timeout", step: this.step });
    }
  }

  private allDynamicSettled(): boolean {
    if (!this.sim) return false;
    for (const b of this.sim.bodies) {
      if (b.isStatic) continue;
      if (Math.hypot(b.velocity.x, b.velocity.y) >= SETTLE_SPEED_EPSILON) return false;
    }
    return true;
  }

  // Approximate impact detection: a dynamic actor whose speed drops sharply this step hit something.
  // Emits an SFX voice + a dust burst (FIX 7) at the body's position.
  private detectImpacts() {
    if (!this.sim) return;
    for (const b of this.sim.bodies) {
      if (b.isStatic) continue;
      const speed = Math.hypot(b.velocity.x, b.velocity.y);
      const prev = this.prevSpeeds.get(b.id) ?? speed;
      if (prev - speed > 2.4 && prev > 3) {
        // Something abrupt happened. Pick a voice by speed.
        this.cb.onImpact?.(prev > 7 ? "wall" : "wood", prev);
        // FIX 7 — chalk-dust burst at the contact point, scaled by the speed lost (the existing heuristic).
        this.cb.onDust?.({ x: b.position.x, y: b.position.y, intensity: Math.min(1, (prev - speed) / 8) });
      }
      this.prevSpeeds.set(b.id, speed);
    }
  }

  private finish(outcome: RunOutcome) {
    this.running = false;
    cancelAnimationFrame(this.raf);
    // Final paint of the resting frame before reporting.
    if (this.sim) this.cb.onFrame(this.sim, this.step);
    this.cb.onEnd(outcome, this.trace);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.sim = null;
    this.prevSpeeds.clear();
  }

  isRunning() {
    return this.running;
  }
}
