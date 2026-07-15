# Build Report — Strategy Kingdom 3D Upgrade (Story 3d-upgrade/03)

**App:** `strategy-kingdom/` · dev port 5186 (strictPort) · Vite + React 19 + TS + zustand
**Status:** DONE — all gates green.

## What shipped

The flat plot grid on the reign board was replaced with a low-poly 3D kingdom
rendered purely from game state. The visible-arithmetic ledger, counsel, and all
numbers stay real DOM and were not touched. The 3D layer only reads state; it
never does game math.

New code (all under `strategy-kingdom/src/`):

- `components/board3d/boardModel.ts` — pure `state → BoardModel` mapping + season
  palettes + `blendPalettes` + layout math + `boardAriaLabel`. No three.js, no
  React, so it is unit-testable and keeps `game/`/`state/` engine-free.
- `components/board3d/color.ts` — pure color/easing math (`mixHex`, `easeInOut`, `clamp01`).
- `components/board3d/webgl.ts` — cached WebGL feature detection for the fallback.
- `components/board3d/buildings.tsx` — one visually distinct low-poly mesh per
  building type, built from three.js primitives, no models/textures/network.
- `components/board3d/Board3D.tsx` — the single `<Canvas>`: fixed angled camera,
  season lighting rig, tile plates, selection/affordance rings, construction
  rise + dust, worker pips, ambient clouds, and the skippable season set-piece.
- `components/board3d/KingdomBoard.tsx` — surface switch: 3D when WebGL is
  available (lazy-loaded), flat `PlotGrid` fallback otherwise. Owns the DOM tile
  list and mounts the shared build/worker sheets.
- `components/BuildSheets.tsx` — `BuildSheet` + `WorkerSheet` extracted verbatim
  from `PlotGrid` so the flat and 3D surfaces run the identical flow.

Modified: `screens/ReignScreen.tsx` (mounts `KingdomBoard`, passes `justBuilt`),
`components/PlotGrid.tsx` (now imports the shared sheets), `styles.css`,
`vite.config.ts` (`base: './'`, port 5186 strictPort, optimizeDeps for the 3D chunk).

## Dependency justification

- `three ^0.185`, `@react-three/fiber ^9`, `@react-three/drei ^10` — R3F v9 / drei
  v10 are the React 19-compatible lines. `-D @types/three ^0.185`.
- The 3D board is `React.lazy`-imported, so three.js lands in a **separate chunk**
  (`Board3D-*.js`, ~897 kB / 238 kB gzip) that only loads when the board renders
  on a WebGL device. The base bundle (`index-*.js`) stays ~267 kB / 84 kB gzip.
  The no-WebGL fallback never downloads three.js at all.

## Gates

| Gate | Result |
|------|--------|
| `npx vitest run` | **96 passed / 96** (11 files); story required 76+. New tests cover the state→board mapping and season→palette color math. |
| `npm run build` (`tsc -b && vite build`) | **green**; `base: './'` confirmed — all asset paths in `dist/index.html` are relative (`./assets/...`). |
| `npx eslint .` on story files | **clean** (board3d/*, BuildSheets.tsx, PlotGrid.tsx, ReignScreen.tsx). |
| `grep -rE "from ['\"](three\|@react-three)" src/game src/state` | **no matches** — engine layers stay three-free. |

Note: repo-wide `eslint .` reports 4 pre-existing errors in files this story did
not touch (`game/kingdom.ts`, `screens/RecapScreen.tsx`, a completability test).
They are baseline noise, out of scope for this story, and do not block the build.

## Acceptance criteria

- **3D board from real state; every building type distinct; tap-to-place/assign
  reflects immediately** — 6 building types (farm, lumberCamp, quarry, market,
  library, house) each have their own mesh; tapping a 3D tile opens the shared
  Build/Worker sheet through the same zustand actions as the flat grid.
- **Season set-piece 800–1200ms, skippable; construction rise** — `SEASON_SWEEP_MS
  = 1000`, per-column palette sweep, tap-anywhere skip (`skipRef`), `RisingGroup`
  ease-out-back rise on newly built tiles.
- **No-WebGL fallback → flat PlotGrid, fully playable** — see `fallback-flat.png`
  (flat grid + BuildSheet listing all six buildings).
- **prefers-reduced-motion honored** — collapses the sweep to a 180ms fade
  (`REDUCED_FADE_MS`), drops construction dust, clouds, and the per-column stagger.
- **Ledger/counsel DOM untouched; DOM tile-selection path; canvas aria-label** —
  panels are unchanged DOM; a focusable `nav.tile-dom-list` mirrors every tile for
  keyboard/screen-reader play; the canvas wrapper is `role="img"` with a live
  season/building-count `aria-label`.
- **dpr cap + visibility pause** — `dpr={[1, 2]}`; `frameloop` flips to `"never"`
  while `document.hidden`, stopping the render loop entirely.
- **No convention violations; no leaked references** — kid-audience real-tool
  copy, no emoji chrome; source and this report carry no absolute paths, no real
  names, no secrets.

## Screenshots (1024×768, Guest / Tutorial Reign)

- `board-3d.png` — spring board: green terrain, farm rows, edge trees, empty-plot glow rings, DOM panels intact.
- `board-3d-summer.png` — summer palette.
- `board-3d-winter.png` — season 4 winter: cool re-light, snow-dusted roofs, house mesh.
- `season-sweep-mid.png` — mid-transition palette sweep.
- `scaffold-queued.png` — queued build showing scaffold + ghost mesh.
- `worker-sheet-from-3d.png` — worker sheet opened by tapping a 3D building.
- `fallback-flat.png` — no-WebGL flat PlotGrid with BuildSheet.

Screenshot sanity: 3D board and DOM panels both visible, never a black canvas.

## Residual risks

- The `Board3D` chunk is ~238 kB gzip. It is lazy and off the fallback path, so it
  does not affect first paint or low-end devices, but it is the app's heaviest asset.
- 4 pre-existing repo-wide lint errors remain in untouched files; left as-is to
  keep this story's diff scoped. Worth a separate cleanup pass.
- The `<canvas>` accessibility relies on the `role="img"` wrapper plus the DOM tile
  list; there is no in-canvas focus ring, which is the intended design (keyboard
  play routes through the DOM list, not the canvas).
