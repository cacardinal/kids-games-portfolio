// Headless unit tests for the pure physics→scene mapping module. No three.js, no WebGL, no DOM —
// runs in plain Node alongside the physics suites.
import { describe, it, expect } from "vitest";
import {
  WORLD_W,
  WORLD_H,
  PART_DEPTH,
  MID_Z,
  worldToScene,
  worldAngleToScene,
  bodyToTransform,
  partGeometrySpec,
  actorGeometrySpec,
  terrainGeometrySpec,
  placementToTransform,
  terrainToTransform,
  goalBoxSpec,
  computeCameraRig,
  projectPlanePointToNdc,
  createSyncRegistry,
  type SyncTarget,
} from "../physicsToScene";
import { rampLocalPoints } from "../../../game/render";

describe("world→scene coordinate mapping", () => {
  it("flips y (world is y-down, scene is y-up), keeps x", () => {
    expect(worldToScene(0, 0)).toEqual({ x: 0, y: 720 });
    expect(worldToScene(1280, 720)).toEqual({ x: 1280, y: 0 });
    expect(worldToScene(640, 360)).toEqual({ x: 640, y: 360 });
  });

  it("negates angles (the y-flip mirrors rotation direction)", () => {
    expect(worldAngleToScene(0)).toBe(0);
    expect(worldAngleToScene(Math.PI / 4)).toBeCloseTo(-Math.PI / 4, 12);
    expect(worldAngleToScene(-1.2)).toBeCloseTo(1.2, 12);
  });

  it("bodyToTransform composes position flip + angle negation + z", () => {
    const t = bodyToTransform({ x: 100, y: 700, angle: 0.5 }, -24);
    expect(t.position).toEqual([100, 20, -24]);
    expect(t.rotation[2]).toBeCloseTo(-0.5, 12);
    expect(t.rotation[0]).toBe(0);
    expect(t.rotation[1]).toBe(0);
  });
});

describe("part geometry specs (must mirror sim.ts footprints exactly)", () => {
  it("plank is a 120×16 box", () => {
    expect(partGeometrySpec("plank")).toEqual({ type: "box", w: 120, h: 16, depth: PART_DEPTH });
  });
  it("bouncer is an 80×16 box", () => {
    expect(partGeometrySpec("bouncer")).toEqual({ type: "box", w: 80, h: 16, depth: PART_DEPTH });
  });
  it("crate is a 40×40×40 cube", () => {
    expect(partGeometrySpec("crate")).toEqual({ type: "box", w: 40, h: 40, depth: 40 });
  });
  it("column is a 24×120 box", () => {
    expect(partGeometrySpec("column")).toEqual({ type: "box", w: 24, h: 120, depth: PART_DEPTH });
  });

  it("ramp wedge uses the centroid-recentered triangle from render.ts, y-flipped for the y-up scene", () => {
    const spec = partGeometrySpec("ramp");
    if (spec.type !== "wedge") throw new Error("ramp must be a wedge");
    const expected = rampLocalPoints().map((p) => ({ x: p.x, y: -p.y }));
    expect(spec.points).toEqual(expected);
    expect(spec.depth).toBe(PART_DEPTH);
    // centroid of the recentered triangle is the origin (matter places the body at the centroid)
    const cx = spec.points.reduce((s, p) => s + p.x, 0) / 3;
    const cy = spec.points.reduce((s, p) => s + p.y, 0) / 3;
    // render.ts uses the engine-measured centroid constant 13.333 (not exact thirds) — allow that
    expect(cx).toBeCloseTo(0, 2);
    expect(cy).toBeCloseTo(0, 2);
    // at angle 0 the hypotenuse must read high-left / low-right (TUNING.md finding #1):
    // in scene y-up coords the leftmost points are the tall edge, the rightmost point is low
    const xs = spec.points.map((p) => p.x);
    const right = spec.points[xs.indexOf(Math.max(...xs))];
    const tallest = Math.max(...spec.points.map((p) => p.y));
    expect(right.y).toBeLessThan(tallest);
  });

  it("ball is a sphere of the sim's radius 18; crate actor matches the placed crate cube", () => {
    expect(actorGeometrySpec("ball")).toEqual({ type: "sphere", r: 18 });
    expect(actorGeometrySpec("crate")).toEqual({ type: "box", w: 40, h: 40, depth: 40 });
  });

  it("terrain spec preserves the block's w/h", () => {
    const spec = terrainGeometrySpec({ kind: "platform", x: 10, y: 20, w: 300, h: 40 });
    expect(spec).toMatchObject({ type: "box", w: 300, h: 40 });
  });
});

