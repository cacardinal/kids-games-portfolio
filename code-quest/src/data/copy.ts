// Copy deck (GDD §6). Calm, specific, quietly warm. No exclamation marks, no emoji.
// Generators are pure so they can be unit-checked and reused by the status line + cards.

import type { Heading, Mission, RunResult } from "../game/interpreter";

const WALL_WORD: Record<Heading, string> = { N: "north", E: "east", S: "south", W: "west" };

// §6.2 — Collision copy. Pattern: "Collision at step N. The rover hit the <dir> wall|barrier."
export function collisionCopy(step: number, dir: Heading, wall: "edge" | "barrier"): string {
  const word = WALL_WORD[dir];
  const edgeOrBarrier = wall === "barrier" ? "barrier" : "wall";
  if (wall === "barrier") {
    return `Collision at step ${step}. The rover hit the barrier.`;
  }
  return `Collision at step ${step}. The rover hit the ${word} ${edgeOrBarrier}.`;
}

export const COLLISION_ADVISORY = (step: number) =>
  `Program halted. The chips after step ${step} did not run.`;

// §6.3 — Success citations.
export function successCopy(m: Mission, chips: number): string {
  let base: string;
  if (m.objectives.activateAll && !m.objectives.collectAll) {
    base = "Relay online. Mission complete.";
  } else if (m.objectives.collectAll && !m.objectives.reachGoal) {
    base = "Circuit complete. Every crystal collected."; // M12 (collect-only ring)
  } else if (m.objectives.collectAll) {
    base = "All samples collected. Mission complete.";
  } else {
    base = "Pad reached. Mission complete.";
  }
  if (chips <= m.par) {
    base += ` Clean run — ${chips} ${chips === 1 ? "chip" : "chips"}, par ${m.par}.`;
  }
  return base;
}

// §6.3 — Per-mission flavor citation shown on the mission card after first clear.
export const FLAVOR_CITATION: Record<number, string> = {
  1: "First contact established.",
  2: "Heading held. Pad reached.",
  3: "One clean turn to the pad.",
  4: "Around the ridge, no scratches.",
  5: "Sample secured on a single pass.",
  6: "Off-route sample secured.",
  7: "Both samples, one drive.",
  8: "Relay powered. Signal restored.",
  9: "One loop drove the whole corridor.",
  10: "Descended the stair on repeat.",
  11: "Harvested on the move.",
  12: "Full perimeter walked on a single loop.",
};

// §6.4 — Patch citations.
export const PATCH_CITATION: Record<1 | 2 | 3, string> = {
  1: "MOVEMENT sector cleared. The rover drives true.",
  2: "OPERATIONS sector cleared. Contact confirmed on every target.",
  3: "LOOPS sector cleared. One instruction, many steps.",
};

// §6.5 — End-without-win diagnostics. Pluralize; combine crystal + beacon clauses.
// (mission param kept for call-site symmetry / future per-mission flavor; not read today.)
export function endCopy(_mission: Mission, result: RunResult): string {
  const crystals = result.crystalsRemaining;
  const beaconDark = result.beaconsRemaining > 0;
  const crystalClause =
    crystals > 0 ? `${crystals} ${crystals === 1 ? "crystal" : "crystals"} still out there` : "";

  // Reached goal but objectives unmet (goal shimmered, did not win).
  if (result.reachedGoalWithoutWin) {
    const parts: string[] = [];
    if (crystalClause) parts.push(crystalClause);
    if (beaconDark) parts.push("the relay is still dark");
    const tail = parts.join(", and ");
    return `The pad shimmered, but the mission is not done. ${capFirst(tail)}.`;
  }

  if (crystalClause && beaconDark) {
    return `Program complete. ${crystalClause}, and the relay is still dark.`;
  }
  if (beaconDark) {
    return "Program complete. The relay is still dark.";
  }
  if (crystalClause) {
    return `Program complete. ${capFirst(crystalClause)}.`;
  }
  // Pure reachGoal mission that simply never arrived.
  return "Program complete. The pad was not reached.";
}

function capFirst(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// §6.6 — Other system strings.
export const STR = {
  profileHeader: "Who's operating today?",
  capReached: "Program full. 20 chips is the limit — delete one to add another.",
  loopFull: "This loop is full. A loop holds up to six chips.",
  emptyRun: "No chips loaded. Add a command, then run.",
  sectorLocked: (n: number) =>
    n === 2
      ? "Sector 2 locks until the Movement sector is clear."
      : "Sector 3 locks until the Operations sector is clear.",
  resetTitle: () => `Reset this operator's progress`,
  resetConfirm: (name: string) => `This clears only ${name}'s saved progress.`,
  idleStatus: "ROVER STANDBY // AWAITING PROGRAM",
  runningStatus: "RUNNING",
  stoppedStatus: "STOPPED // ROVER RESET",
  mintingStatus: "SECTOR CLEAR // MINTING PATCH",
  stepHint: "Use STEP to walk the program one tick at a time.",
  actionNoop: "ACTION — nothing here",
};
