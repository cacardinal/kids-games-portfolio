// Pure placement-validity + budget logic (no React, no matter-js). Used by the editor and tested.
import type { Level, Placement, PartKind, Actor } from "./types";
import { PART_COST, placementsCost } from "./types";

// Axis-aligned footprint (in world units) used for the simple validity checks. We use the part's
// bounding box at angle 0 (rotation only shrinks the effective AABB for the thin parts), which is a
// deliberately conservative approximation for the "keep clear" rule.
export function partFootprint(part: PartKind): { w: number; h: number } {
  switch (part) {
    case "plank":
      return { w: 120, h: 16 };
    case "ramp":
      return { w: 120, h: 80 };
    case "bouncer":
      return { w: 80, h: 16 };
    case "crate":
      return { w: 40, h: 40 };
    case "column":
      return { w: 24, h: 120 };
  }
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Overlapping area of two axis-aligned rects (0 if disjoint).
function overlapArea(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  const ix = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx));
  const iy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
  return ix * iy;
}

// Fraction of overlap relative to the SMALLER of the two footprints (so a small part dropped on a big
// one, or vice-versa, both register). 1.0 = the smaller part is fully inside the other.
export function overlapFraction(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): number {
  const area = overlapArea(ax, ay, aw, ah, bx, by, bw, bh);
  if (area <= 0) return 0;
  return area / Math.min(aw * ah, bw * bh);
}

// FIX 2: a candidate whose AABB overlaps an existing placed part by more than this fraction is rejected
// (prevents stacking duplicate planks at the same spot — the editor-corruption the critic produced).
export const MAX_OVERLAP_FRACTION = 0.4;

// Distance from a point to an axis-aligned rect (0 if inside).
function pointRectDist(px: number, py: number, rx: number, ry: number, rw: number, rh: number): number {
  const dx = Math.max(rx - px, 0, px - (rx + rw));
  const dy = Math.max(ry - py, 0, py - (ry + rh));
  return Math.hypot(dx, dy);
}

export const ACTOR_CLEARANCE = 50; // px: placements forbidden within 50px of an actor spawn

export interface PlacementCheck {
  ok: boolean;
  reason?: "goal" | "actor" | "budget" | "bounds" | "overlap";
}

// Validate a single candidate placement against the level (bounds/goal/actor clearance/overlap) and
// budget. The order of checks defines which reason "wins" when several apply.
export function checkPlacement(
  level: Level,
  candidate: Placement,
  existing: Placement[],
): PlacementCheck {
  const { w, h } = partFootprint(candidate.part);
  const left = candidate.x - w / 2;
  const top = candidate.y - h / 2;

  // Bounds: keep the whole footprint inside the world.
  if (left < 0 || top < 0 || left + w > 1280 || top + h > 720) {
    return { ok: false, reason: "bounds" };
  }

  // Forbidden: intersecting the goal rect.
  if (rectsOverlap(left, top, w, h, level.goal.x, level.goal.y, level.goal.w, level.goal.h)) {
    return { ok: false, reason: "goal" };
  }

  // Forbidden: within ACTOR_CLEARANCE of any actor spawn point.
  for (const a of level.actors) {
    if (pointRectDist(a.x, a.y, left, top, w, h) < ACTOR_CLEARANCE) {
      return { ok: false, reason: "actor" };
    }
  }

  // FIX 2 — forbidden: substantially overlapping an already-placed part (>40% of the smaller footprint).
  // Stops duplicate parts being stacked at (near-)identical coordinates.
  for (const e of existing) {
    const ef = partFootprint(e.part);
    const eLeft = e.x - ef.w / 2;
    const eTop = e.y - ef.h / 2;
    if (overlapFraction(left, top, w, h, eLeft, eTop, ef.w, ef.h) > MAX_OVERLAP_FRACTION) {
      return { ok: false, reason: "overlap" };
    }
  }

  // Budget: the candidate must be affordable given what's already placed.
  if (placementsCost(existing) + PART_COST[candidate.part] > level.budget) {
    return { ok: false, reason: "budget" };
  }

  return { ok: true };
}

// Remaining budget after a set of placements.
export function remainingBudget(level: Level, placements: Placement[]): number {
  return level.budget - placementsCost(placements);
}

// Can a given part be afforded as the NEXT placement (used to gray out tray cards)?
export function canAfford(level: Level, placements: Placement[], part: PartKind): boolean {
  return remainingBudget(level, placements) >= PART_COST[part];
}

// Star evaluation for a solved level.
export interface Stars {
  solved: boolean;
  underParParts: boolean;
  underParCost: boolean;
  count: number;
}
export function evaluateStars(level: Level, placements: Placement[], solved: boolean): Stars {
  const parts = placements.length;
  const cost = placementsCost(placements);
  const underParParts = solved && parts <= level.par.parts;
  const underParCost = solved && cost <= level.par.cost;
  const count = (solved ? 1 : 0) + (underParParts ? 1 : 0) + (underParCost ? 1 : 0);
  return { solved, underParParts, underParCost, count };
}

export { PART_COST, placementsCost };
export type { Actor };
