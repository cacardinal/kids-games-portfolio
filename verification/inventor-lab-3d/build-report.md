# Inventor Lab — 3D upgrade build report (story 3d-upgrade/04)

**Status:** DONE
**Date:** 2026-07-14

## Test / build results

| Check | Before | After |
|---|---|---|
| `npx vitest run` | 120 passed / 5 files | **138 passed / 6 files** (+18 new `physicsToScene` tests) |
| `npm run build` (tsc -b + vite) | green | **green**, `base: './'` (dist assets are `./assets/...`) |
| `npm run lint` | clean | clean |
| matter-js pin | `0.20.0` exact | **`0.20.0` exact — unchanged** |
| three imports in `src/game/` / `src/state/` | n/a | **none** (grep-verified; physics suites still run canvas-free in plain Node) |

## Architecture

matter-js stays the only physics truth. The 3D bench is a synced VIEW:

- **`physicsToScene.ts`** (pure, zero three.js imports) owns the world↔scene mapping: y-flip + angle negation, per-part extrusion specs mirroring the sim footprints exactly (ramp wedge reuses `render.ts`'s centroid-recentered triangle — TUNING.md finding #1 preserved), goal box spec, the camera rig, and a body→mesh **sync registry** that copies body position/angle onto registered mesh groups each rendered frame.
- **Off-axis camera** (the key trick): a perspective camera offset (+130, +290) from plane center but facing straight down -z, with an asymmetric frustum (`makePerspective`) built so the z=0 physics plane maps EXACTLY (linearly) onto the viewport. 12.9° off straight-on (spec: 10–20°), genuine 3D read (part tops/sides visible), **zero projection error on the interaction plane** — proven by unit test (`world corners → NDC ±1`, linearity).
- **Input**: the SVG stays on top as a transparent input/overlay layer. Placed parts get invisible `PartHitArea` shapes at the same 2D world coords (drag/select/snap logic untouched); ghost, reject cues, path trace, dimension arrow, goal label, chips, flag, APPROVED stamp remain SVG/DOM chrome. Because the plane projection is exact, hit areas and meshes align 1:1.
- **Fallback**: `isWebGLAvailable()` gate — without WebGL the original flat SVG rendering is used unchanged (verified: 0 canvases, mission playable through APPROVED).

## Acceptance criteria — all met

- 3D extruded meshes synced 1:1 to matter bodies (actors synced per frame via the registry from the existing `onFrame` data; placed parts are static bodies at placement coords). Drag verified live: bouncer drag committed (screen 401→377).
- Physics untouched: no changes to `sim.ts`/`runtime.ts`/`placement.ts`/levels; all 120 pre-existing tests (incl. determinism, snap-tolerance, restitution guard) green.
- Workshop register: machined wood (planks/ramps/crates/bench), brushed metal (columns, bouncer chassis), rubber (bouncer pad, hero ball), warm shop key light + ambient/hemisphere fill, 1024 shadow map, blueprint-grid back panel.
- Impact dust + sparks (sparks only above intensity 0.55) driven by the existing force-threshold impact events; goal volume glows green + pulses + point light on success.
- `prefers-reduced-motion`: dust/sparks not rendered at all, glow pulse held static; sim view still runs (verified via emulated media, mission solvable).
- Visibility pause: Canvas `frameloop` flips to `never` on `document.hidden`; `dpr={[1,2]}`; Canvas `aria-label` present (probe-verified).
- Palette/mission/diagnostics DOM untouched (all edits inside the sheet-wrap rendering block).
- No proprietary references, secrets, or real names in the diff; `profiles.local.ts` untouched.

## Files created

- `inventor-lab/src/components/bench3d/physicsToScene.ts` — pure mapping module
- `inventor-lab/src/components/bench3d/__tests__/physicsToScene.test.ts` — 18 headless tests
- `inventor-lab/src/components/bench3d/Bench3D.tsx` — Canvas, camera rig, lights, bench surface, visibility pause, reduced-motion hook
- `inventor-lab/src/components/bench3d/meshes.tsx` — part/terrain/actor mesh factories, goal volume
- `inventor-lab/src/components/bench3d/effects.tsx` — impact dust/spark bursts (disposed on unmount)
- `inventor-lab/src/components/bench3d/materials.ts` — workshop material register (procedural canvas textures, no network)
- `inventor-lab/src/components/bench3d/webgl.ts` — WebGL capability probe

## Files modified

- `inventor-lab/vite.config.ts` — `base: './'` (server block unchanged: 5185/strictPort/host)
- `inventor-lab/src/screens/BuildBench.tsx` — Bench3D under the SVG; SVG transparent + conditional shapes in 3D mode; shared `displayPlacements` for drag-follow
- `inventor-lab/src/screens/Sheet.tsx` — added exported `PartHitArea` (invisible hit twin + selection halo)
- `inventor-lab/eslint.config.js` — `react-hooks/immutability` scoped OFF for `bench3d/**` only (R3F's idiomatic imperative three.js mutation; not React state)
- `inventor-lab/package.json` / `package-lock.json` — new deps

## New dependencies (justification)

- `three` ^0.185.1 — the 3D renderer (story-mandated).
- `@react-three/fiber` ^9.6.1 — React 19-compatible declarative scene graph; lets the 3D view share BuildBench's existing React data flow (`live` state per frame) instead of a second imperative render loop.
- `@react-three/drei` ^10.7.7 — installed per story spec; **currently unused at runtime** (no helper needed survived the final design — everything is hand-rolled to keep the bundle lean and avoid network-loading helpers). Can be dropped if the reviewer prefers.
- `@types/three` ^0.185.1 (dev) — TS types.

Bundle: 1,226 kB minified / 342 kB gzip (three adds ~900 kB raw). Rolldown chunk-size warning only; acceptable for LAN/local serving. Code-splitting deliberately skipped — a lazy Canvas would flash an empty sheet on level open.

## Screenshots (all in this directory)

- `bench-3d.png` — Mission 4 edit view: extruded terrain/ramp/plank, hero rubber ball, goal volume + aligned SVG goal overlay, blueprint panel, wood bench
- `bench-3d-midsim.png` — mid-sim action shot: ball rolling down the ramp (TEST #1 RUNNING)
- `bench-3d-success.png` — success: ball seated in glowing green goal, APPROVED stamp, 3 stars
- `bench-3d-m9.png` — Mission 9 (walls, tilted bouncer)
- `bench-3d-after-drag.png` — after live drag-commit of the bouncer
- `bench-fallback-flat.png` — no-WebGL fallback: original flat view mid-sim
- `bench-3d-reduced-motion.png` — reduced-motion mid-sim: no particles, sim intact

## Deviations / risks

1. **Placed parts render from placement coords, not per-frame body reads.** All placeable parts are static matter bodies (no level allows placing crates), so placement coords ARE the body coords; the SVG view did the same. Dynamic actors are the per-frame synced set.
2. **Ghost/reject/trace/selection stay 2D SVG chrome** on top of the 3D scene — deliberate (drafting-overlay register, and the pack keeps diagnostics DOM).
3. **drei unused** (see deps above).
4. **Lint rule scoped off** for bench3d only (`react-hooks/immutability` vs R3F idiom) — documented in eslint.config.js.
5. Dev server killed after verification; nothing left running on 5185.
