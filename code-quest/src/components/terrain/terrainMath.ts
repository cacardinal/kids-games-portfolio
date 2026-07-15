// PURE math for the 3D mission terrain. NO three.js, NO React — headless-testable.
// The interpreter (src/game) owns execution truth; this module only translates its
// trace into world-space targets the 3D layer can animate toward.
//
// World mapping: grid x -> world X (east positive), grid y -> world Z (south positive),
// Y is up. A rover with its nose along -Z has yaw 0 = facing N. three.js yaw (rotation.y)
// is counter-clockwise seen from above, so a RIGHT (clockwise) turn decreases yaw.

import type { Heading, TraceStep, TraceEvent } from "../../game/interpreter";

export const TILE = 1; // world units per grid tile

// Animation durations. MUST stay under the interpreter tick (333ms) so the visual
// rover finishes each beat before the next step event lands — timing truth stays
// in src/state/useRunPlayer.ts, never here.
export const MOVE_MS = 260;
export const TURN_MS = 240;

/** Grid tile -> [worldX, worldZ], board centered on the origin. */
export function tileToWorld(x: number, y: number, width: number, height: number): [number, number] {
  return [(x - (width - 1) / 2) * TILE, (y - (height - 1) / 2) * TILE];
}

/** Deterministic per-tile jitter in [0, 1) — stable height variation, no RNG state. */
export function tileJitter(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + 13.37) * 43758.5453;
  return s - Math.floor(s);
}

/** Heading -> yaw (rotation.y). Nose along -Z at yaw 0 = North. */
export const HEADING_YAW: Record<Heading, number> = {
  N: 0,
  E: -Math.PI / 2,
  S: Math.PI,
  W: Math.PI / 2,
};

/** Re-express `target` (mod 2PI) as the angle nearest `prev`, so 90° turns never spin 270°. */
export function nearestYaw(prev: number, target: number): number {
  let t = target;
  while (t - prev > Math.PI) t -= 2 * Math.PI;
  while (t - prev < -Math.PI) t += 2 * Math.PI;
  return t;
}

/**
 * Accumulated yaw after trace[index] (index -1 = start pose). Walks the trace so
 * consecutive quarter-turns unwrap continuously instead of snapping across ±PI.
 */
export function yawAt(startHeading: Heading, trace: TraceStep[], index: number): number {
  let yaw = HEADING_YAW[startHeading];
  for (let i = 0; i <= index && i < trace.length; i++) {
    yaw = nearestYaw(yaw, HEADING_YAW[trace[i].rover.heading]);
  }
  return yaw;
}

export type KeyframeMotion = "none" | "move" | "turn";

export interface RoverKeyframe {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromYaw: number;
  toYaw: number;
  motion: KeyframeMotion;
  event?: TraceEvent;
  noop?: boolean;
  collisionDir?: Heading;
  tick: number; // interpreter tick (0 for the idle keyframe)
}

/**
 * Translate the current visible trace step into an animation keyframe.
 * traceIndex -1 = idle at the mission start. Pure: derives everything from args.
 */
export function deriveKeyframe(
  start: { x: number; y: number },
  startHeading: Heading,
  trace: TraceStep[],
  traceIndex: number,
): RoverKeyframe {
  if (traceIndex < 0 || traceIndex >= trace.length) {
    const yaw = HEADING_YAW[startHeading];
    return {
      fromX: start.x,
      fromY: start.y,
      toX: start.x,
      toY: start.y,
      fromYaw: yaw,
      toYaw: yaw,
      motion: "none",
      tick: 0,
    };
  }

  const step = trace[traceIndex];
  const prev = traceIndex === 0
    ? { x: start.x, y: start.y, heading: startHeading }
    : trace[traceIndex - 1].rover;

  const fromYaw = yawAt(startHeading, trace, traceIndex - 1);
  const toYaw = nearestYaw(fromYaw, HEADING_YAW[step.rover.heading]);

  const translated = step.rover.x !== prev.x || step.rover.y !== prev.y;
  let motion: KeyframeMotion = "none";
  if (translated) motion = "move";
  else if ((step.command === "LEFT" || step.command === "RIGHT") && step.event !== "end") motion = "turn";

  return {
    fromX: prev.x,
    fromY: prev.y,
    toX: step.rover.x,
    toY: step.rover.y,
    fromYaw,
    toYaw,
    motion,
    event: step.event,
    noop: step.noop,
    collisionDir: step.collisionDir,
    tick: step.tick,
  };
}

/** Impact direction as a unit world vector [dx, dz] (grid N = world -z). */
export function collisionOffset(dir: Heading): [number, number] {
  switch (dir) {
    case "N": return [0, -1];
    case "S": return [0, 1];
    case "E": return [1, 0];
    case "W": return [-1, 0];
  }
}

export interface CameraPose {
  position: [number, number, number];
  fov: number;
}

/**
 * Fixed isometric-ish camera framing the whole board: elevated, pulled back toward
 * the south (screen-bottom) with a small east offset for depth. North stays up so a
 * six-year-old can still count tiles.
 */
export function cameraPose(width: number, height: number): CameraPose {
  const span = Math.max(width, height * 1.45) * TILE; // rows cost more vertical frame
  const d = span * 0.5 + 1.35; // pulled in tight so the board fills the frame (tiles countable)
  return {
    position: [d * 0.26, d * 0.82, d * 0.92],
    fov: 44,
  };
}

/** Ease for tile-to-tile motion: smooth in/out, no overshoot. */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