describe("static transforms", () => {
  it("placementToTransform converts degrees and flips y", () => {
    const t = placementToTransform({ part: "plank", x: 470, y: 540, angleDeg: 16 });
    expect(t.position[0]).toBe(470);
    expect(t.position[1]).toBe(WORLD_H - 540);
    expect(t.rotation[2]).toBeCloseTo((-16 * Math.PI) / 180, 12);
  });

  it("terrainToTransform handles missing angleDeg", () => {
    const t = terrainToTransform({ kind: "wall", x: 100, y: 200, w: 40, h: 300 });
    expect(t.rotation[2]).toBe(0);
    expect(t.position).toEqual([100, WORLD_H - 200, 0]);
  });

  it("goalBoxSpec centers the box on the goal rect (world top-left convention)", () => {
    const g = goalBoxSpec({ x: 1000, y: 600, w: 160, h: 100 });
    expect(g.center[0]).toBe(1080);
    expect(g.center[1]).toBe(WORLD_H - 650);
    expect(g.size[0]).toBe(160);
    expect(g.size[1]).toBe(100);
  });
});

describe("off-axis camera rig", () => {
  it("is 10–20° off straight-on (the story's binding camera spec)", () => {
    const rig = computeCameraRig();
    expect(rig.offAxisDeg).toBeGreaterThanOrEqual(10);
    expect(rig.offAxisDeg).toBeLessThanOrEqual(20);
  });

  it("projects the physics plane EXACTLY onto the viewport: world corners → NDC ±1", () => {
    const rig = computeCameraRig();
    const tl = projectPlanePointToNdc(rig, 0, 0);
    const br = projectPlanePointToNdc(rig, WORLD_W, WORLD_H);
    const c = projectPlanePointToNdc(rig, WORLD_W / 2, WORLD_H / 2);
    expect(tl.x).toBeCloseTo(-1, 9);
    expect(tl.y).toBeCloseTo(1, 9); // world top → NDC top
    expect(br.x).toBeCloseTo(1, 9);
    expect(br.y).toBeCloseTo(-1, 9);
    expect(c.x).toBeCloseTo(0, 9);
    expect(c.y).toBeCloseTo(0, 9);
  });

  it("plane mapping is LINEAR in world coords (so the SVG input overlay lines up 1:1)", () => {
    const rig = computeCameraRig();
    // a point 25% across the world must land 25% across NDC
    const p = projectPlanePointToNdc(rig, WORLD_W * 0.25, WORLD_H * 0.75);
    expect(p.x).toBeCloseTo(-0.5, 9);
    expect(p.y).toBeCloseTo(-0.5, 9);
  });
});

describe("sync registry (body → mesh per-frame copy)", () => {
  function fakeTarget(): SyncTarget & { p: number[]; r: number[] } {
    const t = {
      p: [0, 0, 0],
      r: [0, 0, 0],
      position: { set: (x: number, y: number, z: number) => (t.p = [x, y, z]) },
      rotation: { set: (x: number, y: number, z: number) => (t.r = [x, y, z]) },
    };
    return t;
  }

  it("copies position (y-flipped) + angle (negated) onto registered targets each sync", () => {
    const reg = createSyncRegistry();
    const hero = fakeTarget();
    reg.register(0, hero, MID_Z);
    reg.sync({ 0: { x: 300, y: 500, angle: 0.8 } });
    expect(hero.p[0]).toBe(300);
    expect(hero.p[1]).toBe(WORLD_H - 500);
    expect(hero.p[2]).toBe(MID_Z);
    expect(hero.r[2]).toBeCloseTo(-0.8, 12);

    reg.sync({ 0: { x: 310, y: 490, angle: 1.0 } });
    expect(hero.p).toEqual([310, WORLD_H - 490, MID_Z]);
  });

  it("ignores unknown keys, supports unregister, accepts Maps", () => {
    const reg = createSyncRegistry();
    const a = fakeTarget();
    reg.register("a", a);
    reg.sync({ b: { x: 1, y: 2, angle: 0 } }); // unknown — no throw
    expect(a.p).toEqual([0, 0, 0]);
    reg.sync(new Map([["a", { x: 50, y: 700, angle: 0 }]]));
    expect(a.p[0]).toBe(50);
    reg.unregister("a");
    expect(reg.size()).toBe(0);
    reg.sync({ a: { x: 9, y: 9, angle: 0 } }); // after unregister — no effect
    expect(a.p[0]).toBe(50);
  });
});
