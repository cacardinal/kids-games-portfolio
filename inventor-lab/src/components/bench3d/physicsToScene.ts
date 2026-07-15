// physicsToScene — the ONE mapping module between the matter-js 2D world and the 3D bench view.
//
// matter-js remains the only physics truth. This module owns:
//   1. world→scene coordinate mapping (world is y-DOWN 1280×720; the scene is y-UP, same units,
//      with the physics plane at z=0 and depth extruded BACKWARD into -z),
//   2. per-part / per-actor extrusion geometry specs (pure params — mesh factories consume them),
//   3. the fixed off-axis camera rig whose frustum projects the z=0 physics plane EXACTLY onto the
//      viewport, so the 3D front faces line up 1:1 with the 2D SVG input overlay (drag/place/snap
//      stay in the existing 2D world coords with zero projection error),
//   4. a body→object sync registry used to copy body position/angle onto meshes each frame.
//
// PURE MODULE: no three.js imports, no DOM. Unit-tested headless (physicsToScene.test.ts).
import { WORLD_W, WORLD_H } from "../../game/sim";
import { rampLocalPoints } from "../../game/render";
import type { PartKind, Actor, TerrainBlock, GoalRect, Placement } from "../../game/types";

export { WORLD_W, WORLD_H };

// ---- depth model (presentational only — physics is 2D) -----------------------
export const PART_DEPTH = 48;    // planks/ramps/bouncers/columns: prisms z ∈ [-48, 0]
export const TERRAIN_DEPTH = 56; // terrain blocks sit a touch deeper for visual weight
export const MID_Z = -PART_DEPTH / 2; // actors (ball/crate) travel on the lane mid-plane
export const GOAL_DEPTH = 52;
export const BACK_Z = -64;       // blueprint back panel

// ---- coordinate mapping -------------------------------------------------------
// World: origin top-left, y increases DOWNWARD. Scene: y increases UPWARD, same units.
export function worldToScene(x: number, y: number): { x: number; y: number } {
  return { x, y: WORLD_H - y };
}

// matter-js angles are clockwise-positive in the y-down world; the y-flip mirrors them.
export function worldAngleToScene(angleRad: number): number {
  return -angleRad + 0; // `+ 0` normalizes -0 → 0
}

export interface BodyState {
  x: number;
  y: number;
  angle: number; // radians, matter-js convention
}

export interface Transform {
  position: [number, number, number];
  rotation: [number, number, number]; // Euler XYZ
}

export function bodyToTransform(state: BodyState, z = 0): Transform {
  const p = worldToScene(state.x, state.y);
  return { position: [p.x, p.y, z], rotation: [0, 0, worldAngleToScene(state.angle)] };
}

// ---- geometry specs (pure params for the mesh factories) ----------------------
export type GeometrySpec =
  | { type: "box"; w: number; h: number; depth: number }
  | { type: "wedge"; points: { x: number; y: number }[]; depth: number } // scene-local, y-up
  | { type: "sphere"; r: number };

// Placed-part footprints mirror sim.ts exactly (plank 120×16, ramp triangle, bouncer 80×16,
// crate 40×40, column 24×120). The ramp wedge reuses render.ts's centroid-recentered local
// points (the body is placed at the triangle CENTROID — TUNING.md finding #1), y-flipped for
// the y-up scene.
export function partGeometrySpec(part: PartKind): GeometrySpec {
  switch (part) {
    case "plank":
      return { type: "box", w: 120, h: 16, depth: PART_DEPTH };
    case "ramp":
      return {
        type: "wedge",
        points: rampLocalPoints().map((p) => ({ x: p.x, y: -p.y })),
        depth: PART_DEPTH,
      };
    case "bouncer":
      return { type: "box", w: 80, h: 16, depth: PART_DEPTH };
    case "crate":
      return { type: "box", w: 40, h: 40, depth: 40 };
    case "column":
      return { type: "box", w: 24, h: 120, depth: PART_DEPTH };
  }
}

export function actorGeometrySpec(kind: Actor["kind"]): GeometrySpec {
  return kind === "ball" ? { type: "sphere", r: 18 } : { type: "box", w: 40, h: 40, depth: 40 };
}

export function terrainGeometrySpec(t: TerrainBlock): GeometrySpec {
  return { type: "box", w: t.w, h: t.h, depth: TERRAIN_DEPTH };
}

// Placement → static transform (parts are static bodies; their body position IS the placement).
export function placementToTransform(p: Placement): Transform {
  return bodyToTransform({ x: p.x, y: p.y, angle: (p.angleDeg * Math.PI) / 180 });
}

export function terrainToTransform(t: TerrainBlock): Transform {
  return bodyToTransform({ x: t.x, y: t.y, angle: ((t.angleDeg ?? 0) * Math.PI) / 180 });
}

