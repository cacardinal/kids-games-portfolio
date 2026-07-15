import { describe, it, expect } from "vitest";
import { buildBorderSegments, borderSegmentPositions } from "./borders";

describe("buildBorderSegments", () => {
  it("turns one polyline into consecutive 3D segment pairs", () => {
    const line: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
    ];
    const out = buildBorderSegments([line], 1);
    // 2 segments × 2 endpoints × 3 components
    expect(out.length).toBe(12);
    // first endpoint is lonLat (0,0) → (1,0,0)
    expect(out[0]).toBeCloseTo(1, 6);
    expect(out[1]).toBeCloseTo(0, 6);
    expect(out[2]).toBeCloseTo(0, 6);
  });

  it("keeps every vertex on the requested radius", () => {
    const line: [number, number][] = [
      [-120, 45],
      [-60, -20],
      [30, 60],
    ];
    const r = 1.002;
    const out = buildBorderSegments([line], r);
    for (let i = 0; i < out.length; i += 3) {
      expect(Math.hypot(out[i], out[i + 1], out[i + 2])).toBeCloseTo(r, 6);
    }
  });

  it("ignores degenerate single-point lines", () => {
    const out = buildBorderSegments([[[5, 5]]], 1);
    expect(out.length).toBe(0);
  });
});

describe("borderSegmentPositions (world-atlas)", () => {
  it("produces a non-empty, well-formed segment soup at the lifted radius", () => {
    const r = 1.0015;
    const pos = borderSegmentPositions(r);
    expect(pos.length).toBeGreaterThan(1000);
    expect(pos.length % 6).toBe(0); // whole segments only
    // spot-check radii
    for (let i = 0; i < 60; i += 3) {
      expect(Math.hypot(pos[i], pos[i + 1], pos[i + 2])).toBeCloseTo(r, 5);
    }
  });
});
