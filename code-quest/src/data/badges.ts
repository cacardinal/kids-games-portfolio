// Badges (GDD §7.1). 6 badges, pure CSS/SVG, surfaced in profile. "Debugger" is mandatory.

export type BadgeId =
  | "first-contact"
  | "debugger"
  | "efficient-operator"
  | "loop-master"
  | "one-liner"
  | "long-haul";

export interface BadgeDef {
  id: BadgeId;
  name: string;
  criteria: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first-contact", name: "First Contact", criteria: "Complete mission 1." },
  {
    id: "debugger",
    name: "Debugger",
    criteria: "Have a run end in a collision, then later win that same mission.",
  },
  {
    id: "efficient-operator",
    name: "Efficient Operator",
    criteria: "Earn the efficiency star on any six missions.",
  },
  { id: "loop-master", name: "Loop Master", criteria: "Clear all four Loops-sector missions." },
  {
    id: "one-liner",
    name: "One-Liner",
    criteria: "Win a mission whose entire program is a single REPEAT chip.",
  },
  {
    id: "long-haul",
    name: "Long Haul",
    criteria: "Run a loop that expands to fifteen or more commands.",
  },
];

export const LONG_HAUL_THRESHOLD = 15; // Director-confirmed: >=15 expanded commands.
export const EFFICIENT_OPERATOR_COUNT = 6;
