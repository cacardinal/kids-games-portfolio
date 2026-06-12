// Pure SVG geometry helpers for drawing terrain, parts, actors, and the goal in the 1280×720
// viewBox. No React, no matter-js. The physics body positions (from the sim) are written into these
// shapes during a run; before a run we draw from the static level + placement data.
import type { TerrainBlock, Placement, GoalRect, PartKind } from "./types";

// Part footprints (spec roster). For the RAMP, matter-js places the body at the triangle CENTROID,
// which is offset from the bounding-box center. We mirror that here so the drawn triangle lines up
// with the simulated body exactly (offset measured from the engine: centroid is bbox-center + (20,-13.3)).
export const RAMP_W = 120;
export const RAMP_H = 80;
// centroid offset relative to placement (p.x,p.y): bbox spans [p.x-40, p.x+80] x [p.y-53, p.y+27]
export const RAMP_BBOX_DX = 20;  // bbox center x = p.x + 20
export const RAMP_BBOX_DY = -13.333; // bbox center y = p.y - 13.33

// Local (unrotated) triangle vertices relative to the placement point (p.x,p.y) — matches sim.ts.
export function rampLocalPoints(): { x: number; y: number }[] {
  // top-left high (-60,-40), bottom-left (-60,40), bottom-right low (60,40), but recentered so the
  // centroid sits at the placement point. Centroid of these = (-20, 13.33), so subtract it.
  const cx = -20, cy = 13.333;
  return [
    { x: -60 - cx, y: -40 - cy },
    { x: -60 - cx, y: 40 - cy },
    { x: 60 - cx, y: 40 - cy },
  ];
}

export function partSize(part: PartKind): { w: number; h: number } {
  switch (part) {
    case "plank": return { w: 120, h: 16 };
    case "ramp": return { w: RAMP_W, h: RAMP_H };
    case "bouncer": return { w: 80, h: 16 };
    case "crate": return { w: 40, h: 40 };
    case "column": return { w: 24, h: 120 };
  }
}

// SVG transform for a placed part at (x,y,angleDeg) — rotate about the placement point.
export function partTransform(p: { x: number; y: number; angleDeg: number }): string {
  return `translate(${p.x} ${p.y}) rotate(${p.angleDeg})`;
}

// Terrain rect (drawn as filled blueprint structure with a chalk outline).
export function terrainRect(t: TerrainBlock) {
  return {
    x: t.x - t.w / 2,
    y: t.y - t.h / 2,
    w: t.w,
    h: t.h,
    rotate: t.angleDeg ?? 0,
    cx: t.x,
    cy: t.y,
  };
}

export type { TerrainBlock, Placement, GoalRect, PartKind };
