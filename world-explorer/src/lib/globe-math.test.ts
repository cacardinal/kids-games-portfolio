import { describe, it, expect } from "vitest";
import {
  lonLatToVec3,
  vec3ToLonLat,
  focusAnglesFor,
  arcPathD,
  GLOBE_UV_LON_OFFSET_OK,
} from "./globe-math";

// Convention under test (matches three.js SphereGeometry UV layout so an
// equirectangular canvas texture lines up with picking):
//   x = r·cos(lat)·cos(lon), y = r·sin(lat), z = -r·cos(lat)·sin(lon)

describe("lonLatToVec3", () => {
  it("places (0°,0°) on +x", () => {
    const [x, y, z] = lonLatToVec3([0, 0], 1);
    expect(x).toBeCloseTo(1, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  it("places (90°E, 0°) on -z", () => {
    const [x, y, z] = lonLatToVec3([90, 0], 1);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(z).toBeCloseTo(-1, 10);
  });

  it("places the north pole on +y", () => {
    const [x, y, z] = lonLatToVec3([0, 90], 1);
    expect(x).toBeCloseTo(0, 10);
    expect(y).toBeCloseTo(1, 10);
    expect(z).toBeCloseTo(0, 10);
  });

  it("scales by radius and stays on the sphere", () => {
    const r = 2.5;
    const [x, y, z] = lonLatToVec3([-73.9, 40.7], r); // NYC-ish
    expect(Math.hypot(x, y, z)).toBeCloseTo(r, 10);
  });
});

describe("vec3ToLonLat", () => {
  it("round-trips lon/lat through vec3 and back", () => {
    const samples: [number, number][] = [
      [0, 0],
      [90, 0],
      [-90, 45],
      [151.2, -33.9], // Sydney
      [-100, 40], // central USA
      [2.35, 48.85], // Paris
      [179, -80],
      [-179, 80],
    ];
    for (const [lon, lat] of samples) {
      const v = lonLatToVec3([lon, lat], 1);
      const [lon2, lat2] = vec3ToLonLat(v);
      expect(lon2).toBeCloseTo(lon, 6);
      expect(lat2).toBeCloseTo(lat, 6);
    }
  });

  it("normalizes non-unit vectors", () => {
    const v = lonLatToVec3([30, 20], 3.7);
    const [lon, lat] = vec3ToLonLat(v);
    expect(lon).toBeCloseTo(30, 6);
    expect(lat).toBeCloseTo(20, 6);
  });
});

describe("focusAnglesFor", () => {
  it("yaw for lon 0 is -90° (brings +x point to face the +z camera)", () => {
    const { yaw } = focusAnglesFor(0, 0);
    expect(yaw).toBeCloseTo(-Math.PI / 2, 10);
  });

  it("pitch equals latitude in radians", () => {
    const { pitch } = focusAnglesFor(0, 45);
    expect(pitch).toBeCloseTo(Math.PI / 4, 10);
  });

  it("rotating the target point by (yaw, pitch) lands it on +z", () => {
    // Verify the math the scene rig relies on: Ry(yaw) then Rx(pitch)
    // maps lonLatToVec3(target) onto [0, 0, 1].
    const cases: [number, number][] = [
      [0, 0],
      [-85, 15],
      [15, 15],
      [115, 5],
      [151, -33],
    ];
    for (const [lon, lat] of cases) {
      const { yaw, pitch } = focusAnglesFor(lon, lat);
      let [x, y, z] = lonLatToVec3([lon, lat], 1);
      // rotate about y by yaw
      const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
      const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      x = x1;
      z = z1;
      // rotate about x by pitch
      const y1 = y * Math.cos(pitch) - z * Math.sin(pitch);
      const z2 = y * Math.sin(pitch) + z * Math.cos(pitch);
      y = y1;
      z = z2;
      expect(x).toBeCloseTo(0, 8);
      expect(y).toBeCloseTo(0, 8);
      expect(z).toBeCloseTo(1, 8);
    }
  });
});

describe("arcPathD", () => {
  it("starts at the origin point and ends at the destination", () => {
    const d = arcPathD(100, 400, 700, 200, 0.3);
    expect(d.startsWith("M 100 400")).toBe(true);
    expect(d.endsWith("700 200")).toBe(true);
    expect(d).toContain("Q");
  });

  it("lifts the control point above the chord (screen y-down)", () => {
    const d = arcPathD(0, 100, 200, 100, 0.5);
    const m = d.match(/Q (-?[\d.]+) (-?[\d.]+),/);
    expect(m).not.toBeNull();
    const cy = Number(m![2]);
    expect(cy).toBeLessThan(100); // above the horizontal chord
  });

  it("zero lift degenerates to the chord midpoint", () => {
    const d = arcPathD(0, 0, 100, 0, 0);
    const m = d.match(/Q (-?[\d.]+) (-?[\d.]+),/);
    expect(Number(m![1])).toBeCloseTo(50, 6);
    expect(Number(m![2])).toBeCloseTo(0, 6);
  });
});

describe("UV alignment guard", () => {
  it("documents that the vec3 convention matches SphereGeometry UVs", () => {
    // three.js SphereGeometry: u=0 → position (-r, 0, 0) at the equator.
    // Equirectangular texture: x=0 → lon -180 → our vec3 (-r, 0, 0). Aligned.
    const [x, y, z] = lonLatToVec3([-180, 0], 1);
    expect(x).toBeCloseTo(-1, 10);
    expect(y).toBeCloseTo(0, 10);
    expect(Math.abs(z)).toBeCloseTo(0, 10);
    expect(GLOBE_UV_LON_OFFSET_OK).toBe(true);
  });
});
