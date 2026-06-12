// Level schema (BINDING — from specs/inventor-lab.md §"Level schema").
// All coordinates are in the 1280×720 world space. Origin top-left, y increases downward.
// For terrain/placements x/y = body CENTER. For goal, x/y = top-left corner of the rect.

export type PartKind = "plank" | "ramp" | "bouncer" | "crate" | "column";

export interface TerrainBlock {
  kind: "platform" | "wall" | "pedestal";
  x: number;
  y: number;
  w: number;
  h: number;
  angleDeg?: number;
}

export interface Actor {
  kind: "ball" | "crate";
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  hero: boolean;
}

export interface Placement {
  part: PartKind;
  x: number;
  y: number;
  angleDeg: number;
}

export interface GoalRect {
  x: number; // top-left
  y: number; // top-left
  w: number;
  h: number;
}

export type Series = "bridge" | "ballrun" | "launch";

export interface Level {
  id: number;
  series: Series;
  title: string;
  briefing: string;
  budget: number;
  allowedParts: PartKind[];
  terrain: TerrainBlock[];
  actors: Actor[];
  goal: GoalRect;
  par: { parts: number; cost: number };
  knownSolution: Placement[];
}

// Fixed part costs (spec — do not change).
export const PART_COST: Record<PartKind, number> = {
  plank: 10,
  ramp: 15,
  bouncer: 20,
  crate: 5,
  column: 8,
};

export function placementsCost(placements: Placement[]): number {
  return placements.reduce((sum, p) => sum + PART_COST[p.part], 0);
}
