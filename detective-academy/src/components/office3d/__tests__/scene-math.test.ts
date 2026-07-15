// Pure-math tests for the 3D office backdrop + stamp set piece (story 3d-upgrade/05).
// No three.js here — this module is plain numbers so it runs in the node test env.

import { describe, expect, it } from "vitest";
import {
  cameraDistanceForPixelMatch,
  clamp,
  damp,
  framingForView,
  moteConeRadiusAt,
  normalizePointer,
  PARALLAX_MAX_RAD,
  parallaxTarget,
  seedMotes,
  STAMP_TIMELINE,
  stampPhaseAt,
  stampTargetFromRects,
} from "../scene-math";

describe("clamp / damp", () => {
  it("clamps below, inside, above", () => {
    expect(clamp(-2, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
    expect(clamp(9, 0, 1)).toBe(1);
  });
  it("damp moves toward the target without overshooting", () => {
    const next = damp(0, 10, 4, 0.016);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
    // large dt converges (never overshoots)
    expect(damp(0, 10, 4, 10)).toBeLessThanOrEqual(10);
  });
});

describe("framingForView — per-screen scene framing", () => {
  it("CaseView frames a closer desk crop than the board", () => {
    expect(framingForView("case").cameraZ).toBeLessThan(framingForView("board").cameraZ);
  });
  it("Result brightens the lamp (solve moment)", () => {
    expect(framingForView("result").lamp).toBeGreaterThan(framingForView("board").lamp);
    expect(framingForView("result").lamp).toBeGreaterThan(framingForView("case").lamp);
  });
  it("every framing keeps the lamp lit and the camera in front of the wall", () => {
    for (const v of ["board", "case", "result"] as const) {
      const f = framingForView(v);
      expect(f.lamp).toBeGreaterThan(0);
      expect(f.cameraZ).toBeGreaterThan(0);
    }
  });
});

describe("pointer parallax", () => {
  it("normalizes the pointer to [-1, 1] with the center at 0", () => {
    expect(normalizePointer(500, 300, 1000, 600)).toEqual({ nx: 0, ny: 0 });
    expect(normalizePointer(0, 0, 1000, 600)).toEqual({ nx: -1, ny: -1 });
    expect(normalizePointer(1000, 600, 1000, 600)).toEqual({ nx: 1, ny: 1 });
  });
  it("stays gentle: never exceeds the max parallax angle, even on wild input", () => {
    const t = parallaxTarget(40, -40);
    expect(Math.abs(t.rotY)).toBeLessThanOrEqual(PARALLAX_MAX_RAD);
    expect(Math.abs(t.rotX)).toBeLessThanOrEqual(PARALLAX_MAX_RAD);
  });
  it("max parallax is a few degrees, not a swing", () => {
    expect(PARALLAX_MAX_RAD).toBeLessThanOrEqual((4 * Math.PI) / 180);
    expect(PARALLAX_MAX_RAD).toBeGreaterThan(0);
  });
  it("moves opposite-ish axes: horizontal pointer yaws, vertical pitches", () => {
    expect(parallaxTarget(1, 0).rotY).not.toBe(0);
    expect(parallaxTarget(1, 0).rotX).toBe(0);
    expect(parallaxTarget(0, 1).rotX).not.toBe(0);
  });
});

describe("stamp slam timeline (GDD-consistent, story-bound 800-1200ms)", () => {
  it("total runtime lands inside the 800-1200ms window", () => {
    expect(STAMP_TIMELINE.restAt).toBeGreaterThanOrEqual(800);
    expect(STAMP_TIMELINE.restAt).toBeLessThanOrEqual(1200);
  });
  it("is skippable early", () => {
    expect(STAMP_TIMELINE.skippableAt).toBeLessThanOrEqual(200);
  });
  it("phases run pre -> impact -> rest in order", () => {
    expect(STAMP_TIMELINE.skippableAt).toBeLessThan(STAMP_TIMELINE.impactAt);
    expect(STAMP_TIMELINE.impactAt).toBeLessThan(STAMP_TIMELINE.successAt);
    expect(STAMP_TIMELINE.successAt).toBeLessThan(STAMP_TIMELINE.restAt);
    expect(stampPhaseAt(0)).toBe("pre");
    expect(stampPhaseAt(STAMP_TIMELINE.impactAt - 1)).toBe("pre");
    expect(stampPhaseAt(STAMP_TIMELINE.impactAt)).toBe("impact");
    expect(stampPhaseAt(STAMP_TIMELINE.restAt - 1)).toBe("impact");
    expect(stampPhaseAt(STAMP_TIMELINE.restAt)).toBe("rest");
    expect(stampPhaseAt(99999)).toBe("rest");
  });
});

describe("pixel-matched perspective camera", () => {
  it("camera distance makes 1 world unit == 1 px at the z=0 plane", () => {
    const fov = 40;
    const h = 800;
    const d = cameraDistanceForPixelMatch(fov, h);
    const worldHeightAtZ0 = 2 * d * Math.tan((fov * Math.PI) / 360);
    expect(worldHeightAtZ0).toBeCloseTo(h, 6);
  });
  it("scales linearly with viewport height", () => {
    expect(cameraDistanceForPixelMatch(40, 1600)).toBeCloseTo(
      2 * cameraDistanceForPixelMatch(40, 800),
      6,
    );
  });
});

describe("stampTargetFromRects — DOM stamp box -> world coords (y-up, origin at canvas center)", () => {
  const canvas = { left: 100, top: 50, width: 600, height: 400 };
  it("maps a centered stamp to the origin", () => {
    const stamp = { left: 300, top: 200, width: 200, height: 100 };
    const t = stampTargetFromRects(stamp, canvas);
    expect(t.x).toBeCloseTo(0);
    expect(t.y).toBeCloseTo(0);
    expect(t.width).toBe(200);
    expect(t.height).toBe(100);
  });
  it("flips the y axis (DOM down -> world up)", () => {
    const stampAboveCenter = { left: 300, top: 100, width: 200, height: 100 };
    expect(stampTargetFromRects(stampAboveCenter, canvas).y).toBeGreaterThan(0);
    const stampBelowCenter = { left: 300, top: 260, width: 200, height: 100 };
    expect(stampTargetFromRects(stampBelowCenter, canvas).y).toBeLessThan(0);
  });
  it("offsets x from the canvas center", () => {
    const stamp = { left: 120, top: 200, width: 100, height: 100 };
    // stamp center x = 170; canvas center x = 400 -> world x = -230
    expect(stampTargetFromRects(stamp, canvas).x).toBeCloseTo(-230);
  });
});

describe("dust motes stay inside the lamp cone", () => {
  it("cone radius interpolates from bulb to desk", () => {
    expect(moteConeRadiusAt(3, 3, -2, 0.3, 2.2)).toBeCloseTo(0.3);
    expect(moteConeRadiusAt(-2, 3, -2, 0.3, 2.2)).toBeCloseTo(2.2);
    const mid = moteConeRadiusAt(0.5, 3, -2, 0.3, 2.2);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(2.2);
  });
  it("seeded motes all sit within the cone volume and are deterministic", () => {
    let s = 42;
    const rand = () => {
      // tiny LCG stand-in for the test
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
    const motes = seedMotes(50, { topY: 3, bottomY: -2, topR: 0.3, bottomR: 2.2 }, rand);
    expect(motes).toHaveLength(50);
    for (const m of motes) {
      expect(m.y).toBeGreaterThanOrEqual(-2);
      expect(m.y).toBeLessThanOrEqual(3);
      const r = Math.hypot(m.x, m.z);
      expect(r).toBeLessThanOrEqual(moteConeRadiusAt(m.y, 3, -2, 0.3, 2.2) + 1e-9);
      expect(m.speed).toBeGreaterThan(0);
    }
  });
});
