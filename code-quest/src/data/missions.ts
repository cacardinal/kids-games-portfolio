// Code Quest — 12 missions across 3 sectors. Verbatim from the GDD (specs/gdd/code-quest-gdd.md §3).
// Grids, objectives, pars, briefs, and recorded solutions are the approved content — implemented as written.
// Coordinate convention (grid[y][x], row 0 = top) and headings match interpreter.ts.

import type { Chip, Mission, SimpleOp } from "../game/interpreter";

// --- Solution-chip builders. IDs here are deterministic labels used only inside recorded
//     solutions (tests + "load solution" affordance). User-built programs mint runtime ids.
let solCounter = 0;
function sc(op: SimpleOp): Chip {
  return { id: `sol-${solCounter++}`, op };
}
function rep(times: 2 | 3 | 4 | 5, body: SimpleOp[]): Chip {
  return {
    id: `sol-${solCounter++}`,
    op: "REPEAT",
    times,
    body: body.map((op) => ({ id: `sol-${solCounter++}`, op })),
  };
}

export const MISSIONS: Mission[] = [
  // ===================== SECTOR 1 — Movement =====================
  {
    id: 1,
    sector: 1,
    title: "First Contact",
    brief: "TRANSMISSION // Rover online. Goal beacon is three tiles east. Drive straight to it.",
    grid: ["......", "S..G..", "......"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT"],
    par: 3,
    solutions: [[sc("MOVE"), sc("MOVE"), sc("MOVE")]],
  },
  {
    id: 2,
    sector: 1,
    title: "Descent",
    brief: "TRANSMISSION // New heading: south. Three tiles down to the landing pad.",
    grid: [".S..", "....", "....", ".G.."],
    startHeading: "S",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT"],
    par: 3,
    solutions: [[sc("MOVE"), sc("MOVE"), sc("MOVE")]],
  },
  {
    id: 3,
    sector: 1,
    title: "Course Correction",
    brief: "TRANSMISSION // The pad is east, then south. You will need one turn.",
    grid: ["S.....", "......", "..G..."],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT"],
    par: 5,
    solutions: [
      [sc("MOVE"), sc("MOVE"), sc("RIGHT"), sc("MOVE"), sc("MOVE")],
      [sc("RIGHT"), sc("MOVE"), sc("MOVE"), sc("LEFT"), sc("MOVE"), sc("MOVE")],
    ],
  },
  {
    id: 4,
    sector: 1,
    title: "The Long Way",
    brief: "TRANSMISSION // A ridge blocks the direct path. Go around it to reach the pad.",
    grid: ["S.....", "####..", "....G."],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT"],
    par: 7,
    solutions: [[sc("MOVE"), sc("MOVE"), sc("MOVE"), sc("MOVE"), sc("RIGHT"), sc("MOVE"), sc("MOVE")]],
  },

  // ===================== SECTOR 2 — Operations =====================
  {
    id: 5,
    sector: 2,
    title: "Sample Retrieval",
    brief: "TRANSMISSION // Crystal on the route. Drive over it, run ACTION to collect, then reach the pad.",
    grid: ["S.C.G.", "......"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: true, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION"],
    par: 6,
    solutions: [[sc("MOVE"), sc("MOVE"), sc("ACTION"), sc("MOVE"), sc("MOVE")]],
  },
  {
    id: 6,
    sector: 2,
    title: "Off the Path",
    brief: "TRANSMISSION // The crystal is off the main line. Detour south to grab it, then make the pad.",
    grid: ["S...G.", "..C...", "......"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: true, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION"],
    par: 11,
    solutions: [
      [
        sc("MOVE"),
        sc("MOVE"),
        sc("RIGHT"),
        sc("MOVE"),
        sc("ACTION"),
        sc("LEFT"),
        sc("MOVE"),
        sc("LEFT"),
        sc("MOVE"),
        sc("RIGHT"),
        sc("MOVE"),
      ],
    ],
  },
  {
    id: 7,
    sector: 2,
    title: "Twin Samples",
    brief: "TRANSMISSION // Two crystals on the top row. Collect both, then drop to the pad.",
    grid: ["S.C.C.", "......", "....G."],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: true, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION"],
    par: 10,
    solutions: [
      [
        sc("MOVE"),
        sc("MOVE"),
        sc("ACTION"),
        sc("MOVE"),
        sc("MOVE"),
        sc("ACTION"),
        sc("RIGHT"),
        sc("MOVE"),
        sc("MOVE"),
      ],
    ],
  },
  {
    id: 8,
    sector: 2,
    title: "Signal Relay",
    brief: "TRANSMISSION // A relay beacon needs power. Drive onto it, run ACTION to activate, then reach the pad.",
    grid: ["S....", "..B..", "....G"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: true },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION"],
    par: 10,
    solutions: [
      [
        sc("MOVE"),
        sc("MOVE"),
        sc("RIGHT"),
        sc("MOVE"),
        sc("ACTION"),
        sc("MOVE"),
        sc("LEFT"),
        sc("MOVE"),
        sc("MOVE"),
      ],
    ],
  },

  // ===================== SECTOR 3 — Loops =====================
  {
    id: 9,
    sector: 3,
    title: "Deep Corridor",
    brief: "TRANSMISSION // A long straight corridor. One loop can drive the whole run. Try REPEAT.",
    grid: ["S....G"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: 2,
    solutions: [
      [rep(5, ["MOVE"])],
      [rep(4, ["MOVE"]), sc("MOVE")],
    ],
  },
  {
    id: 10,
    sector: 3,
    title: "Stairwell",
    brief: "TRANSMISSION // The pad sits at the bottom of a stair. Repeat the step pattern to descend.",
    grid: ["S...", "....", "....", "...G"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: false, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: 5,
    solutions: [[rep(3, ["MOVE", "RIGHT", "MOVE", "LEFT"])]],
  },
  {
    id: 11,
    sector: 3,
    title: "Harvest Line",
    brief: "TRANSMISSION // Four crystals in a row, then the pad. Loop a move-and-collect, then finish.",
    grid: ["SCCCCG"],
    startHeading: "E",
    objectives: { reachGoal: true, collectAll: true, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: 6,
    solutions: [[rep(4, ["MOVE", "ACTION"]), sc("MOVE")]],
  },
  {
    id: 12,
    sector: 3,
    title: "Full Circuit",
    brief: "TRANSMISSION // Crystals ring the plateau. One loop walks the whole circuit. Collect them all.",
    grid: ["SCC", "C.C", "CCC"],
    startHeading: "E",
    objectives: { reachGoal: false, collectAll: true, activateAll: false },
    allowedOps: ["MOVE", "LEFT", "RIGHT", "ACTION", "REPEAT"],
    par: 6,
    solutions: [[rep(4, ["MOVE", "ACTION", "MOVE", "ACTION", "RIGHT"])]],
  },
];

export const SECTORS: Record<1 | 2 | 3, { name: string; subtitle: string }> = {
  1: { name: "Movement", subtitle: "DRIVE TRUE" },
  2: { name: "Operations", subtitle: "MAKE CONTACT" },
  3: { name: "Loops", subtitle: "REPEAT THE PATTERN" },
};

export function missionById(id: number): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function missionsInSector(sector: 1 | 2 | 3): Mission[] {
  return MISSIONS.filter((m) => m.sector === sector);
}
