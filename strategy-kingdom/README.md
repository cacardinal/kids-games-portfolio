# Strategy Kingdom

A light Civilization for kids (our 6-year-old · our 8-year-old). You rule a small kingdom across
seasons, and **every decision shows its arithmetic out loud** — assign workers to a
farm and the panel reads `3 workers × 3 = 9 food · 6 people eat 6 · +3 surplus`,
then you press **End Turn** and watch the ledger tick it in with sound. No fail
state: a hungry kingdom just waits.

The visible math is the learning. Numbers stay small (every product ≤ 15, totals in
the low hundreds), so a second-grader does the sum the game is about to do.

## Run

```bash
npm install
npm run dev      # http://localhost:5186  (strictPort — binding)
```

Built for iPad Safari and desktop Chrome. Tap-first: every action works with discrete
taps (no drag required). Sound is on by default with a per-player mute toggle.

## Test / build

```bash
npx tsc --noEmit     # types
npm run build        # tsc -b && vite build
npx vitest run       # 46 tests across 7 required groups
```

The reducer (`src/game/kingdom.ts`) is a pure, fully-deterministic state machine with
no `Math.random` and no React imports. The test suites cover production math,
consumption/growth, building, research, events, **completability** (each scenario's
goals are reachable within its turn limit by a coded strategy), and **determinism**
(same action sequence → identical state).

## How it works

- **Three reigns:** Tutorial (12 seasons, reach 14 people, Counsel-guided), Growth
  (20 seasons, 25 people), Prosperity (24 seasons, 28 people + 80 gold + 6 discoveries).
- **Turn resolution order (binding):** production → consumption → growth → build
  completion → research → event (every 3rd turn). Events fire in a fixed authored
  deck order. Resources floor at 0, never negative.
- **popCap = 8 + 4 × houses** (Census research adds +1 per house). Population grows
  +1 on any surplus turn, up to the cap.
- **The formula is the UI.** The resource bar shows current and projected next-turn
  values; tapping a chip reveals its formula. The End Turn ledger overlay and the
  recap are both built from the reducer's `TurnReport` log — display strings are
  *derived from* the reducer (`src/game/display.ts`), never recomputed, so the
  numbers on screen always match what the reducer applied.
- **Read-aloud:** every Counsel tip and event card has a Read-aloud button (the
  early reader needs it); the +people event option is always the left button so "tap the
  left one to grow" is a learnable rule. The game is fully playable with speech off.
- **Progression:** four ranks (Steward → Reeve → Magistrate → Monarch) by a legible
  score formula, six badges, and six crest banners that wave in the header (and react
  — perk on surplus, droop on deficit). Earned cosmetics are chosen in the Throne Room.

## Saves

One key per player: `kg.kingdom.v1.<p1|p2|guest>`. Autosaves on every action;
quitting mid-reign is always safe and resumes exactly. Corrupt saves fall back to a
fresh kingdom (never a white screen); the error boundary offers a reset.

## Structure

```
src/
  game/       kingdom.ts (pure reducer) · content.ts (economy/decks/copy) · display.ts (math strings)
  game/__tests__/   7 Vitest suites
  state/      store.ts (zustand bridge + campaign progression)
  components/ ResourceBar · PlotGrid · CounselPanel · LedgerOverlay · CrestBanner · RankSeal · …
  screens/    ProfilePicker · ThroneRoom · ReignScreen · RecapScreen
  lib/        sfx · tts · storage · rng  (from the shared contract)
  styles.css  parchment-ledger design tokens
```

## Stack

Vite + React + TypeScript, zustand (localStorage persistence via the shared guards),
lucide-react (UI chrome icons), @fontsource/spectral (display) + @fontsource/inter
(body), Vitest. Synthesized SFX (no audio files), Web Speech for read-aloud
(best-effort on iOS Safari). No backend, no network calls, no analytics.
