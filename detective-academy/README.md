# Detective Academy

A real investigation dashboard for kids. You are a detective working warm, low-stakes
cases (a vanished trophy, missing cookies, a swapped backpack). Read the briefing,
examine the evidence, **clear the innocent by citing the clue that clears them**, then
accuse the culprit with two implicating clues. A red CASE CLOSED stamp slams, your
deduction is read back as your achievement, and you earn XP toward six detective ranks.

Built for our 6-year-old (early reader) and our 8-year-old. Reading is the core mechanic, scaffolded
by read-aloud (tap any speaker), attribute icons, and clue-category icons so a pre-literate
player can act by matching, never blocked by parsing. Calm, competent register — the stamp
does the celebrating, never the copy. No ads, no streaks, no dark patterns.

Aesthetic: case-file noir — a desk-lamp pool of light, manila folders, paper grain, brass
fittings, swaying pinboard, ink-stamp set-pieces.

## Run

```bash
npm install
npm run dev        # http://localhost:5183  (strictPort)
```

Played on iPad Safari (landscape + portrait) and desktop Chrome. Tap-first throughout.

## Build & test

```bash
npm run build      # tsc -b && vite build
npm test           # vitest run  (logic core: generator, solver, hints, progression)
npx tsc --noEmit   # type check
npm run icons      # re-render public/icon-*.png from scripts/icon.svg (sharp)
```

## Port

**5183** (binding, `strictPort: true`).

## How it works

- **30 cases**, three difficulty tiers (10 each: 3 / 4 / 5 suspects). Each case is generated
  from its case number as a frozen seed — *Case 12* is always the same case.
- `src/game/generator.ts` builds each case **constructively** (correct by construction,
  attempt-capped at 200) then **self-verifies with the independent solver**.
- `src/game/solver.ts` is an independent brute-force oracle that shares **no helper code**
  with the generator — a shared bug cannot mask itself. The clearing mechanic and hint
  engine run on its semantics.
- `src/game/hints.ts` resolves the best next deduction deterministically (3 escalating tiers).
- Three profiles (Player One / Player Two / Guest), each saved under `kg.detective.v1.<id>`. Autosave
  on every meaningful change; quitting mid-case is always safe. Corrupt saves never
  white-screen (guarded load + root error boundary that resets only the active profile).

## Project layout

```
src/
  game/        generator, solver, hints, progression, case-actions, types  (pure logic, Vitest here)
  state/       zustand store + save shapes
  components/  Button-level atoms, ClueCard, SuspectCard, AccuseModal, set-piece, toasts, ID cards
  screens/     ProfilePicker, CaseBoard, CaseView, ResultScreen, SettingsScreen
  lib/         sfx, tts, storage, rng (shared contract), grain
  styles.css   design tokens + components
public/        manifest.json, icon-512.png, icon-180.png
scripts/       icon.svg + render-icons.mjs
```

Out of scope for v1 (generator is seeded and append-only, so expansion is trivial): cases
31–100, profile-management UI, offline service worker, cloud/LAN deploy.
