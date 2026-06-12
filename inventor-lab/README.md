# Inventor Lab

An engineering prototype bench for kids (our 6-year-old and our 8-year-old). You read a one-line build brief on a real drafting sheet, drop ramps, planks, and bouncers onto a glowing blueprint grid, then hit **TEST** and watch your machine run. It almost never works the first time — and that is the entire point. Every failure logs as "Test #3"; every win slams an **APPROVED** stamp and raises a flag at the goal.

Twelve missions across three escalating fantasies:

- **Bridge** (1–5) — span a gap so the rolling ball crosses to the dock.
- **Ball Run** (6–9) — route a falling ball down through obstacles into a basin.
- **Launch** (10–12) — send a ball to knock a crate off its pedestal into the catch basin.

The learning (physics intuition, iteration as a virtue) emerges from play, never from lessons.

## Run it

```bash
npm install
npm run dev        # http://localhost:5185  (strict port)
```

Built for iPad Safari (landscape) and desktop Chrome. Tap-first: every interaction works with discrete taps. Sound is on by default with a per-profile mute toggle; read-aloud (the speaker button) reads any briefing for early readers.

- **Port:** 5185 (binding, `strictPort`).
- **Dev flag:** append `?solve=1` to auto-place a mission's known solution, then press TEST.

## Build & verify

```bash
npx tsc --noEmit   # type check
npm run build      # production build -> dist/
npx vitest run     # all suites, including the headless physics suites
```

## How it is built

- **Vite + React + TypeScript**, zustand (persisted to `localStorage` with corrupt-save guards), lucide-react, `@fontsource` (IBM Plex Mono + Inter). No router, no backend, no network calls.
- **Physics:** `matter-js` pinned **exactly `0.20.0`** (no caret), engine modules only. One deterministic fixed-timestep simulation (`src/game/sim.ts`) is shared by the browser loop (a rAF accumulator that runs fixed `1000/60` slices, capped at 4 steps/frame) and the headless tests (a plain loop). Wall-clock never affects physics. The world is a fixed `1280×720` space; the SVG `viewBox` is `0 0 1280 720` and pointer input maps through the inverse transform.
- **Rendering:** one SVG drafting sheet — terrain, dashed goal target, placed parts (recolored by the current "Blueprint Pen"), and actors. The hero actor carries `data-testid="actor-hero"` with live `data-x`/`data-y` for inspection.
- **Success rule:** the hero's AABB fully inside the goal rect for **≥30 consecutive steps**, within **1200 steps**. Out-of-bounds (`y > 760`, `x < -40`, `x > 1320`) fails. Sim-steps only — the player never sees a clock.

## Project layout

```
src/
  game/      sim.ts (physics), runtime.ts (browser loop), placement.ts, render.ts, types.ts
             __tests__/  physics, sim-units, placement, runtime parity
  state/     zustand store (profiles, progress, cosmetics, persistence)
  components/ SpeakButton, Stars, MuteToggle, ErrorBoundary
  screens/   ProfilePick, Missions, BuildBench, Sheet (SVG), Pens, Log
  data/      levels.ts (the 12 missions), cosmetics.ts, copy.ts
  lib/       sfx.ts, tts.ts, storage.ts, rng.ts
  styles.css design tokens + drafting-sheet atmosphere
```

## Profiles & saving

Three fixed profiles — **Player One**, **Player Two**, **Guest** — each with its own save (`kg.inventor.v1.<id>`). Quitting mid-anything is always safe (autosave on every meaningful change). A corrupt save falls back to a fresh one rather than white-screening; the error boundary offers to reset only the active profile.

## Progression

Three stars per mission: **solved**, **≤ par parts**, **≤ par cost**. Total stars unlock six **Blueprint Pens** (placed-part line color) plus an early-reader-reachable **Workshop Brass** at 5 stars. Six achievements live in the **Engineer's Log**, including **Test Pilot** (run 10 tests) — which rewards trying, not winning. Solved builds are saved to **My Inventions** and can be reloaded.

All twelve missions ship open — no gating.
