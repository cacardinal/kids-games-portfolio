// View-only grid parsing: turns the ASCII grid into a tile list for rendering.
// Separate from interpreter.parseGrid (which builds the simulation model).

export type TileType = "empty" | "wall" | "crystal" | "beacon" | "goal" | "start";

export interface ViewTile {
  x: number;
  y: number;
  type: TileType;
}

export interface ParsedView {
  width: number;
  height: number;
  start: { x: number; y: number };
  tiles: ViewTile[];
}

const CHAR_TO_TYPE: Record<string, TileType> = {
  ".": "empty",
  "#": "wall",
  C: "crystal",
  B: "beacon",
  G: "goal",
  S: "start",
};

export function parseGridForView(grid: string[]): ParsedView {
  const height = grid.length;
  const width = height > 0 ? grid[0].length : 0;
  const tiles: ViewTile[] = [];
  let start = { x: 0, y: 0 };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const type = CHAR_TO_TYPE[grid[y][x]] ?? "empty";
      if (type === "start") start = { x, y };
      tiles.push({ x, y, type });
    }
  }
  return { width, height, start, tiles };
}