// Goal rect (world top-left + w/h) → scene-centered box.
export function goalBoxSpec(goal: GoalRect): { center: [number, number, number]; size: [number, number, number] } {
  const c = worldToScene(goal.x + goal.w / 2, goal.y + goal.h / 2);
  return { center: [c.x, c.y, -GOAL_DEPTH / 2], size: [goal.w, goal.h, GOAL_DEPTH] };
}

// ---- the fixed off-axis camera rig --------------------------------------------
// A perspective camera OFFSET from the plane center but still facing straight down -z, with an
// asymmetric frustum built so the z=0 plane's [0..1280]×[0..720] maps EXACTLY to the full
// viewport. The offset gives the 10–20° oblique workshop view (you see part tops + sides) while
// keeping the interaction plane's screen mapping identical to the flat SVG — zero projection
// error, so 2D input coords stay honest.
export interface CameraRig {
  position: [number, number, number]; // scene coords
  near: number;
  far: number;
  frustum: { left: number; right: number; top: number; bottom: number };
  offAxisDeg: number; // angle off straight-on at the plane center (documented 10–20)
}

export const CAMERA_OFFSET_X = 130;  // a touch from the right
export const CAMERA_OFFSET_Y = 290;  // and from above
export const CAMERA_DISTANCE = 1400; // z distance to the physics plane
const NEAR = 100;
const FAR = 4000;

export function computeCameraRig(): CameraRig {
  const cx = WORLD_W / 2 + CAMERA_OFFSET_X;
  const cy = WORLD_H / 2 + CAMERA_OFFSET_Y; // scene y (plane spans 0..720 scene-up)
  const k = NEAR / CAMERA_DISTANCE;
  return {
    position: [cx, cy, CAMERA_DISTANCE],
    near: NEAR,
    far: FAR,
    frustum: {
      left: (0 - cx) * k,
      right: (WORLD_W - cx) * k,
      top: (WORLD_H - cy) * k,
      bottom: (0 - cy) * k,
    },
    offAxisDeg: (Math.atan(Math.hypot(CAMERA_OFFSET_X, CAMERA_OFFSET_Y) / CAMERA_DISTANCE) * 180) / Math.PI,
  };
}

// Project a world point on the physics plane (z=0) through the rig to NDC — used by tests to
// prove the plane↔viewport mapping is exact and camera-offset-independent.
export function projectPlanePointToNdc(rig: CameraRig, worldX: number, worldY: number): { x: number; y: number } {
  const s = worldToScene(worldX, worldY);
  const vx = s.x - rig.position[0];
  const vy = s.y - rig.position[1];
  const d = rig.position[2]; // plane is at view-space z = -d
  const { left, right, top, bottom } = rig.frustum;
  // standard asymmetric perspective: ndc.x = (2n·vx/(r-l) + (r+l)/(r-l)·vz) / -vz, vz = -d
  const x = ((2 * rig.near * vx) / (right - left) - ((right + left) / (right - left)) * d) / d;
  const y = ((2 * rig.near * vy) / (top - bottom) - ((top + bottom) / (top - bottom)) * d) / d;
  return { x, y };
}

// ---- body→object sync registry -------------------------------------------------
// Structural target type matching THREE.Object3D's position/rotation API, so meshes plug in
// directly and tests use plain fakes (no WebGL, no three import).
export interface SyncTarget {
  position: { set(x: number, y: number, z: number): unknown };
  rotation: { set(x: number, y: number, z: number): unknown };
}

export interface SyncRegistry {
  register(key: number | string, target: SyncTarget, z?: number): void;
  unregister(key: number | string): void;
  sync(states: Record<number | string, BodyState> | Map<number | string, BodyState>): void;
  size(): number;
}

// Copy body position/angle → registered object transforms. Called once per rendered frame with
// the live body states (matter afterUpdate/onFrame data). Unknown keys are ignored.
export function createSyncRegistry(defaultZ = MID_Z): SyncRegistry {
  const targets = new Map<number | string, { target: SyncTarget; z: number }>();
  return {
    register(key, target, z = defaultZ) {
      targets.set(key, { target, z });
    },
    unregister(key) {
      targets.delete(key);
    },
    sync(states) {
      const entries: Iterable<[number | string, BodyState]> =
        states instanceof Map ? states.entries() : Object.entries(states);
      for (const [key, state] of entries) {
        const t = targets.get(key) ?? targets.get(Number(key));
        if (!t) continue;
        const { position, rotation } = bodyToTransform(state, t.z);
        t.target.position.set(position[0], position[1], position[2]);
        t.target.rotation.set(rotation[0], rotation[1], rotation[2]);
      }
    },
    size() {
      return targets.size;
    },
  };
}
