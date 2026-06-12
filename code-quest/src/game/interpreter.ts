// Code Quest interpreter — PURE module, NO React imports. Binding semantics (spec §"Program model").
// Coordinate convention: grid[y][x], row 0 = top. N=y-1, E=x+1, S=y+1, W=x-1.
// LEFT rotates CCW (N->W->S->E->N). RIGHT rotates CW (N->E->S->W->N).

export type Heading = "N" | "E" | "S" | "W";
export type SimpleOp = "MOVE" | "LEFT" | "RIGHT" | "ACTION";
export type Op = SimpleOp | "REPEAT";

export type Chip =
  | { id: string; op: SimpleOp }
  | { id: string; op: "REPEAT"; times: 2 | 3 | 4 | 5; body: Chip[] };

export interface Mission {
  id: number;
  sector: 1 | 2 | 3;
  title: string;
  brief: string;
  grid: string[]; // rows; chars: "." empty, "#" wall, "C" crystal, "B" beacon, "G" goal, "S" start
  startHeading: Heading;
  objectives: { reachGoal: boolean; collectAll: boolean; activateAll: boolean };
  allowedOps: Op[]; // sector gating
  par: number; // source-chip count
  solutions: Chip[][]; // >=1 recorded winning program; solutions[0] chipCount <= par
}

export type TraceEvent = "collect" | "activate" | "collision" | "win" | "end";

export interface TraceStep {
  tick: number;
  sourceChipId: string;
  command: SimpleOp;
  rover: { x: number; y: number; heading: Heading };
  event?: TraceEvent;
  // Extra forensics (UI copy needs these; tests assert against them):
  collisionWall?: "edge" | "barrier"; // grid edge vs interior "#"
  collisionDir?: Heading; // heading at moment of impact
  noop?: boolean; // ACTION on empty tile
}

export const PROGRAM_CAP = 20; // source-chip cap
export const REPEAT_BODY_CAP = 6;
export const REPEAT_MIN_TIMES = 2;
export const REPEAT_MAX_TIMES = 5;

// ---- Chip counting (par / cap arithmetic): a REPEAT chip + each body chip count once each.
export function chipCount(program: Chip[]): number {
  let n = 0;
  for (const c of program) {
    n += 1; // the chip itself
    if (c.op === "REPEAT") n += c.body.length; // body chips, each once (no nesting => no recursion needed)
  }
  return n;
}

// ---- Expansion: inline-expand REPEAT, preserving the SOURCE chip id on every emitted command.
//      No nested REPEAT (depth 1) — enforced by the Chip type; we also guard at runtime.
interface ExpandedCommand {
  sourceChipId: string;
  op: SimpleOp;
}

export function expand(program: Chip[]): ExpandedCommand[] {
  const out: ExpandedCommand[] = [];
  for (const c of program) {
    if (c.op === "REPEAT") {
      for (let i = 0; i < c.times; i++) {
        for (const b of c.body) {
          if (b.op === "REPEAT") {
            // Defensive: nested REPEAT is illegal (depth 1). Skip its body's REPEATs flatly.
            throw new Error("Nested REPEAT is not allowed (depth 1).");
          }
          out.push({ sourceChipId: b.id, op: b.op });
        }
      }
    } else {
      out.push({ sourceChipId: c.id, op: c.op });
    }
  }
  return out;
}

// Total number of expanded commands a program will execute if uninterrupted.
export function expandedLength(program: Chip[]): number {
  return expand(program).length;
}

// ---- Grid parsing into a mutable cell model the run can mutate (collect/activate).
interface ParsedGrid {
  width: number;
  height: number;
  start: { x: number; y: number };
  goal: { x: number; y: number } | null;
  walls: Set<string>; // "x,y"
  crystals: Set<string>; // "x,y"
  beacons: Set<string>; // "x,y"
}

function key(x: number, y: number) {
  return `${x},${y}`;
}

export function parseGrid(grid: string[]): ParsedGrid {
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  let start: { x: number; y: number } | null = null;
  let goal: { x: number; y: number } | null = null;
  const walls = new Set<string>();
  const crystals = new Set<string>();
  const beacons = new Set<string>();
  for (let y = 0; y < height; y++) {
    const row = grid[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      switch (ch) {
        case "S":
          start = { x, y };
          break;
        case "G":
          goal = { x, y };
          break;
        case "#":
          walls.add(key(x, y));
          break;
        case "C":
          crystals.add(key(x, y));
          break;
        case "B":
          beacons.add(key(x, y));
          break;
        case ".":
          break;
        default:
          break;
      }
    }
  }
  if (!start) throw new Error("Grid has no start tile (S).");
  return { width, height, start, goal, walls, crystals, beacons };
}

// ---- Rotation tables.
const RIGHT_OF: Record<Heading, Heading> = { N: "E", E: "S", S: "W", W: "N" };
const LEFT_OF: Record<Heading, Heading> = { N: "W", W: "S", S: "E", E: "N" };
const DELTA: Record<Heading, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

export interface RunResult {
  trace: TraceStep[];
  won: boolean;
  // Final tallies for end-without-win diagnostics:
  crystalsRemaining: number;
  beaconsRemaining: number;
  reachedGoalWithoutWin: boolean; // stepped onto G but objectives unmet at least once
}

function objectivesMet(
  m: Mission,
  crystalsLeft: number,
  beaconsLeft: number,
  onGoalSatisfiesReach: boolean,
): boolean {
  const collectOk = !m.objectives.collectAll || crystalsLeft === 0;
  const activateOk = !m.objectives.activateAll || beaconsLeft === 0;
  if (!collectOk || !activateOk) return false;
  // reachGoal: must be standing on the goal tile (and goal exists).
  if (m.objectives.reachGoal) {
    // onGoalSatisfiesReach is true only when we have a goal and pos == goal.
    return onGoalSatisfiesReach;
  }
  return true;
}

