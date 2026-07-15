# Build Report — Story 3d-upgrade/02: Code Quest 3D rover terrain

**Status:** DONE
**Date:** 2026-07-15 (finisher pass; original implementation 2026-07-14)
**Branch:** feat/3d-visual-upgrade (git owned by director session)

## Finisher pass (2026-07-15)

Picked up two OPEN issues the prior (terminated) session flagged; both resolved.

**(a) Verification driver landed only 1 chip — TEST-SCRIPT bug, not a UI defect.**
The palette command button and the program-rail chip both render the visible text
"MOVE", so a bare `text=MOVE` selector became ambiguous after the first chip landed
(it matched the palette button AND every rail chip). The DOM was already unambiguous:
palette = `aria-label="Add MOVE"` / class `.palette-chip.op-move`; rail chip =
`aria-label="MOVE, chip N"` / class `.chip`. Fix = target the palette by its unique
accessible name in the driver (`scripts/verify-3d.mjs`). No app markup changed; the
DOM rail stays untouched. Re-run confirms 3 taps → 3 chips.

**(b) Camera framing + lighting.** Tightened the camera so the board fills the frame
(a six-year-old can count tiles at a glance) and lifted the terrain out of near-black:
- `terrainMath.cameraPose`: pulled in (`d = span*0.5 + 1.35`, was `*0.72 + 1.7`),
  slightly lower/steeper rig, fov 38 → 44. Still north-up, still scales with board size
  (cameraPose sanity tests unchanged, green).
- `TerrainScene` lights: ambient 0.75 → 1.0, hemisphere 0.7 → 0.9 (brighter sky term),
  key directional 1.6 → 2.1.
- `Terrain3D` ground/wall palette lifted (`#131c28…` → `#243447…`) so tile seams and
  counts read clearly against the panel.

Before/after screenshots in this folder show the board now filling the viewport with
countable tiles vs. the earlier dark, under-framed board.

**Ops gotcha hit during verification (documented for the next finisher):** on this
machine a KeepAlive supervisor already keeps a dev server on 5187 alive and respawns
it on kill. Running a *second* manual `npm run dev` concurrently made two optimizers
write the same `node_modules/.vite` cache, corrupting it → perpetual
`504 Outdated Optimize Dep` / blank page. Resolution: do NOT start a manual server;
let the existing supervised instance own port 5187 (kill its child once to force a
clean, uncontended re-optimize if the cache is already poisoned).

## Summary

Replaced the flat CSS mission grid on MissionScreen with a low-poly 3D terrain + rover
rendered in a single `<Canvas>` (react-three-fiber), driven read-only by the existing
interpreter trace. The flat `Grid`/`Rover` remain in the tree as the no-WebGL fallback.
Program rail, palette, controls, diagnostics, toasts, and TTS are untouched DOM.

## Tests

| | Files | Tests |
|---|---|---|
| Before | 8 | 209 passed |
| After | 11 | 234 passed (209 existing + 25 new) |

New tests (all headless, no canvas):
- `src/components/terrain/terrainMath.test.ts` (21) — grid→world mapping, deterministic
  tile jitter, yaw unwrapping (90° turns never spin 270°), accumulated yaw over real
  interpreter traces, keyframe derivation (idle/move/turn/collision/action/win),
  collision offset vectors, camera pose sanity, animation durations < 333ms tick.
- `src/components/terrain/webgl.test.ts` (1) — headless env reports no WebGL.
- `src/components/terrain/fallback.test.tsx` (3) — MissionBoard3D renders the flat
  Grid/Rover with correct trace-driven position when WebGL is unavailable; all 12
  mission boards render on the fallback path.

## Build

`npm run build` (tsc -b + vite build) — green. `base: './'` set in vite.config.ts.
Three.js stack is code-split: `TerrainScene-*.js` (~896 kB / 239 kB gzip) loads lazily
only on the WebGL path; the main bundle stays ~255 kB.

`npm run lint`: zero findings in new terrain code. 8 pre-existing errors in untouched
files (PatchMint, WinOverlay, chipGlyph, MissionScreen FIX-3b refs) remain as before.

## Dependencies added (justification)

- `three@0.185`, `@react-three/fiber@9.6` — required 3D engine + React 19 renderer
  (R3F v9 is the React 19-compatible line), per story technical requirements.
- `@react-three/drei@10.7` — used for `PerspectiveCamera` (declarative default camera
  the dolly rig can drive); kept usage minimal so the lazy chunk stays lean.
- `@types/three` (dev) — TS types for refs/materials.

## Architecture

- `src/components/terrain/terrainMath.ts` — PURE math (no three/react imports):
  tile→world mapping, deterministic per-tile height jitter, heading→yaw with
  shortest-arc unwrapping, trace→animation keyframe reducer, camera pose, easing.
  Execution timing truth stays in `src/game` + `src/state/useRunPlayer.ts` (333ms tick);
  the 3D layer only eases toward the keyframe the trace dictates (MOVE 260ms / TURN
  240ms, both < tick).
