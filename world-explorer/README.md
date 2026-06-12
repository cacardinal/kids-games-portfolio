# World Explorer

A premium atlas / expedition-journal game for kids (our 6-year-old · our 8-year-old). You open
a linen world map under lamplight, pick a boarding-pass mission, and go find a
place — by where chocolate began, by a landmark's silhouette, by tracing a storied
route, or by judging which country is bigger. Every find lands a passport stamp
with a real ink-thunk, and the fact you uncovered files itself into your Explorer
Log. The book fills, covers unlock, three regions open in turn.

App #2 of the five-game kids portfolio. Self-contained: no backend, no network
calls, no analytics. Plays on iPad Safari and desktop Chrome.

## Run

```bash
npm install
npm run dev      # http://localhost:5184  (strict port)
```

Other scripts:

```bash
npm run build        # tsc -b + vite build → dist/
npm run preview      # serve the production build
npx tsc --noEmit     # type-check (note: real gate is `tsc -b`, run by build)
npx vitest run       # logic test suites (see below)
```

**Port: 5184** (binding, `strictPort`).

## How it plays

- **Who's exploring?** — pick Player One, Player Two, or Guest (three fixed profiles, one
  save each in `localStorage` under `kg.world-explorer.v1.<profile>`).
- **Atlas** — a world map framed on the active region, region tabs, and a tray of
  boarding-pass mission cards. Three regions: Americas → Europe & Africa →
  Asia & Oceania (each unlocks after ≥4 missions in the prior region).
- **Missions** (18 total, 6 per region): _locate_, _landmark_, _route_, _compare_.
  - Locate / landmark: tap a country; wrong taps give warmer/colder feedback;
    after 2 misses the map auto-zooms to help; the 3rd miss reveals the answer
    with a dignified one-liner. First correct tap earns a star.
  - Route: tap waypoints in order; out-of-order taps bounce and forfeit the star;
    a finished route draws a gold dotted line across the map.
  - Compare: tap the country you think is bigger / more populous; both cards flip
    to show the real numbers (the learning moment), winner ringed gold.
- **Passport** — region stamp pages, 5 unlockable covers, 6 badges.
- **Explorer Log** — every discovered fact, each with a read-aloud button.
- **Settings** — sound on/off, text size, switch explorer, reset this profile.

### Made for a 6-year-old too

Every mission card has a large read-aloud button; landmark cards _are_ a
silhouette; the 6 locate missions carry a picture-hint icon; warmer/colder speaks
in colour and motion before any word; auto-zoom + reveal mean a pre-reader can
never get stuck.

## Tech

- Vite + React + TypeScript, zustand (localStorage with corruption guards),
  lucide-react, Fraunces + Inter (`@fontsource`). Hand-rolled CSS custom
  properties (no Tailwind/UI kit/animation lib). All juice is CSS/SVG.
- **Map:** bundled `world-atlas@2` `countries-110m` topology, parsed with
  `topojson-client`, projected with `d3-geo` (`geoNaturalEarth1`, fit to the
  viewport; per-continent / per-route zoom by fitting projected bounds). One SVG
  `<path>` per country; mission answers keyed by ISO numeric (`feature.id`),
  bridged from the GDD's iso3.
- **Sound:** synthesized via Web Audio (`src/lib/sfx.ts`) — zero asset files.
  Mute persists per profile.
- **Read-aloud:** Web Speech (`src/lib/tts.ts`), additive only — fully playable
  with speech off/unavailable; only fires from tap handlers (iOS gesture gating).

## Project layout

```
src/
  game/        pure logic + Vitest (geo, compare, progress, data-integrity)
  state/       zustand store
  components/  WorldMap, StampSetPiece, MissionPass, Stamp, Silhouettes, …
  screens/     ProfilePicker, Atlas, Mission, Passport, Log, Settings
  data/        countries / landmarks / routes / missions / atlas (topojson)
  lib/         sfx, tts, storage, rng, motion  (from the shared contract)
  styles.css   design tokens + component classes
public/        manifest.json, icon-512.png, icon-180.png, icon.svg
scripts/       make-icons.mjs (one-off icon renderer)
```

## Tests

`npx vitest run` — five required suites (35 assertions):

1. **Data integrity** (the critical one) — every mission/landmark/route reference
   resolves; every `isoN3` exists in the bundled topojson; every route waypoint
   exists; the Director's Borobudur amendment is in place.
2. **Compare correctness** — derived winner matches stored values; every pair is
   ≥2.5× apart.
3. **Unlock logic** — region gating at the ≥4 threshold; frozen-first-result
   economy.
4. **geo.ts** — centroid / distance sanity.
5. **Warmer/colder classifier** — monotonic with distance.

## Content note

All facts are canonical basics (capitals, famous landmarks, origins, approximate
population/area). `src/data/` is the single source — skim it before kid use.

## Accessibility

Focus-visible rings, ≥44–48px hit targets, `aria-label`s on icon buttons,
`prefers-reduced-motion` collapses set-pieces and kills particles, a "Large" text
size, and an error boundary that offers to reset only the active profile's save
(never a white screen).
