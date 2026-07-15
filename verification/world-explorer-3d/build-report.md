# World Explorer — 3D globe upgrade build report

**Story:** `3d-upgrade/01` · **Status:** DONE
**Date:** 2026-07-14 · **App:** `world-explorer/` (port 5184)

## Result

The Atlas centerpiece is now an interactive 3D globe (three + @react-three/fiber + @react-three/drei) built from the same `world-atlas` 110m topojson the flat map uses. Drag-to-spin with inertia and gentle idle auto-rotate, tap-to-explore with the exact selection semantics of the old flat map, visited regions lit in expedition teal, selected country in atlas gold with a pulsing centroid marker, starfield + fresnel rim atmosphere, mission-complete travel arc that hands off to the existing stamp set piece, and a full no-WebGL fallback to the original `WorldMap`.

## Verification

| Gate | Result |
|---|---|
| `npx vitest run` | **66 passed** (44 baseline + 22 new; 0 failures) |
| `npm run build` (`base: './'`) | green (`tsc -b && vite build`) |
| `npm run lint` | clean |
| Console errors during Playwright drive | none |
| Port 5184 | freed after run |

## Screenshots (this directory)

| File | Proof |
|---|---|
| `atlas-globe.png` | Globe on Atlas, full sphere + starfield + rim; 4 seeded americas missions → visited countries lit teal; region tabs / tray intact |
| `atlas-picker-selected.png` | DOM picker → United States: gold fill, pulsing marker, explore card ("Capital · Washington, D.C.") |
| `atlas-globe-tapped.png` | Canvas tap resolved to "United States" via raycast → lon/lat → `geoContains` |
| `atlas-globe-dragged.png` | After a mouse drag the globe has spun away from the Americas frame |
| `arc-flourish.png` | Expedition-complete gold arc, Home → Americas, mid-draw |
| `stamp-after-arc.png` | Existing `StampSetPiece` visible immediately after the arc (handoff intact) |
| `atlas-reduced-motion.png` | `prefers-reduced-motion` context: globe renders on demand frames (no auto-rotate/inertia/pulse) |
| `atlas-fallback-no-webgl.png` | Chromium `--disable-webgl`: old flat `WorldMap` renders, game fully playable |

Screenshots use the neutral **Guest** profile only; no profile-picker frames captured (local `profiles.local.ts` names never appear).

## Acceptance criteria

- [x] 3D globe from real world-atlas topojson; drag (mouse + touch pointer events); tap = same selection path (`onExplore(iso3, name)` into the same Atlas state; ocean tap clears, backdrop countries label-only — identical to flat-map rules, unit-tested in `pick.test.ts`)
- [x] Visited regions visibly distinct (teal fill + lit edge); completion plays arc flourish → existing `StampSetPiece`
- [x] No-WebGL path: feature-detect + local error boundary both render old `WorldMap`
- [x] Reduced motion: no auto-rotate/inertia/pulse; instant region focus; frameloop drops to `demand`; arc flourish collapses to ≤200ms fade
- [x] DOM selection path: new always-visible country picker (`<select>`, 45 featured countries grouped by region, ≥44px control, focus-visible ring) + existing DOM region tabs; canvas + wrapper carry `aria-label`; TTS untouched
- [x] No three.js imports in `src/game/` or `src/state/` (swept; `src/lib/globe-math.ts` is also deliberately three-free); 66 tests green; build green with `base: './'`
- [x] Copy sweep clean: no private references, secrets, or real names in the diff

## Files

**New**
- `src/lib/globe-math.ts` (+ `.test.ts`) — pure lon/lat↔vec3 (UV-aligned with SphereGeometry), focus-angle math, screen arc path
- `src/components/globe/pick.ts` (+ `.test.ts`) — lon/lat → country (geoContains), flat-map-identical resolution
- `src/components/globe/borders.ts` (+ `.test.ts`) — topojson mesh → sphere-surface line segments
- `src/components/globe/texture.ts` — equirectangular canvas painter (ocean/graticule/land/visited/selected)
- `src/components/globe/GlobeScene.tsx` — R3F scene: sphere, borders, atmosphere, stars, drag/inertia/auto-rotate, raycast picking, marker pulse
- `src/components/Globe3D.tsx` — WebGL detect + error-boundary fallback, visibility pause, frameloop policy, `dpr={[1,2]}`, one Canvas
- `src/components/ArcFlourish.tsx` — completion travel arc (DOM/SVG overlay)

**Modified**
- `src/screens/Atlas.tsx` — Globe3D replaces flat map (WorldMap kept as fallback prop), country picker, region-focus easing
- `src/screens/Mission.tsx` — completion now: arc flourish → stamp set piece
- `src/styles.css` — globewrap / globe-picker / arc-flourish sections (appended)
- `vite.config.ts` — `base: './'`
- `package.json` / `package-lock.json` — new deps

## Dependency allowlist deviations (justification)

Added `three@0.185`, `@react-three/fiber@9.6` (R3F v9 = React 19 line), `@react-three/drei@10.7` (Stars backdrop), dev `@types/three` — all four explicitly mandated by the story pack's binding technical requirements; no other deps added.

## Design decisions / deviations

1. **Countries render as a painted equirectangular `CanvasTexture` on the sphere, plus real 3D sphere-surface border-line geometry — not per-country extruded meshes.** Earcut-triangulating 110m polygons in lon/lat and projecting to the sphere makes large countries (Russia, Canada, Brazil) sag below the ocean surface on triangle chords without heavy subdivision work. The texture approach is artifact-free, one draw call, repaints instantly for visited/selected state, and picking is geometry-exact (raycast → lon/lat → `geoContains` on the same features). The story's mesh wording was "welcome", not binding; the binding AC ("globe built from the real world-atlas topojson") is met — texture, borders, and hit-testing all derive from that topology. Raised element retained: border lines float at r=1.0015.
2. **Arc flourish is a DOM/SVG overlay, not a second WebGL canvas.** During a mission the Atlas (and its Canvas) stays mounted behind the overlay; a 3D arc would need a second Canvas on the same screen, violating the one-Canvas rule, or repurposing the paused Atlas canvas behind the scrim (invisible). The SVG arc (Home → region, gold dashed draw, ping, tap-to-skip, reduced-motion ≤200ms fade) satisfies the binding AC "expedition completion plays the arc flourish then the existing stamp set piece" and is cheaper.
3. **Mission gameplay maps stay on the flat `WorldMap`.** The story replaces the *Atlas centerpiece*; locate/route missions depend on the flat continent-zoom tap model (heat feedback, small-target zoom guard), which the GDD treats as game rules. Mission.tsx's map path is untouched apart from the arc handoff.
4. **Frameloop policy:** `always` normally, `demand` under reduced motion (frames only on drag/focus/texture change), `never` when `document.hidden` or when the Atlas sits behind the mission overlay (`view !== "atlas"`), so the globe costs nothing during missions.

## Risks / notes

- Bundle grew to ~1.30MB minified (~373KB gzip) from three/R3F — expected for the mandate; vite chunk-size warning only. Code-splitting the globe behind a dynamic import is a possible follow-up.
- Globe texture palette mirrors `styles.css` tokens as constants in `texture.ts` (canvas can't read CSS custom properties cheaply); a future token change needs the one-line sync noted in that file's comment.
- The no-WebGL fallback shows the flat map at its pre-existing framing (americas continent zoom clamps to scale 1 — unchanged legacy behavior, verified same props as before).
