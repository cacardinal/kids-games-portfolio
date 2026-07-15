// Tests for the PURE 3D terrain math layer. No three.js, no canvas — runs headless.
// The 3D scene consumes these functions; execution truth stays in src/game.
import { describe, it, expect } from "vitest";
import {
  TILE,
  MOVE_MS,
  TURN_MS,
  tileToWorld,
  tileJitter,
  HEADING_YAW,
  nearestYaw,
  yawAt,
  deriveKeyframe,
  collisionOffset,
  cameraPose,
} from "./terrainMath";
import { run, type Chip, type TraceStep } from "../../game/interpreter";
import { MISSIONS } from "../../data/missions";

const chip = (op: "MOVE" | "LEFT" | "RIGHT" | "ACTION", id: string): Chip => ({ id, op });

describe("tileToWorld", () => {
  it("centers the board on the origin", () => {
    // 6-wide board: x=0 -> -2.5, x=5 -> +2.5
    expect(tileToWorld(0, 0, 6, 3)).toEqual([-2.5 * TILE, -1 * TILE]);
    expect(tileToWorld(5, 2, 6, 3)).toEqual([2.5 * TILE, 1 * TILE]);
  });
  it("odd dimensions put the middle tile exactly at 0", () => {
    expect(tileToWorld(1, 1, 3, 3)).toEqual([0, 0]);
  });
  it("grid y+ (south) maps to world z+", () => {
    const [, zNorth] = tileToWorld(0, 0, 3, 3);
    const [, zSouth] = tileToWorld(0, 2, 3, 3);
    expect(zSouth).toBeGreaterThan(zNorth);
  });
});

describe("tileJitter", () => {
  it("is deterministic per tile", () => {
    expect(tileJitter(3, 4)).toBe(tileJitter(3, 4));
  });
  it("stays in [0, 1)", () => {
    for (let x = 0; x < 8; x++) {
      for (let y = 0; y < 8; y++) {
        const j = tileJitter(x, y);
        expect(j).toBeGreaterThanOrEqual(0);
        expect(j).toBeLessThan(1);
      }
    }
  });
  it("varies across tiles (not constant)", () => {
    const values = new Set<number>();
    for (let x = 0; x < 5; x++) values.add(tileJitter(x, 0));
    expect(values.size).toBeGreaterThan(1);
  });
});

describe("nearestYaw — 90° turns never take the long way round", () => {
  it("returns target when already within a half-turn", () => {
    expect(nearestYaw(0, HEADING_YAW.E)).toBeCloseTo(-Math.PI / 2);
    expect(nearestYaw(0, HEADING_YAW.W)).toBeCloseTo(Math.PI / 2);
  });
  it("W -> N via RIGHT turn is a quarter turn, not a 3/4 spin", () => {
    const from = HEADING_YAW.W; // +PI/2
    const to = nearestYaw(from, HEADING_YAW.N); // 0
    expect(Math.abs(to - from)).toBeCloseTo(Math.PI / 2);
  });
  it("continuous right turns accumulate monotonically (N->E->S->W->N)", () => {
    let yaw = HEADING_YAW.N;
    const seq = ["E", "S", "W", "N"] as const;
    for (const h of seq) {
      const next = nearestYaw(yaw, HEADING_YAW[h]);
      expect(next - yaw).toBeCloseTo(-Math.PI / 2); // clockwise = negative in three.js
      yaw = next;
    }
    expect(yaw).toBeCloseTo(-2 * Math.PI);
  });
  it("continuous left turns accumulate the other way", () => {
    let yaw = HEADING_YAW.N;
    const seq = ["W", "S", "E", "N"] as const;
    for (const h of seq) {
      const next = nearestYaw(yaw, HEADING_YAW[h]);
      expect(next - yaw).toBeCloseTo(Math.PI / 2);
      yaw = next;
    }
    expect(yaw).toBeCloseTo(2 * Math.PI);
  });
});

describe("yawAt — accumulated yaw along a real interpreter trace", () => {
  // Mission 3: start E; program RIGHT, RIGHT, RIGHT, RIGHT spins in place, full clockwise circle.
  const m3 = MISSIONS.find((m) => m.id === 3)!;
  const spin = run(m3, [chip("RIGHT", "a"), chip("RIGHT", "b"), chip("RIGHT", "c"), chip("RIGHT", "d")]);

  it("index -1 is the start heading", () => {
    expect(yawAt(m3.startHeading, spin.trace, -1)).toBeCloseTo(HEADING_YAW.E);
  });
  it("four RIGHTs from E come back around -2PI from the start, never jumping", () => {
    const yaws = [-1, 0, 1, 2, 3].map((i) => yawAt(m3.startHeading, spin.trace, i));
    for (let i = 1; i < yaws.length; i++) {
      expect(yaws[i] - yaws[i - 1]).toBeCloseTo(-Math.PI / 2);
    }
    expect(yaws[4]).toBeCloseTo(HEADING_YAW.E - 2 * Math.PI);
  });
});

