/**
 * No-WebGL fallback: in a headless environment MissionBoard3D must render the
 * original flat Grid + Rover (fully playable), and must NOT attempt to load three.js.
 */
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { MissionBoard3D } from "./MissionBoard3D";
import { MISSIONS } from "../../data/missions";
import { run } from "../../game/interpreter";
import type { Chip } from "../../game/interpreter";

const chip = (op: "MOVE" | "LEFT" | "RIGHT", id: string): Chip => ({ id, op });

describe("MissionBoard3D headless fallback", () => {
  const m1 = MISSIONS.find((m) => m.id === 1)!;

  it("renders the flat grid rover when WebGL is unavailable", () => {
    const html = renderToString(
      createElement(MissionBoard3D, {
        mission: m1,
        trace: [],
        traceIndex: -1,
        collectedKeys: new Set<string>(),
        activatedKeys: new Set<string>(),
        pose: "idle" as const,
        cosmetic: "standard" as const,
        running: false,
        goalShimmer: false,
      }),
    );
    expect(html).toContain('data-testid="rover"');
    expect(html).toContain('data-heading="E"');
    expect(html).not.toContain("canvas");
  });

  it("fallback reflects mid-run trace state (rover at the traced tile)", () => {
    const result = run(m1, [chip("MOVE", "a"), chip("MOVE", "b")]);
    const html = renderToString(
      createElement(MissionBoard3D, {
        mission: m1,
        trace: result.trace,
        traceIndex: 0, // after the first MOVE: x moves 0 -> 1
        collectedKeys: new Set<string>(),
        activatedKeys: new Set<string>(),
        pose: "moving" as const,
        cosmetic: "standard" as const,
        running: true,
        goalShimmer: false,
      }),
    );
    expect(html).toContain('data-x="1"');
    expect(html).toContain('data-y="1"');
  });

  it("renders every mission's board on the fallback path without throwing", () => {
    for (const m of MISSIONS) {
      expect(() =>
        renderToString(
          createElement(MissionBoard3D, {
            mission: m,
            trace: [],
            traceIndex: -1,
            collectedKeys: new Set<string>(),
            activatedKeys: new Set<string>(),
            pose: "idle" as const,
            cosmetic: "standard" as const,
            running: false,
            goalShimmer: false,
          }),
        ),
      ).not.toThrow();
    }
  });
});
