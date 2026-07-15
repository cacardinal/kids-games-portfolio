// WebGL feature-detection tests (injectable probe so they run headless in node).

import { describe, expect, it } from "vitest";
import { detectWebGL, resetWebGLCache } from "../webgl";

describe("detectWebGL", () => {
  it("true when a webgl2 context is available", () => {
    resetWebGLCache();
    expect(detectWebGL((kind: string) => (kind === "webgl2" ? {} : null))).toBe(true);
  });
  it("true when only webgl1 is available", () => {
    resetWebGLCache();
    expect(detectWebGL((kind: string) => (kind === "webgl" ? {} : null))).toBe(true);
  });
  it("false when no context is available", () => {
    resetWebGLCache();
    expect(detectWebGL(() => null)).toBe(false);
  });
  it("false when the probe throws (blocked WebGL)", () => {
    resetWebGLCache();
    expect(
      detectWebGL(() => {
        throw new Error("blocked");
      }),
    ).toBe(false);
  });
  it("caches the first verdict", () => {
    resetWebGLCache();
    expect(detectWebGL(() => null)).toBe(false);
    // second call with a working probe still returns the cached verdict
    expect(detectWebGL(() => ({}))).toBe(false);
    resetWebGLCache();
  });
});
