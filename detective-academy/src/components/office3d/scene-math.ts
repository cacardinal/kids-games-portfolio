// Pure math for the 3D office backdrop + CASE CLOSED stamp set piece.
// Deliberately free of three.js imports so it unit-tests in the node env
// and so no 3D dependency leaks toward game/state/data code.

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Frame-rate independent exponential smoothing (never overshoots).
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/* ---------------- per-screen framing ---------------- */

export type BackdropView = "board" | "case" | "result";

export interface Framing {
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  /** spotlight intensity multiplier for the desk lamp */
  lamp: number;
}

// Board: the full office. Case: a closer desk crop (you're AT the desk working).
// Result: same pull-back but the lamp brightens on a solve.
const FRAMINGS: Record<BackdropView, Framing> = {
  board: { cameraX: 0, cameraY: 0.5, cameraZ: 7.2, lamp: 1 },
  case: { cameraX: 0.4, cameraY: -0.1, cameraZ: 5.2, lamp: 1.05 },
  result: { cameraX: 0, cameraY: 0.3, cameraZ: 6.4, lamp: 1.7 },
};

export function framingForView(view: BackdropView): Framing {
  return FRAMINGS[view];
}

/* ---------------- pointer parallax ---------------- */

// "A few degrees" per the story — gentle room dimension, never a swing.
export const PARALLAX_MAX_RAD = (2.5 * Math.PI) / 180;

export function normalizePointer(
  x: number,
  y: number,
  width: number,
  height: number,
): { nx: number; ny: number } {
  return {
    nx: clamp((x / width) * 2 - 1, -1, 1),
    ny: clamp((y / height) * 2 - 1, -1, 1),
  };
}

export function parallaxTarget(nx: number, ny: number): { rotX: number; rotY: number } {
  return {
    rotY: clamp(nx, -1, 1) * PARALLAX_MAX_RAD,
    rotX: clamp(ny, -1, 1) * PARALLAX_MAX_RAD * 0.6,
  };
}

/* ---------------- stamp slam timeline ---------------- */

// Total ~950ms: descend -> slam (ink + kick) -> settle into the flat stamped DOM state.
// Story bound: 800-1200ms, skippable.
export const STAMP_TIMELINE = {
  skippableAt: 120,
  impactAt: 420,
  successAt: 760, // sfx.success after the slam has landed
  restAt: 950,
} as const;

export type StampPhase3D = "pre" | "impact" | "rest";

export function stampPhaseAt(t: number): StampPhase3D {
  if (t < STAMP_TIMELINE.impactAt) return "pre";
  if (t < STAMP_TIMELINE.restAt) return "impact";
  return "rest";
}

/* ---------------- pixel-matched perspective ---------------- */

// Distance at which a perspective camera of `fovDeg` makes 1 world unit == 1 CSS px
// on the z=0 plane for a canvas `viewportHeightPx` tall. Lets the 3D stamp land
// exactly on the DOM stamp's footprint.
export function cameraDistanceForPixelMatch(fovDeg: number, viewportHeightPx: number): number {
  return viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
}

export interface RectLike {
  left: number;
  top: number;
  width: number;
  height: number;
}

// DOM stamp box -> world coords (origin at canvas center, y up), for the
// pixel-matched camera above.
export function stampTargetFromRects(
  stamp: RectLike,
  canvas: RectLike,
): { x: number; y: number; width: number; height: number } {
  const canvasCx = canvas.left + canvas.width / 2;
  const canvasCy = canvas.top + canvas.height / 2;
  const stampCx = stamp.left + stamp.width / 2;
  const stampCy = stamp.top + stamp.height / 2;
  return {
    x: stampCx - canvasCx,
    y: -(stampCy - canvasCy),
    width: stamp.width,
    height: stamp.height,
  };
}

/* ---------------- dust motes in the lamp cone ---------------- */

export interface ConeSpec {
  topY: number;
  bottomY: number;
  topR: number;
  bottomR: number;
}

export interface Mote {
  x: number;
  y: number;
  z: number;
  phase: number;
  speed: number;
}

export function moteConeRadiusAt(
  y: number,
  topY: number,
  bottomY: number,
  topR: number,
  bottomR: number,
): number {
  const t = clamp((topY - y) / (topY - bottomY), 0, 1);
  return lerp(topR, bottomR, t);
}

export function seedMotes(count: number, cone: ConeSpec, rand: () => number): Mote[] {
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const y = lerp(cone.bottomY, cone.topY, rand());
    const maxR = moteConeRadiusAt(y, cone.topY, cone.bottomY, cone.topR, cone.bottomR);
    const r = Math.sqrt(rand()) * maxR; // sqrt: uniform over the disc
    const a = rand() * Math.PI * 2;
    motes.push({
      x: Math.cos(a) * r,
      y,
      z: Math.sin(a) * r,
      phase: rand() * Math.PI * 2,
      speed: 0.02 + rand() * 0.05,
    });
  }
  return motes;
}
