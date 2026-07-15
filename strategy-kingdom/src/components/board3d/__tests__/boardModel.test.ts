// boardModel — the pure state→scene mapping the 3D board renders from.
// No three.js, no React: everything here must be testable as plain data.
import { describe, it, expect } from "vitest";
import { initialState, reduce, type KingdomState } from "../../../game/kingdom";
import { SEASONS } from "../../../game/content";
import {
  buildBoardModel,
  tilePosition,
  seasonForState,
  blendPalettes,
  SEASON_PALETTES,
  BOARD_COLS,
  TILE_PITCH,
} from "../boardModel";

const HEX = /^#[0-9a-f]{6}$/i;

describe("buildBoardModel", () => {
  it("maps the initial state: farm on plot 0, lumber camp on plot 1, rest empty", () => {
    const model = buildBoardModel(initialState("tutorial"));
    expect(model.tiles).toHaveLength(12);
    expect(model.tiles[0]).toMatchObject({ index: 0, kind: "built", building: "farm" });
    expect(model.tiles[1]).toMatchObject({ index: 1, kind: "built", building: "lumberCamp" });
    for (const t of model.tiles.slice(2)) {
      expect(t.kind).toBe("empty");
      expect(t.building).toBeNull();
    }
  });

  it("marks queued builds as scaffolds with their building id", () => {
    const s = reduce(initialState("tutorial"), { type: "build", plot: 4, building: "house" });
    const model = buildBoardModel(s);
    expect(model.tiles[4]).toMatchObject({ kind: "queued", building: "house" });
  });

  it("reflects assigned workers and total slots on built tiles", () => {
    let s = initialState("tutorial");
    s = reduce(s, { type: "assignWorker", building: "farm" });
    s = reduce(s, { type: "assignWorker", building: "farm" });
    const model = buildBoardModel(s);
    expect(model.tiles[0].workers).toBe(2);
    expect(model.tiles[0].slots).toBe(3); // one farm × 3 slots
    expect(model.tiles[1].workers).toBe(0);
  });

  it("labels tiles for the DOM selection path exactly like the flat grid", () => {
    const s = reduce(initialState("tutorial"), { type: "build", plot: 4, building: "house" });
    const model = buildBoardModel(s);
    expect(model.tiles[0].label).toBe("Farm, 0 of 3 workers. Adjust workers.");
    expect(model.tiles[4].label).toBe("House, building");
    expect(model.tiles[2].label).toBe("Empty plot 3. Build here.");
  });

  it("grows to 13 tiles when the plots array grows (Surveying)", () => {
    const s = initialState("tutorial");
    const wide: KingdomState = { ...s, plots: [...s.plots, null] };
    expect(buildBoardModel(wide).tiles).toHaveLength(13);
  });
});

describe("tilePosition", () => {
  it("lays tiles on a centered 4-wide grid", () => {
    // 12 tiles → 3 rows of 4, centered on the origin.
    const first = tilePosition(0, 12);
    const last = tilePosition(11, 12);
    expect(first.x).toBeCloseTo(-1.5 * TILE_PITCH);
    expect(first.z).toBeCloseTo(-1 * TILE_PITCH);
    expect(last.x).toBeCloseTo(1.5 * TILE_PITCH);
    expect(last.z).toBeCloseTo(1 * TILE_PITCH);
  });

  it("centers the whole board: positions sum to ~0 for a full grid", () => {
    let sx = 0;
    let sz = 0;
    for (let i = 0; i < 12; i++) {
      const p = tilePosition(i, 12);
      sx += p.x;
      sz += p.z;
    }
    expect(sx).toBeCloseTo(0);
    expect(sz).toBeCloseTo(0);
  });

  it("wraps rows at BOARD_COLS", () => {
    const a = tilePosition(BOARD_COLS - 1, 13);
    const b = tilePosition(BOARD_COLS, 13);
    expect(b.z).toBeGreaterThan(a.z);
    expect(b.x).toBeCloseTo(tilePosition(0, 13).x);
  });
});

describe("season palettes", () => {
  it("defines a palette for all four seasons", () => {
    for (const season of SEASONS) {
      expect(SEASON_PALETTES[season]).toBeDefined();
    }
  });

  it("uses valid hex colors everywhere", () => {
    for (const season of SEASONS) {
      const p = SEASON_PALETTES[season];
      for (const c of [p.backdrop, p.ground, p.groundEmpty, p.ambientColor, p.sunColor, p.foliage]) {
        expect(c).toMatch(HEX);
      }
    }
  });

  it("gives each season a distinct ground color (re-palette is visible)", () => {
    const grounds = SEASONS.map((s) => SEASON_PALETTES[s].ground.toLowerCase());
    expect(new Set(grounds).size).toBe(4);
  });

  it("dusts snow only in winter", () => {
    expect(SEASON_PALETTES.winter.snow).toBe(1);
    expect(SEASON_PALETTES.spring.snow).toBe(0);
    expect(SEASON_PALETTES.summer.snow).toBe(0);
    expect(SEASON_PALETTES.fall.snow).toBe(0);
  });
});

describe("blendPalettes", () => {
  it("returns the endpoints at t=0 and t=1", () => {
    const a = SEASON_PALETTES.spring;
    const b = SEASON_PALETTES.winter;
    expect(blendPalettes(a, b, 0)).toEqual(a);
    expect(blendPalettes(a, b, 1)).toEqual(b);
  });

  it("interpolates numbers midway", () => {
    const a = SEASON_PALETTES.fall;
    const b = SEASON_PALETTES.winter;
    const mid = blendPalettes(a, b, 0.5);
    expect(mid.snow).toBeCloseTo(0.5);
    expect(mid.sunIntensity).toBeCloseTo((a.sunIntensity + b.sunIntensity) / 2);
    expect(mid.sunPosition[1]).toBeCloseTo((a.sunPosition[1] + b.sunPosition[1]) / 2);
    expect(mid.ground).toMatch(HEX);
  });
});

describe("seasonForState", () => {
  it("cycles spring → summer → fall → winter by turn", () => {
    const s = initialState("tutorial");
    expect(seasonForState(s)).toBe("spring");
    expect(seasonForState({ ...s, turn: 2 })).toBe("summer");
    expect(seasonForState({ ...s, turn: 3 })).toBe("fall");
    expect(seasonForState({ ...s, turn: 4 })).toBe("winter");
    expect(seasonForState({ ...s, turn: 5 })).toBe("spring");
  });
});
