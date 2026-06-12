# Code Quest

A mission-control terminal where you program a rover across alien sectors by stacking command
chips, then hit RUN and watch the telemetry. Sequencing, loops, and debugging for young operators
(built for our 6-year-old and our 8-year-old) — it reads like flight software, not a toy. Finding the bad step
is the whole game.

Part of the five-game kids' portfolio. Fully self-contained: no backend, no network calls, no
analytics. Progress autosaves to `localStorage` per operator.

## Run it

```bash
npm install
npm run dev        # http://localhost:5187  (strict port)
```

Built for iPad Safari (landscape + portrait) and desktop Chrome. Every interaction is tap-first —
no drag required. Sound is on by default with a persisted mute toggle.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port **5187** (binding, `strictPort`). |
| `npm run build` | Type-check (`tsc -b`) + production build to `dist/`. |
| `npm run preview` | Serve the production build. |
| `npm test` | Run the Vitest logic + render suites (`vitest run`). |
| `npm run icons` | Re-render `public/icon-*.png` + `favicon.svg` from `scripts/icon.svg` (uses `sharp`). |

## How it works

- **`src/game/interpreter.ts`** — the pure, frozen-semantics core. `run(mission, program)` returns
  the full tick trace, with `sourceChipId` attribution on every expanded command. MOVE into a
  wall/edge halts with a collision (failing chip + tick); ACTION collects crystals / activates
  beacons / no-ops elsewhere; win is evaluated after **every** tick (a goal tile only completes
  `reachGoal` once the other objectives are already met). REPEAT (depth 1, ×2–5, body 1–6) expands
  inline, preserving source ids. The 20-chip program cap counts **source** chips, never expansion —
  Mission 12 is six source chips that expand to a 20-command circuit.
- **`src/data/missions.ts`** — the 12 hand-traced missions across 3 sectors (Movement →
  Operations → Loops), each with grid, objectives, par, and recorded winning solutions.
- **`src/state/`** — a zustand store (program editing, run/playback, progression) wired to the
  shared save guards; `useRunPlayer` drives RUN at 3 ticks/sec and is StrictMode-safe (the trace
  player never double-runs).
- **`src/components/` + `src/screens/`** — the three-zone mission UI (grid viewport / program rail
  / palette), the rover charm (idle bob, collision slump + dust, victory spin), NASA-style SVG
  sector patches, and the win + patch-mint set-pieces.

## Tests

`npm test` runs eight suites (207 tests):

1. **Interpreter** — movement, rotation, collision tick + source-chip attribution, ACTION
   semantics, instant win, end-without-win.
2. **REPEAT** — expansion order, ×n counts, body invariants, no-nesting enforcement, chip-count
   arithmetic.
3. **Cap** — 20 source-chip limit (incl. the Mission 12 canary: 6 source / 20 expanded = legal).
4. **Missions** — every recorded solution wins; `solutions[0]` ≤ par; sector-3 pars proven
   unreachable without REPEAT by bounded breadth-first search over the loop-free op set.
5. **Integrity** — grids rectangular, exactly one start, goal count matches `reachGoal`, ops
   respect sector gating.
6. **Copy** — collision / end-without-win / success strings match the design's hand-verified
   examples.
7. **Achievements** — badge + cosmetic awarding (incl. the mandatory Debugger badge).
8. **Smoke** — server-render mount check for every screen, every mission grid, every rover skin,
   and the full build → RUN → win and collision store paths.

## Learning arc

- **Sector 1 — Movement** (MOVE / LEFT / RIGHT): playable pre-reading. Icon-first chips and a
  one-tap brief reader (Web Speech) mean the early reader can clear all four missions with zero text.
- **Sector 2 — Operations** (+ ACTION): collect crystals, activate beacons.
- **Sector 3 — Loops** (+ REPEAT): every par is below the shortest loop-free program, so the
  efficiency star forces the loop insight. Mission 9 wraps one MOVE ×5; Mission 12's single
  six-chip loop walks the rover all the way around a plateau.

Sector N+1 unlocks when every mission in sector N is complete (efficiency stars optional). Six
badges and five rover paint jobs are earned by progression — all pure CSS/SVG, surfaced in the
operator profile screen.

## Notes for reviewers

- **Port** 5187 (binding). No router — a top-level view enum in the store drives screens.
- **Stack:** Vite + React + TypeScript, zustand, lucide-react, @fontsource (Space Grotesk /
  JetBrains Mono / Inter). `sharp` is a dev-only dependency for icon rendering. No Tailwind, no
  network libs.
- **Accessibility:** focus-visible rings, `aria-label`s on icon buttons, `prefers-reduced-motion`
  cuts set-pieces to fades and kills particles. Speech is additive — the game is fully playable
  with it off or unavailable.
- Web Speech on iPad Safari is best-effort (per the portfolio's accepted risks).
