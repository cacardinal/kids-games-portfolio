import { describe, it, expect } from "vitest";
import { webglAvailable } from "./webgl";

describe("webglAvailable", () => {
  it("returns false in a headless environment (fallback path, never a crash)", () => {
    // node vitest env has no document — the mission board must take the flat-Grid path.
    expect(webglAvailable()).toBe(false);
  });
});
