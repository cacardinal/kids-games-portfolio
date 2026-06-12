# Kids Games Portfolio — Master Plan

> **Audience:** every agent on this project (designers, engineers, QA, critics, fixers) reads THIS file first, then `specs/shared-design.md`, then their app's spec in `specs/`. Engineers additionally read their approved GDD in `specs/gdd/`.

**Goal:** Five self-contained educational React web games for our 6-year-old (early reader) and our 8-year-old that feel like real professional tools, not children's software — and that the kids will CHOOSE over the ad-funded iPad games they currently play.

**Design pillars (every decision serves these):**
1. Kids feel competent, not patronized.
2. Real depth and progression (Duolingo / Chess.com / NYT Games register, adapted for young players).
3. Learning emerges from play, never from lessons.
4. A kid would pick this over an ad-funded game — engagement through game feel, atmosphere, and ownership, never through manipulation (no ads, no dark patterns, no streaks/FOMO).

Sessions are 5–15 minutes, always safe to quit (autosave), enjoyable for adults too. Played on iPad Safari and desktop Chrome.

## The Five Apps

| # | App | Dir | Port | Core fantasy | Learning |
|---|-----|-----|------|--------------|----------|
| 1 | Detective Academy | `detective-academy` | 5183 | Real investigation dashboard | Reading, deduction, justification |
| 2 | World Explorer | `world-explorer` | 5184 | Premium travel/atlas app | Geography, cultures, landmarks |
| 3 | Inventor Lab | `inventor-lab` | 5185 | Engineering blueprint bench | Physics intuition, iteration |
| 4 | Strategy Kingdom | `strategy-kingdom` | 5186 | Light Civilization | Arithmetic, planning, trade-offs |
| 5 | Code Quest | `code-quest` | 5187 | Mission-control terminal | Sequencing, loops, debugging |

Ports are binding (`strictPort: true`). 5180–5182 and 5174/3000 belong to other systems on this machine.

## Architecture

Five fully independent Vite + React + TypeScript apps in sibling directories. **No shared packages** — consistency comes from `specs/shared-design.md`, which contains copy-paste reference code for the genuinely shared primitives (sfx, tts, PRNG, save guard). Each app owns its `package.json` + committed lockfile.

**Engine decision (considered and rejected: Phaser / Three.js / Babylon.js):** four of five apps are document/board UIs — DOM/SVG territory; the fifth needs only a physics *library* (matter-js), not an engine. Engines render into opaque canvas, which would (a) destroy the Playwright QA assertion surface, (b) break headless deterministic physics tests, (c) bypass DOM accessibility (TTS, focus, text scaling), and (d) raise one-shot build risk. All needed juice (stamps, toasts, tile-to-tile motion, particles) is CSS/SVG. Exception clause: a future arcade-style app (timing/sprites/action) should use Phaser.

**Stack:** Vite + React + TS, zustand (persist → localStorage), lucide-react, @fontsource fonts, hand-rolled CSS custom properties (no Tailwind), Vitest for logic cores. matter-js exact-pinned (Inventor only). d3-geo + topojson-client + world-atlas (Explorer only). No router, no backend, no runtime network calls, no analytics.

## Studio Model

Each game is developed by a team of differentiated roles; the orchestrating session (Fable) is the studio director.

| Role | Model | Count | Browser? | Output |
|------|-------|-------|----------|--------|
| Director | Fable (main session) | 1 | never | specs, GDD approvals, triage, fix directives, ship sign-off |
| Game Designer | Opus | 1/game, parallel | no | `specs/gdd/<app>-gdd.md` |
| Engineer | Opus | 1/game, parallel | no | the app + build report |
| QA Tester | Opus | serial, 1 at a time | yes | checklist report + screenshots to `verification/<app>/` |
| Game Critic | Opus | serial, blind | yes | `verification/<app>-review.md` + SHIP/POLISH/REWORK |
| Fix Engineer | Sonnet → Opus | on demand | no | scoped fixes, re-gated |
| Visual Polish Specialist | Opus | on call | no | CSS/motion/atmosphere only |
| Fact Checker | Haiku | Explorer only | no | accuracy report on `data/` |

**Pipeline per app:** Director spec → Designer GDD → Director approval → Engineer build → QA → blind Critic → Director triage → fix/polish rounds (terminal state: BLOCKED after 2 Sonnet + 2 Opus rounds) → SHIP.

The Game Critic is blind by design: it receives only the app URL, the audience, and the four design pillars — never the GDD or specs — so it reviews the experienced game, not the intended one.

## Definition of Done (per app)

1. `npx tsc --noEmit` + `npm run build` + `npx vitest run` all clean.
2. QA: every acceptance-checklist + Game Feel item PASS.
3. Blind critic verdict SHIP (or POLISH residuals explicitly accepted by Chris).
4. Aesthetic pass vs token sheet + forbidden list.
5. Explorer only: fact-check pass on `data/`.
6. README with run instructions; manifest + icon present.

## Out of Scope (v1)

Sandbox/free-build mode and constraint seesaw (Inventor), REPEAT nesting depth 2 / IF-sensors (Code Quest), cases 31–100 (Detective — generator is seeded and append-only, expansion is trivial), endless mode (Kingdom), additional regions (Explorer), offline service workers, LAN/cloud deployment, profile management UI. Sound and game-feel set-pieces are NOT out of scope — they are v1-mandatory.

## Accepted Risks

- Web Speech on iPad Safari is best-effort (additive-only; Chris does a manual iPad smoke test).
- Five parallel npm installs share `~/.npm` (retry once with `--cache /tmp/npm-cache-<app>` on EEXIST races).
- Explorer facts restricted to canonical basics + Haiku fact-check; Chris skims `data/` before kid use.
