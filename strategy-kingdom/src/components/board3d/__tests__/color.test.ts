import { describe, it, expect } from "vitest";
import { mixHex, clamp01, easeInOut } from "../color";

describe("mixHex", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
  });
  it("mixes midway", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#ff0000", "#0000ff", 0.5)).toBe("#800080");
  });
  it("clamps t outside [0,1]", () => {
    expect(mixHex("#102030", "#405060", -2)).toBe("#102030");
    expect(mixHex("#102030", "#405060", 5)).toBe("#405060");
  });
});

describe("clamp01 / easeInOut", () => {
  it("clamps", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
  });
  it("eases smoothly with fixed endpoints", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
    expect(easeInOut(0.25)).toBeLessThan(0.25); // slow start
  });
});