- `src/components/terrain/Terrain3D.tsx` — board meshes from `parseGridForView` (same
  data as flat grid): ground slabs w/ height variation, chunky wall blocks, goal pad +
  soft light column (pulses; flares on win), crystals (floating octahedra, hide on
  collect), beacons (light up on activate), start ring.
- `src/components/terrain/Rover3D.tsx` — primitive-built rover (hull, cabin, 4 wheels,
  sensor mast + camera head, cosmetic paint from existing COSMETICS). Charm: idle bob +
  mast scan, wheel spin while driving, nose dip on stop, collision lunge/rattle + dust
  puff, win hop + mast twirl. All animation in refs/useFrame — never touches the store.
- `src/components/terrain/TerrainScene.tsx` — the ONE `<Canvas>`: `dpr={[1,2]}`,
  `frameloop="never"` while `document.hidden`, fixed isometric-ish camera framing the
  whole board (north up, tiles countable), gentle dolly on win, lights + shadows,
  `aria-label` on both wrapper (role="img") and the canvas element,
  `webglcontextlost` → flips to flat fallback.
- `src/components/terrain/MissionBoard3D.tsx` — gate: WebGL feature-detect
  (`webgl.ts`, SSR/headless-safe) + error boundary + `React.lazy` so three.js never
  loads on the fallback path. Fallback = original `Grid`/`Rover`, fully playable.
- `src/screens/MissionScreen.tsx` — swapped `<Grid>` for `<MissionBoard3D>` (passes
  trace + traceIndex instead of just the current step). No other changes.

## Acceptance criteria

- [x] 3D terrain from real mission data; rover drives tile-by-tile in sync with the
      interpreter (moves, turns, collision shake+dust with existing diagnostic copy,
      goal win + beacon flare + existing WinOverlay/patch DOM flow).
- [x] Idle/drive/collision character animation; zero impact on execution timing
      (timing lives in useRunPlayer/interpreter; asserted by duration tests).
- [x] No-WebGL fallback to flat grid; game fully playable (fallback.test.tsx + the
      209 pre-existing tests all exercise the headless path).
- [x] prefers-reduced-motion: rover teleports, ≤150ms material fade, no dust/bob/scan,
      no camera dolly motion, static crystals, no goal pulse.
- [x] Program rail/palette/diagnostics untouched DOM; canvas has aria-label.
- [x] No three imports in `src/game/` or `src/state/` (grep-verified).
- [x] All existing tests green; `npm run build` green with `base: './'`.
- [x] No internal/system references, secrets, or real kid names in the diff or under
      verification/ (screenshots use the Guest profile only).

## Files created

- `code-quest/src/components/terrain/terrainMath.ts` + `.test.ts`
- `code-quest/src/components/terrain/webgl.ts` + `.test.ts`
- `code-quest/src/components/terrain/Terrain3D.tsx`
- `code-quest/src/components/terrain/Rover3D.tsx`
- `code-quest/src/components/terrain/TerrainScene.tsx`
- `code-quest/src/components/terrain/MissionBoard3D.tsx`
- `code-quest/src/components/terrain/fallback.test.tsx`
- `verification/code-quest-3d/` — this report + screenshots
- `code-quest/scripts/verify-3d.mjs` — Playwright driver (isolated context, Guest
  profile only): idle + mid-drive + win + collision shots; asserts 3 taps → 3 rail chips

## Files modified

- `code-quest/src/screens/MissionScreen.tsx` — Grid → MissionBoard3D swap only
- `code-quest/vite.config.ts` — `base: './'` + `optimizeDeps.include` for the 3D stack
  (prevents mid-session dev re-optimization 504s on first lazy load)
- `code-quest/package.json` / `package-lock.json` — new deps

## Screenshots

- `verification/code-quest-3d/mission-3d.png` — M01 idle: 3D terrain + rover + rail
  (tightened camera + brighter tiles from the finisher pass)
- `verification/code-quest-3d/mission-3d-running.png` — mid-program drive (rail synced)
- `verification/code-quest-3d/mission-3d-win.png` — win: DOM WinOverlay + patch flow
- `verification/code-quest-3d/mission-3d-collision.png` — collision: rover pitched at the
  north boundary + red failing chip + existing diagnostic ("Collision at step 3. The
  rover hit the north wall.")

## Deviations / risks

- Used `useMemo`-derived dust burst instead of setState-in-effect (lint-clean, purer).
- `optimizeDeps.include` added to vite.config.ts beyond the story's listed config
  changes — dev-only fix for Vite 8's on-demand re-optimization breaking the first
  lazy load of the 3D chunk; no effect on production builds.
- The 3D chunk is ~896 kB minified (three.js floor). Lazy-loaded, so mission-map and
  fallback paths never pay it; acceptable for a local/kids deployment.
- Rover reduced-motion "fade" is a material-opacity fade-in (≤150ms) after teleport —
  interpreting the pack's "≤200ms fades" for a 3D object.
- Pre-existing lint errors (9 total before, 8 after — files untouched by this story)
  still fail `npm run lint`; left alone to avoid touching sibling surfaces.
