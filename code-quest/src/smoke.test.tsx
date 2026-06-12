/**
 * Render smoke test: server-renders components to catch runtime mount crashes the type-checker
 * cannot (bad hook usage, undefined access on first paint). Uses react-dom/server in the existing
 * node vitest env — no browser, no Playwright.
 *
 * NOTE on store-driven screens: zustand v5 returns the store's INITIAL snapshot under
 * renderToString (getServerSnapshot), so screens rendered via <App/> show the cold "profile" view
 * regardless of setState. That is an SSR artifact, not an app bug (the browser client path reads
 * live state). We therefore (a) render prop-driven components directly for real per-mission grid
 * coverage, and (b) assert the store-driven screens MOUNT WITHOUT THROWING, which is the crash
 * signal we actually want from a smoke test.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "./App";
import { Grid } from "./components/Grid";
import { Rover } from "./components/Rover";
import { SectorPatch } from "./components/SectorPatch";
import { ProgramRail } from "./components/ProgramRail";
import { Palette } from "./components/Palette";
import { useStore } from "./state/store";
import { MISSIONS } from "./data/missions";
import { COSMETIC_ORDER } from "./data/cosmetics";

beforeAll(() => {
  const mem = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
    clear: () => mem.clear(),
  };
  (globalThis as Record<string, unknown>).window = globalThis;
});

describe("render smoke — store-driven screens mount without throwing", () => {
  it("cold App (profile picker) renders", () => {
    useStore.setState({ view: "profile", profile: null });
    expect(() => renderToString(createElement(App))).not.toThrow();
    const html = renderToString(createElement(App));
    expect(html).toContain("CODE QUEST");
    expect(html).toContain("operating today"); // apostrophe is HTML-escaped in output
  });

  it("App mounts in every view without throwing", () => {
    useStore.getState().pickProfile("p1");
    for (const view of ["map", "mission", "profileScreen"] as const) {
      useStore.getState().openMission(1);
      useStore.getState().goView(view);
      expect(() => renderToString(createElement(App)), `view ${view}`).not.toThrow();
    }
  });
});

describe("render smoke — every mission grid renders (prop-driven)", () => {
  for (const m of MISSIONS) {
    it(`M${m.id} ${m.title} grid + rover render at start`, () => {
      const html = renderToString(
        createElement(Grid, {
          mission: m,
          step: null,
          collectedKeys: new Set<string>(),
          activatedKeys: new Set<string>(),
          pose: "idle" as const,
          cosmetic: "standard" as const,
          running: false,
          goalShimmer: false,
        }),
      );
      expect(html).toContain('data-testid="rover"');
      expect(html).toContain('data-heading="' + m.startHeading + '"');
    });
  }
});

describe("render smoke — rover renders in every cosmetic skin", () => {
  for (const cos of COSMETIC_ORDER) {
    it(`rover skin ${cos}`, () => {
      expect(() =>
        renderToString(createElement(Rover, { heading: "N", pose: "idle", cosmetic: cos, size: 64 })),
      ).not.toThrow();
    });
  }
});

describe("render smoke — sector patches render", () => {
  for (const sec of [1, 2, 3] as const) {
    it(`sector ${sec} patch`, () => {
      const html = renderToString(createElement(SectorPatch, { sector: sec, size: 120, earned: true }));
      expect(html.length).toBeGreaterThan(100);
      expect(html).toContain("<svg");
    });
  }
});

describe("render smoke — rail + palette render for a sector-3 mission (REPEAT UI present)", () => {
  it("M12 rail + palette", () => {
    const m12 = MISSIONS.find((m) => m.id === 12)!;
    expect(() =>
      renderToString(
        createElement(ProgramRail, {
          program: m12.solutions[0],
          selection: null,
          activeStep: null,
          collisionStep: null,
          running: false,
        }),
      ),
    ).not.toThrow();
    const palette = renderToString(createElement(Palette, { mission: m12, disabled: false }));
    expect(palette).toContain("REPEAT");
  });
});

describe("store logic — full win path drives the store without throwing", () => {
  it("build MOVE MOVE MOVE on M1 and step to win", () => {
    useStore.getState().pickProfile("guest");
    useStore.getState().openMission(1);
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    expect(useStore.getState().program.length).toBe(3);
    for (let i = 0; i < 6; i++) useStore.getState().stepOnce();
    // FIX 3a: win is staged in winPending until the beat timer fires (commitWinBeat).
    // In tests, drive it synchronously.
    useStore.getState().commitWinBeat();
    const st = useStore.getState();
    expect(st.win).not.toBeNull();
    expect(st.win?.missionId).toBe(1);
    expect(st.save.missions[1].completed).toBe(true);
    expect(st.save.badges).toContain("first-contact");
  });

  it("a colliding program sets the collided flag (Debugger precondition)", () => {
    useStore.getState().pickProfile("guest");
    useStore.getState().openMission(3);
    // RIGHT, MOVE, MOVE, MOVE -> turns south too early -> collision at step 4
    useStore.getState().appendOp("RIGHT");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    for (let i = 0; i < 6; i++) useStore.getState().stepOnce();
    expect(useStore.getState().save.missions[3].collided).toBe(true);
    expect(useStore.getState().win).toBeNull(); // did not win
  });

  // FIX 2 — re-arm STEP after a finished run
  it("FIX2: done-after-collision + STEP starts fresh stepping at tick 1", () => {
    useStore.getState().pickProfile("p2");
    useStore.getState().openMission(3);
    // A short program that collides on mission 3.
    useStore.getState().appendOp("RIGHT");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    // Step through all ticks until done (trace length == 4 for this program on M3 collision).
    // Step 20 times to be safe — stepOnce is idempotent once done is entered.
    for (let i = 0; i < 20; i++) useStore.getState().stepOnce();
    const afterCollision = useStore.getState();
    expect(afterCollision.runMode).toBe("done");
    expect(afterCollision.win).toBeNull(); // collision, not a win
    // Now STEP again from "done" — must re-arm into "stepping" at tick 1.
    useStore.getState().stepOnce();
    const rearmed = useStore.getState();
    expect(rearmed.runMode).toBe("stepping");
    expect(rearmed.traceIndex).toBe(0); // tick 1
    expect(rearmed.win).toBeNull(); // win state untouched
  });

  it("FIX2: won mission STEP-mash does not corrupt the win state (win-freeze invariant)", () => {
    useStore.getState().pickProfile("guest");
    useStore.getState().openMission(1);
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    useStore.getState().appendOp("MOVE");
    // Step to win.
    for (let i = 0; i < 6; i++) useStore.getState().stepOnce();
    useStore.getState().commitWinBeat(); // promote winPending -> win
    const wonState = useStore.getState();
    expect(wonState.runMode).toBe("done");
    expect(wonState.win).not.toBeNull();
    const savedWin = wonState.win;
    // Mash STEP multiple times — the win must not be wiped.
    for (let i = 0; i < 5; i++) useStore.getState().stepOnce();
    const afterMash = useStore.getState();
    expect(afterMash.runMode).toBe("done"); // still done
    expect(afterMash.win).toStrictEqual(savedWin); // win object unchanged
    expect(afterMash.save.missions[1].completed).toBe(true); // progress preserved
  });
});
