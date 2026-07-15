// Pure state→scene mapping for the 3D kingdom board. NO three.js, NO React —
// plain data only, so the mapping is unit-testable and the game/state layers
// stay engine-free. Board3D renders FROM this; it never re-derives game math.
import { BUILDINGS, COPY, seasonForTurn, type BuildingId, type Season } from "../../game/content";
import { totalSlots, type KingdomState } from "../../game/kingdom";
import { displaySeason } from "../../game/display";
import { mixHex, clamp01 } from "./color";

// ── Tiles ─────────────────────────────────────────────────────────────────────

export interface TileModel {
  index: number;
  kind: "empty" | "built" | "queued";
  building: BuildingId | null;
  /** Workers assigned to this building TYPE (pooled, matching the reducer). */
  workers: number;
  /** Total slots for this building type across the kingdom. */
  slots: number;
  /** Accessible label — identical wording to the flat grid's buttons. */
  label: string;
}

export interface BoardModel {
  tiles: TileModel[];
  season: Season;
}

export function buildBoardModel(state: KingdomState): BoardModel {
  const queuedAt = new Map<number, BuildingId>();
  for (const q of state.buildQueue) queuedAt.set(q.plot, q.building);

  const tiles: TileModel[] = state.plots.map((b, i) => {
    if (b) {
      const slots = totalSlots(state, b);
      const workers = state.workers[b] ?? 0;
      return {
        index: i,
        kind: "built" as const,
        building: b,
        workers,
        slots,
        label: `${BUILDINGS[b].label}, ${workers} of ${slots} workers. Adjust workers.`,
      };
    }
    const queued = queuedAt.get(i);
    if (queued) {
      return {
        index: i,
        kind: "queued" as const,
        building: queued,
        workers: 0,
        slots: 0,
        label: `${BUILDINGS[queued].label}, building`,
      };
    }
    return {
      index: i,
      kind: "empty" as const,
      building: null,
      workers: 0,
      slots: 0,
      label: `Empty plot ${i + 1}. Build here.`,
    };
  });

  return { tiles, season: seasonForState(state) };
}

// ── Layout ────────────────────────────────────────────────────────────────────

export const BOARD_COLS = 4;
/** Center-to-center tile spacing in world units. */
export const TILE_PITCH = 2.3;
/** Tile plate footprint (leaves a groove between tiles). */
export const TILE_SIZE = 2.02;

/** World-space position of a tile, centered on the origin. */
export function tilePosition(index: number, count: number): { x: number; z: number } {
  const rows = Math.ceil(count / BOARD_COLS);
  const col = index % BOARD_COLS;
  const row = Math.floor(index / BOARD_COLS);
  return {
    x: (col - (BOARD_COLS - 1) / 2) * TILE_PITCH,
    z: (row - (rows - 1) / 2) * TILE_PITCH,
  };
}

// ── Seasons ───────────────────────────────────────────────────────────────────

export function seasonForState(state: KingdomState): Season {
  return seasonForTurn(displaySeason(state));
}

export interface SeasonPalette {
  /** Scene clear color — season-tinted dusk that sits inside the app's dark chrome. */
  backdrop: string;
  /** Grass top of built/occupied tiles. */
  ground: string;
  /** Slightly sunken, untended look for empty plots. */
  groundEmpty: string;
  ambientColor: string;
  ambientIntensity: number;
  sunColor: string;
  sunIntensity: number;
  /** Directional light position. */
  sunPosition: [number, number, number];
  /** Tree/bush foliage accent around the board. */
  foliage: string;
  /** 0..1 roof/plate snow blend. Winter only. */
  snow: number;
}

export const SEASON_PALETTES: Record<Season, SeasonPalette> = {
  spring: {
    backdrop: "#24322a",
    ground: "#6da45e",
    groundEmpty: "#597f4e",
    ambientColor: "#cfe6d2",
    ambientIntensity: 0.55,
    sunColor: "#fff6e4",
    sunIntensity: 1.5,
    sunPosition: [6, 10, 4],
    foliage: "#4f8f4a",
    snow: 0,
  },
  summer: {
    backdrop: "#33301d",
    ground: "#8cab50",
    groundEmpty: "#71883f",
    ambientColor: "#f4e9c8",
    ambientIntensity: 0.6,
    sunColor: "#ffe6a6",
    sunIntensity: 1.85,
    sunPosition: [4, 12, 2],
    foliage: "#5e8f3c",
    snow: 0,
  },
  fall: {
    backdrop: "#33261a",
    ground: "#a8823f",
    groundEmpty: "#84683a",
    ambientColor: "#f0d3a8",
    ambientIntensity: 0.5,
    sunColor: "#ffbf72",
    sunIntensity: 1.45,
    sunPosition: [7, 8, 5],
    foliage: "#b06a2c",
    snow: 0,
  },
  winter: {
    backdrop: "#222a34",
    ground: "#a9b7bd",
    groundEmpty: "#8b9aa2",
    ambientColor: "#d8e2ee",
    ambientIntensity: 0.6,
    sunColor: "#e6eeff",
    sunIntensity: 1.15,
    sunPosition: [8, 7, 6],
    foliage: "#4a6350",
    snow: 1,
  },
};

/** Blend two season palettes (t: 0 = a, 1 = b) for the transition set piece. */
export function blendPalettes(a: SeasonPalette, b: SeasonPalette, t: number): SeasonPalette {
  const k = clamp01(t);
  const n = (x: number, y: number) => x + (y - x) * k;
  return {
    backdrop: mixHex(a.backdrop, b.backdrop, k),
    ground: mixHex(a.ground, b.ground, k),
    groundEmpty: mixHex(a.groundEmpty, b.groundEmpty, k),
    ambientColor: mixHex(a.ambientColor, b.ambientColor, k),
    ambientIntensity: n(a.ambientIntensity, b.ambientIntensity),
    sunColor: mixHex(a.sunColor, b.sunColor, k),
    sunIntensity: n(a.sunIntensity, b.sunIntensity),
    sunPosition: [
      n(a.sunPosition[0], b.sunPosition[0]),
      n(a.sunPosition[1], b.sunPosition[1]),
      n(a.sunPosition[2], b.sunPosition[2]),
    ],
    foliage: mixHex(a.foliage, b.foliage, k),
    snow: n(a.snow, b.snow),
  };
}

/** Board title for the canvas aria-label. */
export function boardAriaLabel(model: BoardModel): string {
  const built = model.tiles.filter((t) => t.kind === "built").length;
  return `${COPY.appTitle} board, ${model.season} season, ${built} buildings. Use the tile list for keyboard play.`;
}
