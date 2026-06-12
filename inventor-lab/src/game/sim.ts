// Deterministic physics simulation — the BINDING technical contract of Inventor Lab.
// One module shared by the browser loop (rAF accumulator) and the headless tests (plain loop).
// Wall-clock NEVER affects physics. Fixed timestep Engine.update(engine, 1000/60) only.
//
// Import ONLY engine modules — never Render, Runner, Mouse, MouseConstraint.
import { Engine, Composite, Bodies, Body, type Vector } from "matter-js";
import type { Level, Placement, TerrainBlock, Actor, PartKind } from "./types";

// ---- World constants (fixed) -------------------------------------------------
export const WORLD_W = 1280;
export const WORLD_H = 720;
export const FIXED_DT = 1000 / 60; // ms per step
export const MAX_STEPS = 1200;
export const GOAL_HOLD_STEPS = 30;

// Out-of-bounds thresholds (spec).
const OOB_Y = 760;
const OOB_X_MIN = -40;
const OOB_X_MAX = 1320;

// ---- Part geometry / physics (spec roster) ----------------------------------
// Plank   static rect 120×16  friction 0.5
// Ramp    static right-triangle 120×80 friction 0.5
// Bouncer static rect 80×16   restitution 1.4
// Crate   dynamic rect 40×40  defaults
// Column  static rect 24×120  friction 0.5
const RAMP_W = 120;
const RAMP_H = 80;

// Right-triangle ramp vertices (local space, centered at body center).
// Base orientation (angleDeg = 0): flat bottom edge, vertical left edge (right angle bottom-left),
// hypotenuse descends from top-left down to bottom-right → a slope that sends things to the RIGHT
// and down. The GDD's bridge/ballrun openers assume "high-left / low-right" at angle 0.
//
// Vertices wound counter-clockwise in screen coords (y-down). Centroid offset is handled by
// matter-js (Bodies.fromVertices recenters to centroid); we pass a position and matter places the
// centroid there. We keep vertices symmetric enough that the centroid is near geometric middle.
function rampVertices(): Vector[] {
  // Triangle corners in a box [-60..60] x [-40..40]:
  //   top-left (high)    : (-60, -40)
  //   bottom-left        : (-60,  40)   <- right angle here
  //   bottom-right (low) : ( 60,  40)
  // Hypotenuse = top-left -> bottom-right (descends to the right).
  return [
    { x: -RAMP_W / 2, y: -RAMP_H / 2 },
    { x: -RAMP_W / 2, y: RAMP_H / 2 },
    { x: RAMP_W / 2, y: RAMP_H / 2 },
  ];
}

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

// ---- Body builders -----------------------------------------------------------
function buildTerrain(t: TerrainBlock): Body {
  const opts = {
    isStatic: true,
    friction: 0.5,
    label: `terrain:${t.kind}`,
  };
  const body = Bodies.rectangle(t.x, t.y, t.w, t.h, opts);
  if (t.angleDeg) Body.setAngle(body, degToRad(t.angleDeg));
  return body;
}

function buildPlacement(p: Placement): Body {
  let body: Body;
  switch (p.part) {
    case "plank":
      body = Bodies.rectangle(p.x, p.y, 120, 16, { isStatic: true, friction: 0.5, label: "part:plank" });
      break;
    case "ramp": {
      // Build the right-triangle from explicit vertices, centered at (p.x, p.y).
      body = Bodies.fromVertices(
        p.x,
        p.y,
        [rampVertices()],
        { isStatic: true, friction: 0.5, label: "part:ramp" },
        true, // flagInternal — clean single convex hull
      );
      break;
    }
    case "bouncer":
      body = Bodies.rectangle(p.x, p.y, 80, 16, { isStatic: true, label: "part:bouncer" });
      // matter-js 0.20.0 resets restitution to 0 during static init when passed in the options
      // object, so set it AFTER creation for the value to stick. (Effective bounce ~1.0 — the
      // engine clamps energy gain — but this makes the bouncer live instead of a dead plank.)
      body.restitution = 1.4;
      break;
    case "crate":
      body = Bodies.rectangle(p.x, p.y, 40, 40, { label: "part:crate" }); // dynamic, defaults
      break;
    case "column":
      body = Bodies.rectangle(p.x, p.y, 24, 120, { isStatic: true, friction: 0.5, label: "part:column" });
      break;
  }
  if (p.angleDeg) Body.setAngle(body, degToRad(p.angleDeg));
  return body;
}

// Ball liveliness tuning (FIX 3 — within the determinism contract; see TUNING.md).
// The spec's defaults (frictionAir 0.01 inherited, friction 0.05) made the ball CRAWL: it bled most
// of its speed on any flat run and barely accelerated down a 15° ramp, so rolls read dead and "stopped
// short" felt arbitrary. Lowering frictionAir 5x (the dominant drag) lets gravity actually build
// momentum downhill; a modestly lower contact friction makes the roll lively while still gripping
// enough to settle in a goal (not icy). Surface friction (0.5) is unchanged — that is the parts contract.
export const BALL_FRICTION_AIR = 0.002;
export const BALL_FRICTION = 0.02;
export const BALL_RESTITUTION = 0.2;