// run(mission, program) -> full tick trace. Pure: does not mutate inputs.
export function run(mission: Mission, program: Chip[]): RunResult {
  const g = parseGrid(mission.grid);
  const crystals = new Set(g.crystals);
  const beacons = new Set(g.beacons);
  const commands = expand(program);

  let x = g.start.x;
  let y = g.start.y;
  let heading = mission.startHeading;
  const trace: TraceStep[] = [];
  let reachedGoalWithoutWin = false;

  const isGoal = (px: number, py: number) => g.goal !== null && px === g.goal.x && py === g.goal.y;

  const checkWin = (px: number, py: number): boolean => {
    const onGoal = isGoal(px, py);
    const reachSatisfied = mission.objectives.reachGoal ? onGoal : true;
    return objectivesMet(mission, crystals.size, beacons.size, reachSatisfied);
  };

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const tick = i + 1;

    if (cmd.op === "MOVE") {
      const { dx, dy } = DELTA[heading];
      const nx = x + dx;
      const ny = y + dy;
      const offEdge = nx < 0 || ny < 0 || nx >= g.width || ny >= g.height;
      const intoWall = !offEdge && g.walls.has(key(nx, ny));
      if (offEdge || intoWall) {
        // Collision: rover stays put, trace ends.
        trace.push({
          tick,
          sourceChipId: cmd.sourceChipId,
          command: "MOVE",
          rover: { x, y, heading },
          event: "collision",
          collisionWall: intoWall ? "barrier" : "edge",
          collisionDir: heading,
        });
        return {
          trace,
          won: false,
          crystalsRemaining: crystals.size,
          beaconsRemaining: beacons.size,
          reachedGoalWithoutWin,
        };
      }
      x = nx;
      y = ny;
      // Win evaluated after the move.
      if (checkWin(x, y)) {
        trace.push({
          tick,
          sourceChipId: cmd.sourceChipId,
          command: "MOVE",
          rover: { x, y, heading },
          event: "win",
        });
        return {
          trace,
          won: true,
          crystalsRemaining: crystals.size,
          beaconsRemaining: beacons.size,
          reachedGoalWithoutWin,
        };
      }
      // Stepped onto goal but objectives not met -> goal shimmers (visual), not a win.
      if (isGoal(x, y)) reachedGoalWithoutWin = true;
      trace.push({
        tick,
        sourceChipId: cmd.sourceChipId,
        command: "MOVE",
        rover: { x, y, heading },
      });
      continue;
    }

    if (cmd.op === "LEFT" || cmd.op === "RIGHT") {
      heading = cmd.op === "RIGHT" ? RIGHT_OF[heading] : LEFT_OF[heading];
      // A pure rotation cannot newly satisfy reachGoal/collect/activate, but win is still
      // evaluated after every tick per spec (harmless; only matters if already standing on goal
      // with objectives that just became... they can't via a turn, so this is a no-op win-wise).
      if (checkWin(x, y)) {
        trace.push({
          tick,
          sourceChipId: cmd.sourceChipId,
          command: cmd.op,
          rover: { x, y, heading },
          event: "win",
        });
        return {
          trace,
          won: true,
          crystalsRemaining: crystals.size,
          beaconsRemaining: beacons.size,
          reachedGoalWithoutWin,
        };
      }
      trace.push({
        tick,
        sourceChipId: cmd.sourceChipId,
        command: cmd.op,
        rover: { x, y, heading },
      });
      continue;
    }

    // ACTION
    {
      const here = key(x, y);
      let event: TraceEvent | undefined;
      let noop = false;
      if (crystals.has(here)) {
        crystals.delete(here);
        event = "collect";
      } else if (beacons.has(here)) {
        beacons.delete(here);
        event = "activate";
      } else {
        noop = true; // harmless no-op
      }
      // Win evaluated after the action (a collect/activate may complete objectives).
      if (checkWin(x, y)) {
        trace.push({
          tick,
          sourceChipId: cmd.sourceChipId,
          command: "ACTION",
          rover: { x, y, heading },
          event: "win",
          noop: noop || undefined,
        });
        return {
          trace,
          won: true,
          crystalsRemaining: crystals.size,
          beaconsRemaining: beacons.size,
          reachedGoalWithoutWin,
        };
      }
      trace.push({
        tick,
        sourceChipId: cmd.sourceChipId,
        command: "ACTION",
        rover: { x, y, heading },
        event,
        noop: noop || undefined,
      });
      continue;
    }
  }

  // Program exhausted without win.
  if (trace.length > 0) {
    trace.push({
      tick: trace.length + 1,
      sourceChipId: trace[trace.length - 1].sourceChipId,
      command: trace[trace.length - 1].command,
      rover: { x, y, heading },
      event: "end",
    });
  } else {
    // Empty program (no commands) — produce a single end marker at the start tile.
    trace.push({
      tick: 0,
      sourceChipId: "",
      command: "ACTION",
      rover: { x: g.start.x, y: g.start.y, heading: mission.startHeading },
      event: "end",
    });
  }
  return {
    trace,
    won: false,
    crystalsRemaining: crystals.size,
    beaconsRemaining: beacons.size,
    reachedGoalWithoutWin,
  };
}

// ---- Validation helpers used by the store / UI (NOT the trace).
export function canAppendChip(program: Chip[]): boolean {
  return chipCount(program) < PROGRAM_CAP;
}

export function canAppendToLoop(repeat: Extract<Chip, { op: "REPEAT" }>, program: Chip[]): boolean {
  if (repeat.body.length >= REPEAT_BODY_CAP) return false;
  return chipCount(program) < PROGRAM_CAP;
}
