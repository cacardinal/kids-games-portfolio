# Build Report — Detective Academy 3D Upgrade (story 3d-upgrade/05)

Lamplit depth office backdrop + 3D CASE CLOSED stamp set piece. Detective is the
most document-centric game, so it gets the most restrained treatment: one 3D
atmosphere layer plus one 3D set piece; every reading surface stays 100% DOM.

## Result: DONE — all gates green

| Gate | Result |
|---|---|
| `npx vitest run` | 385 passed / 7 files (baseline 361; +24 new pure-logic tests) |
| `npm run build` | green, `base: './'`, three.js code-split to lazy chunks |
| `grep -rE "from ['\"](three\|@react-three)" src/game src/state src/data` | no matches |
| Safety sweep (src + verification) | no real names, no absolute paths, no private refs |

## Dependencies added (justification)

- `three`, `@react-three/fiber` (v9, React 19), `@react-three/drei`, `-D @types/three`.
- R3F is the idiomatic declarative bridge to three.js for React 19; drei supplies
  camera/helper primitives. All three-touching code is dynamically imported, so the
  ~880 kB R3F chunk downloads **only when WebGL is present** — the no-WebGL and the
  logic paths never pull it. Build emits separate `OfficeBackdrop` / `Stamp3D` /
  `react-three-fiber` chunks off the main bundle.

## What was built

- `src/components/office3d/webgl.ts` — injectable WebGL probe (headless-testable), cached.
- `src/components/office3d/scene-math.ts` — all pure math (framing, parallax bounds,
  damp, stamp timeline, pixel-match camera distance, mote seeding). Zero three imports
  so it unit-tests in node and no 3D dep can leak toward game/state/data.
- `src/components/office3d/OfficeBackdrop.tsx` — one fixed `<Canvas>` behind the DOM:
  desk edge, back wall, lamp cone + spotlight, venetian blind slats, drifting dust
  motes, per-screen framing (board = full office, case = closer desk crop, result =
  lamp brightens on a solve), gentle pointer parallax (±2.5°). `dpr={[1,2]}`,
  `frameloop` idles to `demand` under reduced motion and `never` when the tab is
  hidden. Canvas + wrapper `aria-hidden`. CSS grain/vignette/scrim layer over the top.
- `src/components/office3d/Stamp3D.tsx` — the 3D CASE CLOSED slam: rubber-stamp tool
  descends and slams onto the DOM-positioned case file, ink burst + camera kick,
  pixel-matched camera so the tool lands on the DOM stamp footprint, then the flat DOM
  imprint takes over. ~950 ms (within the 800–1200 ms bound), skippable after 120 ms.
- `src/App.tsx` — mounts the backdrop as a feature-detected fixed layer; without WebGL
  the flat `.desk` gradient stands and `.desk--3d` is never applied.
- `src/components/CaseClosedStamp.tsx` — wraps the moment; three landing paths, all
  ending in the identical final stamped DOM state (reduced-motion ≤200 ms fade;
  no-WebGL flat drop/impact/rest; WebGL slam).
- `src/styles.css` — `.backdrop3d`/`.stamp3d`/scrim layers; CSS-3D lift/tilt hover+press
  on case folders, clue cards, suspect cards (`perspective`, `rotateX/Y`, `translateZ`,
  `transform-style: preserve-3d`); reduced-motion overrides.
- `vite.config.ts` — `base: './'`; server pinned `port 5183, strictPort, host`.

## Acceptance criteria — verified

- [x] Lamplit backdrop (motes + blind slats + lamp cone) behind DOM on board/case/result
      with gentle pointer parallax; text stays legible (opaque card panels + dark vignette
      scrim keep contrast ≥4.5:1). See `office-3d.png`, `caseview-3d.png`, `result-3d.png`.
- [x] Case/clue/suspect cards have CSS-3D lift/tilt on hover + press.
- [x] Solve plays the 3D stamp slam (skippable) and lands in the same final stamped DOM
      state. See `stamp-slam.png`, `stamp-slam-mid.png`.
- [x] No-WebGL fallback: flat backgrounds + flat stamp, fully playable. See
      `no-webgl-fallback.png` — flat board, all cases openable, no canvas mounted.
- [x] `prefers-reduced-motion`: static single-frame backdrop (motes + parallax skipped,
      frameloop `demand`), ≤200 ms stamp fade. See `reduced-motion.png`.
- [x] Reading surfaces all DOM; backdrop + stamp canvases `aria-hidden`; TTS untouched.
- [x] No three imports in `src/game`, `src/state`, `src/data`; 385 tests green;
      `npm run build` green with `base: './'`.
- [x] No convention violations; no private-system, secret, or real-name references in
      the diff or under `verification/`.

## Screenshots (this directory)

- `office-3d.png` — CaseBoard with the full-office 3D backdrop.
- `caseview-3d.png` — CaseView, closer desk crop.
- `result-3d.png` — Result screen, lamp brightened.
- `stamp-slam.png` / `stamp-slam-mid.png` — 3D CASE CLOSED set piece.
- `reduced-motion.png` — static backdrop under `prefers-reduced-motion`.
- `no-webgl-fallback.png` — flat fallback, fully playable, no canvas.

All captures use the Guest profile ("Player One").

## Residual risks / notes

- R3F chunk is ~880 kB (233 kB gzip); acceptable because it is lazy and WebGL-gated,
  but it is the one large asset. Build prints the standard >500 kB chunk-size warning
  (informational, not a failure).
- WebGL verdict is cached on first probe per session; fallback is decided once at mount,
  which is the intended behavior for a static device capability.
