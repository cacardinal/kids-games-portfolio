# Code Quest — App Spec (port 5187)

> Read `PLAN.md` and `specs/shared-design.md` first; both are binding. This spec adds the app contract. The GDD (`specs/gdd/code-quest-gdd.md`) finalizes missions, tuning, and copy within these rails.

**Fantasy:** the kid is a mission operator at a futuristic control terminal, programming a rover on remote expeditions. Feels like professional software simplified — never like a toy. Debugging is heroic: finding the bad step IS the game.

## Aesthetic tokens
bg `#07090d` · panel `#0d1117` · terminal green `#39d98a` · cyan `#22d3ee` · alert `#f87171` · text `#d1d9e0` · chip surface `#161d27`. Display `@fontsource/space-grotesk`, command chips `@fontsource/jetbrains-mono`, body Inter. Motifs: faint CRT scanlines + phosphor glow on panels, NASA-style SVG sector patches that mint on completion, "TRANSMISSION INCOMING" mission briefs (≤25 words, icons-first so the early reader can play sector 1 pre-reading), telemetry-style status line. Rover: clean vector drone with thruster glow — idle hover bob, collision slump + dust, victory spin (avatar charm lives here).

## Program model + interpreter (`src/game/interpreter.ts`) — PURE, binding semantics
```ts
type Chip =
  | { id: string; op: "MOVE" | "LEFT" | "RIGHT" | "ACTION" }
  | { id: string; op: "REPEAT"; times: 2|3|4|5; body: Chip[] };   // body 1–6 chips, NO nested REPEAT (depth 1)
interface Mission {
  id: number; sector: 1|2|3; title: string; brief: string;
  grid: string[];            // rows; chars: "." empty, "#" wall, "C" crystal, "B" beacon, "G" goal, "S" start
  startHeading: "N"|"E"|"S"|"W";
  objectives: { reachGoal: boolean; collectAll: boolean; activateAll: boolean };
  allowedOps: Array<Chip["op"]>;   // sector gating
  par: number;                     // CHIP count (a REPEAT and each body chip count once — loops earn stars)
  solutions: Chip[][];             // ≥1 recorded winning program; solutions[0] must have chipCount ≤ par
}
```
- Grid ≤10×8. Program cap: **20 chips** total (chip count = source chips, not expansion).
- `run(mission, program)` returns the full tick trace: `{ tick, sourceChipId, command, rover: {x,y,heading}, event?: "collect"|"activate"|"collision"|"win"|"end" }[]`.
- Semantics: MOVE advances 1 tile in heading; into a wall/edge = **collision** → trace ends with `collision` carrying the failing `sourceChipId` and tick index. LEFT/RIGHT rotate 90°. ACTION on a crystal collects it; on a beacon activates it; elsewhere = harmless no-op (trace notes it). Win is evaluated after every tick: all objectives true → `win` immediately (stepping onto goal only completes `reachGoal` when other objectives are already met; otherwise the goal tile shimmers but nothing happens). Program exhausted without win → `end` ("Program complete. 2 crystals still out there.").
- REPEAT expands inline; every expanded command still reports its source chip id (this powers chip highlighting and "Collision at step N" attribution).

## Mission control UI (binding)
Three zones, responsive (iPad landscape = grid left, program rail right; narrow = grid top, rail bottom):
- **Grid viewport:** SVG tiles; rover transitions tile-to-tile (150ms transform) with heading rotation; crystals sparkle on collect; beacons light; collision kicks dust + rover slump. `data-testid="rover"` with live `data-x/data-y/data-heading`.
- **Program rail:** vertical chip list (JetBrains Mono). Tap a palette chip to APPEND; tap a rail chip to select → chips: delete / move up / move down; REPEAT chips show `×n` stepper (2–5) and indent their body; an "add into loop" affordance appears while a REPEAT is selected. Chip count vs cap visible ("12/20").
- **Palette:** only `allowedOps` for the mission's sector; icons + short labels (MOVE ↑, LEFT ↶, RIGHT ↷, ACTION ◇, REPEAT ⟳).
- **Controls:** RUN (≈3 ticks/sec, live chip highlight), STEP (exactly one tick — the debugger), STOP (abort; rover resets to start; program untouched). Failure states highlight the failing chip in alert red with copy "Collision at step 4. The rover hit the east wall." RUN after edit clears prior highlights.

## Content & progression
12 missions / 3 sectors (S1 "Movement" ×4: MOVE/LEFT/RIGHT; S2 "Operations" ×4: +ACTION, crystals + beacons; S3 "Loops" ×4: +REPEAT, pars unreachable without loops). Sector N+1 unlocks when all sector-N missions complete (stars not required). Stars: completed / chips ≤ par. Sector patch mints (set-piece: patch scales in with glow + `sfx.success()` fanfare) when a sector is fully cleared. Cosmetics: 4–6 rover paint jobs + decal sets (CSS variables) unlocked by stars/patches. Badges (~6, GDD finalizes; MUST include "Debugger" — fix a program that collided, then win on a later run of the same mission).

## Required tests (Vitest)
1. Interpreter unit: movement, rotation, collision tick + source chip attribution, ACTION semantics (collect/activate/no-op), instant win once objectives met, end-without-win.
2. REPEAT: expansion order, ×n counts, body editing invariants, no-nesting enforcement, chip-count arithmetic (REPEAT + body counted once each).
3. Cap: program length 20 enforced.
4. All 12 missions: every recorded solution wins; `solutions[0]` chip count ≤ par (par is achievable); sector-3 pars are NOT achievable without REPEAT (assert: no loop-free program ≤ par exists — verifiable by bounded search or by construction argument documented in the test).
5. Mission data integrity: grids rectangular, exactly one S and (if reachGoal) one G, allowedOps respect sector gating.

## Acceptance checklist (QA runs this verbatim)
1. Loads clean (zero console errors). 2. Profile pick; Mission 1: build MOVE MOVE MOVE by taps → RUN → rover animates to goal → success + stars; first win ≤2 min. 3. Build a colliding program → RUN → "Collision at step N" with the failing chip highlighted red. 4. STEP advances exactly one tick per tap with chip highlight. 5. STOP resets rover, keeps program. 6. Chip select → delete/reorder work. 7. Sector 3: REPEAT chip composes (×n stepper, body indent) and counts toward par as chips (verify a loop solution earns the efficiency star). 8. Sector 2 locked until sector 1 complete; patch set-piece mints with sound on sector clear. 9. Progress survives reload. 10. Brief SpeakButton works. 11. Mute persists. 12. Manifest + icons present. 13. Aesthetic pass (scanlines/phosphor atmosphere, patch quality, rover charm — would a kid screenshot it?).

## GDD must decide (designer scope)
The 12 mission grids (ASCII maps), objectives, pars, recorded solutions (including the ≤par solution), difficulty ramp (M1 = three MOVEs; ramp turns → ACTION → loop payoff where REPEAT halves the chip count), sector names + patch design directions, badge list, rover cosmetics, all copy (briefs ≤25 words, failure copy variants, patch citations), set-piece storyboard, app-specific sound voices (rover beep per op type).