function buildActor(a: Actor, index: number): Body {
  let body: Body;
  if (a.kind === "ball") {
    body = Bodies.circle(a.x, a.y, 18, {
      restitution: BALL_RESTITUTION,
      friction: BALL_FRICTION,
      frictionAir: BALL_FRICTION_AIR,
      label: a.hero ? "actor:hero:ball" : "actor:ball",
    });
  } else {
    body = Bodies.rectangle(a.x, a.y, 40, 40, {
      label: a.hero ? "actor:hero:crate" : "actor:crate",
    });
  }
  // tag with index for stable identification in render
  (body as Body & { actorIndex?: number }).actorIndex = index;
  if (a.vx !== undefined || a.vy !== undefined) {
    Body.setVelocity(body, { x: a.vx ?? 0, y: a.vy ?? 0 });
  }
  return body;
}

// ---- Sim instance ------------------------------------------------------------
export interface SimHandle {
  engine: Engine;
  heroBody: Body;
  bodies: Body[]; // all created bodies, in creation order (terrain → placements → actors)
  step(): void; // one fixed step
  isOutOfBounds(): boolean;
  heroInGoal(): boolean; // hero AABB fully inside goal rect this step
  goalRect: { minX: number; minY: number; maxX: number; maxY: number };
}

function goalToRect(level: Level) {
  return {
    minX: level.goal.x,
    minY: level.goal.y,
    maxX: level.goal.x + level.goal.w,
    maxY: level.goal.y + level.goal.h,
  };
}

// Build a fresh engine + world for a level with a given set of placements.
// Body-add order is FIXED: terrain (JSON order) → placements (array order) → actors (array order).
export function createSim(level: Level, placements: Placement[]): SimHandle {
  const engine = Engine.create();
  engine.positionIterations = 6;
  engine.velocityIterations = 4;
  engine.constraintIterations = 2;
  engine.enableSleeping = false;
  // gravity default (matter-js 0.20.0: { x: 0, y: 1, scale: 0.001 })

  const bodies: Body[] = [];

  for (const t of level.terrain) bodies.push(buildTerrain(t));
  for (const p of placements) bodies.push(buildPlacement(p));
  level.actors.forEach((a, i) => bodies.push(buildActor(a, i)));

  Composite.add(engine.world, bodies);

  const heroBody = bodies.find((b) => b.label.startsWith("actor:hero"));
  if (!heroBody) throw new Error(`Level ${level.id} has no hero actor`);

  const goalRect = goalToRect(level);

  const handle: SimHandle = {
    engine,
    heroBody,
    bodies,
    goalRect,
    step() {
      Engine.update(engine, FIXED_DT);
    },
    isOutOfBounds() {
      const p = heroBody.position;
      return p.y > OOB_Y || p.x < OOB_X_MIN || p.x > OOB_X_MAX;
    },
    heroInGoal() {
      const b = heroBody.bounds;
      return (
        b.min.x >= goalRect.minX &&
        b.max.x <= goalRect.maxX &&
        b.min.y >= goalRect.minY &&
        b.max.y <= goalRect.maxY
      );
    },
  };
  return handle;
}

// ---- Headless evaluation (tests + ?solve verification) ----------------------
export interface RunResult {
  success: boolean;
  successStep: number | null; // step at which the 30th consecutive in-goal step completed
  failReason: "out-of-bounds" | "timeout" | null;
  steps: number; // total steps simulated
  // diagnostic snapshot of the hero at end
  heroEnd: { x: number; y: number };
}

// Run a level to completion under the fixed-step contract. Plain loop (no rAF) for tests.
export function runLevel(level: Level, placements: Placement[], maxSteps = MAX_STEPS): RunResult {
  const sim = createSim(level, placements);
  let consecutive = 0;
  for (let step = 1; step <= maxSteps; step++) {
    sim.step();
    if (sim.isOutOfBounds()) {
      return {
        success: false,
        successStep: null,
        failReason: "out-of-bounds",
        steps: step,
        heroEnd: { x: sim.heroBody.position.x, y: sim.heroBody.position.y },
      };
    }
    if (sim.heroInGoal()) {
      consecutive++;
      if (consecutive >= GOAL_HOLD_STEPS) {
        return {
          success: true,
          successStep: step,
          failReason: null,
          steps: step,
          heroEnd: { x: sim.heroBody.position.x, y: sim.heroBody.position.y },
        };
      }
    } else {
      consecutive = 0;
    }
  }
  return {
    success: false,
    successStep: null,
    failReason: "timeout",
    steps: maxSteps,
    heroEnd: { x: sim.heroBody.position.x, y: sim.heroBody.position.y },
  };
}

// Helper exposed for unit tests: classify a hero position for out-of-bounds.
export function classifyBounds(x: number, y: number): "in" | "oob" {
  if (y > OOB_Y || x < OOB_X_MIN || x > OOB_X_MAX) return "oob";
  return "in";
}

// Helper exposed for unit tests: does an AABB sit fully inside a goal rect?
export function aabbInsideGoal(
  bounds: { min: Vector; max: Vector },
  goal: { minX: number; minY: number; maxX: number; maxY: number },
): boolean {
  return (
    bounds.min.x >= goal.minX &&
    bounds.max.x <= goal.maxX &&
    bounds.min.y >= goal.minY &&
    bounds.max.y <= goal.maxY
  );
}

export type { PartKind };