describe("deriveKeyframe", () => {
  const m1 = MISSIONS.find((m) => m.id === 1)!; // "S..G" row, start E, 3 moves to win
  const start = { x: 0, y: 1 };
  const win = run(m1, [chip("MOVE", "a"), chip("MOVE", "b"), chip("MOVE", "c")]);

  it("traceIndex -1 = idle at the start tile facing the start heading", () => {
    const kf = deriveKeyframe(start, m1.startHeading, win.trace, -1);
    expect(kf.motion).toBe("none");
    expect(kf.toX).toBe(0);
    expect(kf.toY).toBe(1);
    expect(kf.toYaw).toBeCloseTo(HEADING_YAW.E);
    expect(kf.event).toBeUndefined();
  });

  it("a MOVE step animates from the previous tile to the new one", () => {
    const kf = deriveKeyframe(start, m1.startHeading, win.trace, 0);
    expect(kf.motion).toBe("move");
    expect([kf.fromX, kf.fromY]).toEqual([0, 1]);
    expect([kf.toX, kf.toY]).toEqual([1, 1]);
    expect(kf.fromYaw).toBeCloseTo(kf.toYaw); // no heading change on a straight move
  });

  it("the winning MOVE carries the win event and still animates the move", () => {
    const kf = deriveKeyframe(start, m1.startHeading, win.trace, 2);
    expect(kf.motion).toBe("move");
    expect(kf.event).toBe("win");
    expect([kf.toX, kf.toY]).toEqual([3, 1]);
  });

  it("a turn step is motion 'turn' with a quarter-turn yaw delta and no translation", () => {
    const m3 = MISSIONS.find((m) => m.id === 3)!;
    const r = run(m3, [chip("RIGHT", "a")]);
    const kf = deriveKeyframe({ x: 0, y: 0 }, m3.startHeading, r.trace, 0);
    expect(kf.motion).toBe("turn");
    expect(kf.fromX).toBe(kf.toX);
    expect(kf.fromY).toBe(kf.toY);
    expect(kf.toYaw - kf.fromYaw).toBeCloseTo(-Math.PI / 2);
  });

  it("a collision keeps the rover on its tile and reports the impact direction", () => {
    // Mission 1 grid is 6 wide; driving east 6 times hits the east edge.
    const crash = run(m1, [
      chip("MOVE", "a"), chip("MOVE", "b"), chip("MOVE", "c"),
    ]);
    // m1 wins at G first — use a program that turns north and drives off the top instead.
    const crashNorth = run(m1, [chip("LEFT", "a"), chip("MOVE", "b"), chip("MOVE", "c")]);
    const collIdx = crashNorth.trace.findIndex((s: TraceStep) => s.event === "collision");
    expect(collIdx).toBeGreaterThan(-1);
    const kf = deriveKeyframe(start, m1.startHeading, crashNorth.trace, collIdx);
    expect(kf.motion).toBe("none");
    expect(kf.event).toBe("collision");
    expect(kf.collisionDir).toBe("N");
    expect([kf.fromX, kf.fromY]).toEqual([kf.toX, kf.toY]);
    void crash;
  });

  it("an ACTION step does not translate or rotate", () => {
    const m5 = MISSIONS.find((m) => m.id === 5)!; // sector 2 has ACTION
    const r = run(m5, [chip("ACTION", "a")]);
    const kf = deriveKeyframe({ x: 0, y: 0 }, m5.startHeading, r.trace, 0);
    expect(kf.motion).toBe("none");
    expect(kf.fromYaw).toBeCloseTo(kf.toYaw);
  });
});

describe("collisionOffset", () => {
  it("maps each heading to a unit world-direction (grid N = world -z)", () => {
    expect(collisionOffset("N")).toEqual([0, -1]);
    expect(collisionOffset("S")).toEqual([0, 1]);
    expect(collisionOffset("E")).toEqual([1, 0]);
    expect(collisionOffset("W")).toEqual([-1, 0]);
  });
});

describe("cameraPose", () => {
  it("is elevated, pulled back, and scales with board size", () => {
    const small = cameraPose(4, 3);
    const big = cameraPose(8, 6);
    expect(small.position[1]).toBeGreaterThan(0); // above the board
    expect(small.position[2]).toBeGreaterThan(0); // south of the board (screen-bottom)
    expect(big.position[1]).toBeGreaterThan(small.position[1]); // bigger board = higher camera
    expect(small.fov).toBeGreaterThan(20);
    expect(small.fov).toBeLessThan(60);
  });
});

describe("animation timing constants stay inside the interpreter tick", () => {
  it("move/turn durations fit under the 333ms tick so animation never lags execution", () => {
    expect(MOVE_MS).toBeLessThan(333);
    expect(TURN_MS).toBeLessThan(333);
  });
});
