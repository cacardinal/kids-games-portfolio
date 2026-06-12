// System copy (GDD §5). Calm, specific, iteration-positive. No exclamation marks, no emoji.
// Failure lines rotate so repeat fails don't repeat the exact line.

import type { Series } from "../game/types";

const OOB_LINES = [
  "Off the edge. The path needs a catch there.",
  "It ran out of road. Try extending the span.",
  "Dropped past the goal. A ramp could nudge it in.",
];

const SHORT_LINES = [
  "It settled before the goal. A little more slope, or a longer road.",
  "The ball stopped short. More ramp?",
  "Close. The payload did not clear. More push, or a steeper launch.",
];

const LAUNCH_MISS_LINES = [
  "The hammer missed the crate. Aim the ball lower and faster.",
  "Crate knocked, but it missed the basin. Catch it on the way down.",
];

const GENERIC = "Adjust a part and run it again.";

// FIX 4 — early-settle copy (matches the existing neutral, diagnostic register).
const SETTLED_LINES = [
  "Everything settled. The ball stopped short.",
  "It all came to rest before the goal. More slope, or a longer road.",
  "Motion stopped early. The payload settled short of the mark.",
];

// mode: "oob" (fell off), "short" (never reached / stopped), or "settled" (everything came to rest).
// Series tunes launch copy.
export function failureLine(series: Series, mode: "oob" | "short" | "settled", testN: number): string {
  let pool: string[];
  if (mode === "settled") {
    pool = SETTLED_LINES;
  } else if (series === "launch") {
    pool = mode === "oob" ? LAUNCH_MISS_LINES : SHORT_LINES;
  } else {
    pool = mode === "oob" ? OOB_LINES : SHORT_LINES;
  }
  const line = pool[(testN - 1) % pool.length] ?? GENERIC;
  return line;
}

// FIX 6 — short, calm labels for a rejected placement cue (shown at the attempted location).
const REJECT_LABELS: Record<string, string> = {
  goal: "Not in the goal",
  actor: "Too close",
  budget: "Over budget",
  bounds: "Off the sheet",
  overlap: "Parts overlap",
};
export function rejectLabel(reason: string): string {
  return REJECT_LABELS[reason] ?? "No room there";
}

const FOOTERS = [
  "Logged and approved. Clean build.",
  "It holds. Mission approved.",
];

export function successFooter(testN: number): string {
  // Celebrate iteration explicitly when it took more than one test.
  if (testN > 1) return `Solved in ${testN} tests. That is the job.`;
  return FOOTERS[testN % FOOTERS.length];
}
