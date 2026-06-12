# Code Quest — Game Design Document

> Binding inputs (read first, in order): `PLAN.md`, `specs/shared-design.md`, `specs/code-quest.md`. This GDD finalizes every "GDD must decide" item within those rails. Where this document and a rail conflict, the rail wins — flag it in the build report. Interpreter semantics are **frozen by the spec**; nothing here changes them. All 12 grids and every recorded solution in this document were hand-traced against a reference implementation of the spec interpreter before being written down (see §11 sign-off).

Coordinate convention used throughout (matches spec semantics): `grid[y][x]`, row 0 = top. Headings `N`=up(y−1), `E`=right(x+1), `S`=down(y+1), `W`=left(x−1). `LEFT` rotates CCW (N→W→S→E→N); `RIGHT` rotates CW (N→E→S→W→N). Coordinates below are `(x,y)`.

---

## 1. Design Summary

Code Quest is a mission-control terminal where the kid programs a rover across alien sectors by stacking command chips, then hits RUN and watches telemetry. It reads like flight software, not a toy: phosphor panels, scanline glow, NASA sector patches that mint on completion. The core loop is build → RUN → read the failure → fix → win, and the hero move is **debugging** — finding the bad step is the whole point, so collisions are diagnosed coldly and precisely, never scolded.

Five decisions that shaped everything: (1) **STEP is a first-class debugger**, given equal billing with RUN, so kids learn to single-tick a program and watch state. (2) **Collisions are forensic, not failure** — exact step, exact wall, chip lit red, rover slumps but the program is untouched. (3) **Sector-3 pars are mathematically unreachable without REPEAT** — the geometry forces the insight, proven by bounded search. (4) **Sector 1 is pre-reading** — icon-first chips and a one-tap brief reader let the early reader play with zero text. (5) **Efficiency is a second star, never a gate** — finishing always advances; chips-≤-par is the optional mastery layer.

---

## 2. Tuning Tables

### 2.1 Par per mission (par = source-chip count; a REPEAT and each body chip count once)

| # | Title | Sector | Grid (W×H) | Objectives | par | sol[0] chips | wins at step | loop-free min |
|---|-------|--------|-----------|------------|-----|--------------|--------------|---------------|
| 1 | First Contact | 1 Movement | 6×3 | goal | **3** | 3 | 3 | — |
| 2 | Descent | 1 Movement | 4×4 | goal | **3** | 3 | 3 | — |
| 3 | Course Correction | 1 Movement | 6×3 | goal | **5** | 5 | 5 | — |
| 4 | The Long Way | 1 Movement | 6×3 | goal | **7** | 7 | 7 | — |
| 5 | Sample Retrieval | 2 Operations | 6×2 | goal + collect 1 | **6** | 5 | 5 | — |
| 6 | Off the Path | 2 Operations | 6×3 | goal + collect 1 | **11** | 11 | 11 | — |
| 7 | Twin Samples | 2 Operations | 6×3 | goal + collect 2 | **10** | 9 | 9 | — |
| 8 | Signal Relay | 2 Operations | 5×3 | goal + activate 1 | **10** | 9 | 9 | — |
| 9 | Deep Corridor | 3 Loops | 6×1 | goal | **2** | 2 | 5 | 5 |
| 10 | Stairwell | 3 Loops | 4×4 | goal | **5** | 5 | 11 | 7 |
| 11 | Harvest Line | 3 Loops | 6×1 | goal + collect 4 | **6** | 4 | 9 | 9 |
| 12 | Full Circuit | 3 Loops | 3×3 | collect 7 | **6** | 6 | 17 | 17 |

**Star rule (from spec):** completion star = objectives met; efficiency star = source-chip count ≤ par. Sector 1 pars equal the optimal (tight, but the grids are short — a clean line earns both stars). Sector 2 gives +1 slack on the multi-objective missions (7, 8) so the efficiency star is earnable but not automatic; missions 5 and 6 are tuned so the natural route already beats par (5) or exactly hits the only optimal route (6, par 11). Sector 3: in every case the par is **below** the shortest loop-free program (rightmost column), so the efficiency star is impossible without REPEAT, and the completion-via-loop solution already satisfies it.

### 2.2 Run speed & timing

| Control | Cadence | Notes |
|---------|---------|-------|
| RUN | **3 ticks/sec** (≈333 ms/tick) | live chip highlight advances per tick; rover tile-move animation is 150 ms inside the tick window |
| STEP | one tick per tap, no auto-advance | the debugger; same highlight + 150 ms move |
| Rover tile move | 150 ms `transform` ease-out | translate + heading rotate share the window |
| Turn (LEFT/RIGHT, no move) | 150 ms rotate ease-out | rover pivots in place |
| Collision | move aborts at ~60% travel, 220 ms slump-back | see §5 |
| Win set-piece | 900 ms (skippable by tap) | rover spin + patch/star mint, see §4.3, §5 |
| Reduced motion | ticks become instant snaps; set-pieces ≤200 ms fade, particles off | `prefers-reduced-motion` |

### 2.3 Star economy & unlocks

- 12 missions × 2 stars = **24 stars** maximum. Completion-only floor = 12 stars (every mission cleared).
- **Sector unlock:** sector N+1 unlocks when all four sector-N missions have their completion star (stars-for-efficiency not required) — matches spec.
- **Patch mint:** clearing all four missions in a sector (completion stars) mints that sector's patch (set-piece §4.3).
- **Cosmetic unlock budget** (see §7.2): keyed to cumulative stars and patches so a kid who only completes (never optimizes) still unlocks 3 of 5 paint jobs by the end; the two efficiency-gated jobs reward mastery.

---

## 3. Mission Designs — all 12

Notation: grids use spec chars (`.` empty, `#` wall, `C` crystal, `B` beacon, `G` goal, `S` start). Recorded solutions are written as chip sequences; `REPEAT n×[ … ]` is one REPEAT chip with the bracketed body. Each mission lists par and at least one recorded winning program with sol[0] chip-count ≤ par. Hand-trace tables are condensed; full per-step traces were run in the reference interpreter (§11).

---

### Sector 1 — Movement (ops: MOVE, LEFT, RIGHT)

#### M1 — First Contact
**Brief:** `TRANSMISSION // Rover online. Goal beacon is three tiles east. Drive straight to it.`
```
......
S..G..
......
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:false, activateAll:false }` · `allowedOps: [MOVE,LEFT,RIGHT]` · **par 3**
- **sol[0] (3 chips, =par):** `MOVE, MOVE, MOVE`
  - Trace: (0,1)E → (1,1) → (2,1) → (3,1)=G → **win @3**.
- *Design:* the mandated three-MOVE opener. First win is reachable in well under a minute: three taps of one chip, then RUN.

#### M2 — Descent
**Brief:** `TRANSMISSION // New heading: south. Three tiles down to the landing pad.`
```
.S..
....
....
.G..
```
`startHeading: S` · `objectives: { reachGoal:true }` · `allowedOps: [MOVE,LEFT,RIGHT]` · **par 3**
- **sol[0] (3 chips, =par):** `MOVE, MOVE, MOVE`
  - Trace: (1,0)S → (1,1) → (1,2) → (1,3)=G → **win @3**.
- *Design:* same shape as M1 but a different start heading — teaches that "forward" depends on which way the rover faces, without any turn yet.

#### M3 — Course Correction
**Brief:** `TRANSMISSION // The pad is east, then south. You will need one turn.`
```
S.....
......
..G...
```
`startHeading: E` · `objectives: { reachGoal:true }` · `allowedOps: [MOVE,LEFT,RIGHT]` · **par 5**
- **sol[0] (5 chips, =par):** `MOVE, MOVE, RIGHT, MOVE, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0); RIGHT→S; → (2,1) → (2,2)=G → **win @5**.
- **sol[1] (6 chips, alt route):** `RIGHT, MOVE, MOVE, LEFT, MOVE, MOVE`
  - Trace: RIGHT→S; → (0,1) → (0,2); LEFT→E; → (1,2) → (2,2)=G → **win @6**. (Over par — efficiency star needs the 5-chip route.)
- *Design:* first turn. The two routes (turn-then-go vs go-then-turn) make the L-shape legible. RIGHT from E correctly yields S — reinforced by the brief naming the directions.

#### M4 — The Long Way
**Brief:** `TRANSMISSION // A ridge blocks the direct path. Go around it to reach the pad.`
```
S.....
####..
....G.
```
`startHeading: E` · `objectives: { reachGoal:true }` · `allowedOps: [MOVE,LEFT,RIGHT]` · **par 7**
- **sol[0] (7 chips, =par):** `MOVE, MOVE, MOVE, MOVE, RIGHT, MOVE, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0) → (3,0) → (4,0); RIGHT→S; → (4,1) → (4,2)=G → **win @7**. The wall row (cols 0–3 of y=1) makes the short diagonal impossible; the rover must run to the gap at x=4.
- *Design:* sector-1 capstone. Two-segment route around an obstacle, par = optimal (7). A kid who turns early collides into the ridge — a clean, legible first taste of debugging before sector 2.

---

### Sector 2 — Operations (ops: MOVE, LEFT, RIGHT, ACTION; crystals + beacons)

#### M5 — Sample Retrieval
**Brief:** `TRANSMISSION // Crystal on the route. Drive over it, run ACTION to collect, then reach the pad.`
```
S.C.G.
......
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION]` · **par 6**
- **sol[0] (5 chips, <par):** `MOVE, MOVE, ACTION, MOVE, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0); ACTION→collect C@(2,0); → (3,0) → (4,0)=G. Objectives (collect+goal) both met → **win @5**.
- *Design:* introduces ACTION on the simplest possible line. Crystal sits between start and goal, so collect-then-continue is one straight pass. Par 6 gives a free efficiency star to anyone who doesn't waste a chip — a confidence beat at the top of the sector.

#### M6 — Off the Path
**Brief:** `TRANSMISSION // The crystal is off the main line. Detour south to grab it, then make the pad.`
```
S...G.
..C...
......
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION]` · **par 11**
- **sol[0] (11 chips, =par):** `MOVE, MOVE, RIGHT, MOVE, ACTION, LEFT, MOVE, LEFT, MOVE, RIGHT, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0); RIGHT→S; → (2,1); ACTION→collect C@(2,1); LEFT→E; → (3,1); LEFT→N; → (3,0); RIGHT→E; → (4,0)=G → **win @11**.
- *Design:* first real route puzzle — the crystal forces a dip off the goal line and a climb back. Par 11 equals the verified optimal (no slack), so the efficiency star is a genuine planning reward. Misjudging the return path (e.g., heading north too early) collides into the top edge: a productive bug.

#### M7 — Twin Samples
**Brief:** `TRANSMISSION // Two crystals on the top row. Collect both, then drop to the pad.`
```
S.C.C.
......
....G.
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION]` · **par 10**
- **sol[0] (9 chips, <par):** `MOVE, MOVE, ACTION, MOVE, MOVE, ACTION, RIGHT, MOVE, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0); ACTION→collect C@(2,0); → (3,0) → (4,0); ACTION→collect C@(4,0); RIGHT→S; → (4,1) → (4,2)=G → **win @9**.
- *Design:* two ACTIONs in one pass — the "collect as you go" pattern that sector 3 will later fold into a loop. Par 10 gives one chip of slack so a slightly inefficient solver still tastes the efficiency star.

#### M8 — Signal Relay
**Brief:** `TRANSMISSION // A relay beacon needs power. Drive onto it, run ACTION to activate, then reach the pad.`
```
S....
..B..
....G
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:false, activateAll:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION]` · **par 10**
- **sol[0] (9 chips, <par):** `MOVE, MOVE, RIGHT, MOVE, ACTION, MOVE, LEFT, MOVE, MOVE`
  - Trace: (0,0)E → (1,0) → (2,0); RIGHT→S; → (2,1); ACTION→activate B@(2,1); → (2,2); LEFT→E; → (3,2) → (4,2)=G → **win @9**.
- *Design:* sector-2 capstone. Same ACTION verb, new target type (beacon lights instead of crystal sparkling) and a new objective flag (`activateAll`). Teaches that ACTION is context-sensitive — it does the right thing for whatever tile you're on. Par 10 (slack 1) keeps the efficiency star fair on a 9-step optimal.

---

### Sector 3 — Loops (ops: MOVE, LEFT, RIGHT, ACTION, REPEAT; pars unreachable without REPEAT)

> REPEAT rails (frozen): depth 1 (no nested REPEAT), `times` ∈ {2,3,4,5}, body 1–6 chips. Chip-count = REPEAT chip (1) + each body chip (1 each). Every sector-3 par below is strictly less than the shortest possible **loop-free** program (verified by bounded breadth-first search over MOVE/LEFT/RIGHT/ACTION), so the par is provably unreachable without a loop.

#### M9 — Deep Corridor
**Brief:** `TRANSMISSION // A long straight corridor. One loop can drive the whole run. Try REPEAT.`
```
S....G
```
`startHeading: E` · `objectives: { reachGoal:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION,REPEAT]` · **par 2**
- **sol[0] (2 chips, =par):** `REPEAT 5×[ MOVE ]`
  - Expansion: MOVE×5. Trace: (0,0)E → (1,0)…→(5,0)=G → **win @5** (5 commands).
- **sol[1] (3 chips, alt):** `REPEAT 4×[ MOVE ], MOVE`
  - Expansion: MOVE×5 → **win @5**. (Over par — par needs the single ×5 loop.)
- **REPEAT-required proof:** shortest loop-free program = **5 chips** (five literal MOVEs). par 2 < 5, so no loop-free program reaches par. *(Bounded-BFS verified; also obvious by construction: 5 tiles of travel require 5 MOVE commands, and chip-count of 5 literal MOVEs is 5 > 2.)*
- *Design:* the gentlest possible REPEAT introduction — wrap one MOVE, ×5. The brief explicitly names REPEAT because this is the teaching mission. The contrast (5 chips by hand vs 2 with a loop) is immediate and visceral.

#### M10 — Stairwell
**Brief:** `TRANSMISSION // The pad sits at the bottom of a stair. Repeat the step pattern to descend.`
```
S...
....
....
...G
```
`startHeading: E` · `objectives: { reachGoal:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION,REPEAT]` · **par 5**
- **sol[0] (5 chips, =par):** `REPEAT 3×[ MOVE, RIGHT, MOVE, LEFT ]`
  - Expansion (12 commands): each iteration steps one tile east, turns S, steps one tile south, turns back E. Trace by iteration: it1 (0,0)→(1,0)→(1,1); it2 →(2,1)→(2,2); it3 →(3,2)→(3,3)=G. Win fires at command 11 (the final south MOVE lands on G); the trailing LEFT never executes. **win @11**.
- **REPEAT-required proof:** shortest loop-free program = **7 chips** (a hand-built staircase that reuses one diagonal corner: e.g. `MOVE,RIGHT,MOVE,MOVE,LEFT,MOVE,MOVE` ends at G in 7). par 5 < 7, so no loop-free program reaches par. *(Bounded-BFS verified to depth par+12.)*
- *Design:* loops can contain **turns**, not just MOVEs. The repeating unit is a four-chip "stair step." The geometry (a 4×4 open field with start and goal at opposite corners) makes the diagonal staircase the natural shape and forces the loop body to be more than one chip.

#### M11 — Harvest Line
**Brief:** `TRANSMISSION // Four crystals in a row, then the pad. Loop a move-and-collect, then finish.`
```
SCCCCG
```
`startHeading: E` · `objectives: { reachGoal:true, collectAll:true }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION,REPEAT]` · **par 6**
- **sol[0] (4 chips, <par):** `REPEAT 4×[ MOVE, ACTION ], MOVE`
  - Expansion (9 commands): step onto each crystal and collect it four times, then one MOVE onto the goal. Trace: it1 →(1,0)collect; it2 →(2,0)collect; it3 →(3,0)collect; it4 →(4,0)collect (all 4 collected); MOVE →(5,0)=G → **win @9**.
- **REPEAT-required proof:** shortest loop-free program = **9 chips** (`MOVE,ACTION` ×4 written out, plus the final MOVE = 9 literal chips). par 6 < 9. *(Bounded-BFS verified.)*
- *Design:* loops can contain **ACTION** — the move-and-collect rhythm from M7, now compressed. The +1 trailing MOVE outside the loop teaches that loops handle the repetitive core while a literal chip handles the unique tail. sol[0] (4 chips) beats par (6) for a free efficiency star, rewarding the elegant decomposition.

#### M12 — Full Circuit
**Brief:** `TRANSMISSION // Crystals ring the plateau. One loop walks the whole circuit. Collect them all.`
```
SCC
C.C
CCC
```
`startHeading: E` · `objectives: { reachGoal:false, collectAll:true, activateAll:false }` · `allowedOps: [MOVE,LEFT,RIGHT,ACTION,REPEAT]` · **par 6**
- **sol[0] (6 chips, =par):** `REPEAT 4×[ MOVE, ACTION, MOVE, ACTION, RIGHT ]`
  - Expansion (20 commands — at the program cap on expansion, but **6 source chips**, well under the 20-chip source cap). The body walks one edge of the 3×3 ring (two tiles, collecting at each) then turns the corner; ×4 walks the full perimeter clockwise. Trace by edge: top edge →(1,0)collect,→(2,0)collect,turn S; right edge →(2,1)collect,→(2,2)collect,turn W; bottom edge →(1,2)collect,→(0,2)collect,turn N; left edge →(0,1)collect (7th crystal — all collected → **win @17**), then →(0,0) and the final ACTION/RIGHT never execute. The centre tile (1,1) is empty, so the rover walks a clean ring.
  - All seven non-start ring tiles carry crystals; the body's final-edge second ACTION would land back on the empty start tile, but the win fires before that on the 7th collect.
- **REPEAT-required proof:** shortest loop-free program = **17 chips**. par 6 < 17. *(Bounded-BFS verified.)*
- *Design:* the capstone. A single six-chip loop produces a **17-command** circuit that visibly walks the rover all the way around the plateau — the "loops are power" payoff in its strongest form. Twelve-plus repetitive steps collapse to a par of 6, exactly the geometry the spec calls for. No goal tile: pure collect-all, so the loop's elegance is the entire solution.

---

## 4. Sector Identity

### 4.1 Sector names & themes
| Sector | Name | Subtitle on patch | Color lead | Idea |
|--------|------|-------------------|------------|------|
| 1 | **Movement** | "DRIVE TRUE" | terminal green `#39d98a` | basic locomotion; the rover learns to go |
| 2 | **Operations** | "MAKE CONTACT" | cyan `#22d3ee` | acting on the world — collect, activate |
| 3 | **Loops** | "REPEAT THE PATTERN" | green→cyan gradient | leverage — one instruction, many steps |

### 4.2 NASA-style patch design directions (SVG only — zero image assets)
All patches: circular (or rounded-shield) badge, ~160px, built from SVG `<circle>`, `<path>`, `<polygon>`, `<text>` on `<textPath>` for the curved motto, two-stop `<linearGradient>` rims, and a faint inner `<circle>` stroke ring. Palette strictly from app tokens. Stitched-edge effect = a dashed `<circle>` stroke just inside the rim.

- **Sector 1 — Movement / "DRIVE TRUE".** Outer rim: dark panel `#0d1117` with a 2px terminal-green `#39d98a` inner stroke and a dashed "stitch" ring. Field: deep bg `#07090d` with three short green chevron `<polygon>`s rising left-to-right (a trajectory). A single small green tile-rover triangle at the chevrons' tip. Curved top motto `MOVEMENT`, curved bottom `DRIVE TRUE`, text in `#d1d9e0` Space Grotesk small-caps. One white-cyan star `<polygon>` at top-center for "first sector."
- **Sector 2 — Operations / "MAKE CONTACT".** Cyan `#22d3ee` rim stroke. Field shows a stylized crystal: a cyan diamond `<polygon>` with an inner facet line and a 3-ring radial `<circle>` "sparkle" behind it (opacity-stepped). A thin green orbit ellipse crosses behind. Mottos `OPERATIONS` / `MAKE CONTACT`. Accent: a small beacon dot with two emanating cyan arcs.
- **Sector 3 — Loops / "REPEAT THE PATTERN".** Rim uses a green→cyan `<linearGradient>`. Field centerpiece: a bold circular-arrow loop `<path>` (the REPEAT glyph ⟳) in the gradient, with a small "×" and stepper notch implying ×n. Four faint tick marks around the loop (the four iterations). Mottos `LOOPS` / `REPEAT THE PATTERN`. This is the "graduation" patch — give it the richest rim and a subtle phosphor glow filter (`feGaussianBlur` halo behind the loop).

### 4.3 Patch-minting set-piece storyboard (900 ms, skippable by tap; ≤200 ms fade under reduced-motion)
Fires when the fourth mission of a sector earns its completion star.
1. **0–120 ms — Terminal hush.** Grid + rail dim to 40% opacity; a thin scanline sweep passes top-to-bottom across the whole panel; status line prints `SECTOR CLEAR // MINTING PATCH`.
2. **120–420 ms — Patch arrives.** The sector patch scales in from 0.4→1.0 with an overshoot to 1.08 then settle (ease-out-back), starting blurred (`filter: blur(6px)`) and resolving to crisp. A radial phosphor glow (sector color) blooms behind it and recedes. `sfx.success()` triad fires at 120 ms; a soft `noise()` "stamp" thud at 180 ms as it lands.
3. **420–700 ms — Stitch + spark.** The dashed stitch ring draws on via `stroke-dashoffset` animation (whole circle in ~200 ms). 6–8 tiny sector-color spark `<circle>`s burst from the rim outward and fade (CSS particles, killed under reduced-motion). The motto text fades up on its `<textPath>`.
4. **700–900 ms — Settle to shelf.** Patch eases 1.08→1.0, glow gone, panels brighten back to 100%. A one-line citation prints beneath (see §6.4). The patch then docks into the profile patch shelf with a 150 ms slide. Tapping anytime after 200 ms skips to this final docked state.

---

## 5. Juice Script (every interaction → motion + sound)

100ms rule: every tap below produces visible feedback within 100 ms; sound is synthesized via the shared `sfx` module plus two app voices (§5.1).

| Interaction | Visual | Sound | Timing |
|-------------|--------|-------|--------|
| **Palette chip tap (append)** | tapped palette chip flashes a green press-glow; the new rail chip drops into the rail with a 120 ms scale 0.85→1.0 + slight downward settle ("append pop"); chip-count badge ("12/20") ticks up and pulses once | `sfx.select()` (rising two-tone) | ≤100 ms to press-glow; pop 120 ms |
| **Rail chip select** | chip gets a cyan focus ring + raised look (subtle translateY −2px, phosphor edge glow); the chip toolbar (delete / up / down, and ×n stepper / "add into loop" for REPEAT) slides in beside it (120 ms) | `sfx.tap()` (single tick) | ≤100 ms |
| **Chip delete** | chip collapses height→0 + fade (140 ms); chips below slide up to fill; count badge ticks down | `sfx.tap()` lower-pitched variant | 140 ms |
| **Chip reorder (up/down)** | the two swapping chips cross-fade positions with a 140 ms translate; brief green trail | `sfx.tap()` | 140 ms |
| **REPEAT ×n stepper** | the `×n` numeral rolls (old digit up/out, new digit up/in, 120 ms); the indented body bracket subtly pulses to show the multiplier changed | `sfx.tap()` | 120 ms |
| **"Add into loop"** | the REPEAT body bracket expands; appended body chip pops in indented (same append-pop as above) | `sfx.select()` | 120 ms |
| **RUN pressed** | RUN button depresses (translateY +1px, inner shadow); prior red highlights clear; status line prints `RUNNING`; faint scanline sweep starts looping over the grid | rover **idle→armed** rising blip (voice §5.1) | ≤100 ms |
| **RUN tick — chip highlight** | the currently executing source chip lights terminal-green with a left-edge "playhead" bar; previous chip dims; on a REPEAT, the REPEAT chip and the active body chip both light (so kids see which iteration) | rover beep per op type (§5.1) on each tick | per 333 ms tick |
| **Rover MOVE** | rover translates one tile (150 ms ease-out) with a short thruster-glow trail behind the heading; tiny exhaust particles at origin (off under reduced-motion) | MOVE beep (§5.1) | 150 ms |
| **Rover LEFT/RIGHT** | rover pivots 90° in place (150 ms), thruster nudges on the turn side | TURN beep (§5.1) | 150 ms |
| **Collision** | rover lurches ~60% into the blocked tile, then slumps back with a 220 ms recoil + a 6° tilt wobble that settles; an impact **dust burst** of 5–7 tan-gray particles at the contact edge; the blocked wall edge flashes alert-red once; the failing chip lights **alert-red** with the playhead; status line prints the collision copy (§6.2) | `sfx.fail()` (soft low sine — never harsh) + a short `noise()` thud | 220 ms recoil; copy appears same frame |
| **Crystal collect (ACTION on C)** | crystal `<polygon>` does a quick scale-up 1.0→1.3→0 with a radial sparkle ring expanding + 6 cyan sparkle particles; the tile briefly flashes cyan; collected counter ticks | `sfx.collect()` (bright two-tone chime) | 250 ms |
| **Beacon activate (ACTION on B)** | beacon dot ignites: a cyan core brightens and two concentric "signal" rings pulse outward (200 ms); a soft steady glow remains for the rest of the run (it is now ON) | ACTION beep (§5.1) + `sfx.collect()` pitched lower for "powered" | 200 ms + persistent glow |
| **ACTION no-op (empty tile)** | rover does a tiny "scan" pulse (a faint ring) but nothing collects; status line prints a quiet note `ACTION — nothing here` (no red, no penalty) | rover **scan** soft blip (low, brief) | 120 ms |
| **STEP pressed** | identical to one RUN tick but no auto-advance; STEP button gets a momentary green ring; the just-executed chip stays highlighted so the kid can read the state | op-type beep for that one tick | 150 ms move |
| **STOP pressed** | rover snaps back to start tile + start heading (120 ms ease); all chip highlights clear; scanline sweep stops; program untouched; status line prints `STOPPED // ROVER RESET` | `sfx.tap()` low | 120 ms |
| **Win** | rover does a 360° **victory spin** (450 ms) lifting ~4px with a bright thruster bloom; the goal tile (if any) flares; completion star(s) mint in with a pop + sparkle; status line prints the success citation (§6.3); if this clears a sector, the patch set-piece (§4.3) follows | rover **win** ascending arpeggio (voice §5.1) layered under `sfx.success()` | spin 450 ms; full beat ~900 ms |
| **Idle (no run)** | rover hovers with a slow 1.6 s vertical bob (±2px) + a faint pulsing thruster glow; on the grid, scanlines drift very slowly; panels have a steady phosphor breathing glow | none | continuous |
| **Mute toggle** | speaker icon swaps Volume2/VolumeX; one confirming `sfx.tap()` only if un-muting | `sfx.tap()` on un-mute | ≤100 ms |

### 5.1 App-specific sound voices (added to the shared `sfx` module — synthesized, zero assets)
A **"rover beep per op type"** family, all short triangle/sine tones in the rover's "voice register" (≈400–900 Hz) so RUN sounds like telemetry chatter, not music:
- `rover.move` — single 700 Hz triangle blip, 50 ms (forward thrust).
- `rover.turn` — two quick descending blips 760→600 Hz, 40 ms each (gimbal).
- `rover.action` — a 520 Hz "ping" with a tiny 1040 Hz overtone (instrument arm).
- `rover.scan` — soft 440 Hz 60 ms sine, low gain (the no-op "nothing here").
- `rover.armed` — short rising 480→720 Hz on RUN start (systems online).
- `rover.win` — ascending arpeggio 660→880→1175 Hz, layered beneath `sfx.success()`.

Wire op beeps into the interpreter tick loop (one per command), not per render. Respect `isMuted()`.

---

## 6. Copy Deck (shared register: calm, specific, quietly warm; no exclamation marks in system copy; no emoji)

### 6.1 Mission briefs (≤25 words, transmission register — verbatim, see each mission in §3)
All 12 briefs are listed in §3 under each mission. They open with `TRANSMISSION //` and are icon-supported so sector 1 is playable pre-reading. Word counts are all ≤25.

### 6.2 Collision copy — pattern: `Collision at step N. The rover hit the <direction> wall.`
The interpreter returns the failing step index and the heading at impact; map heading→wall word: N→"north", E→"east", S→"south", W→"west". When the blocker is an interior `#` wall rather than the grid edge, use "barrier" instead of "wall". Verified examples (real programs, real steps):
- M3, driving east without turning (`MOVE×6`): **"Collision at step 6. The rover hit the east wall."**
- M3, turning south too early (`RIGHT, MOVE×3`): **"Collision at step 4. The rover hit the south wall."**
- M4, turning into the ridge early: **"Collision at step 3. The rover hit the barrier."** (interior `#`)
- Generic template the engineer implements: `Collision at step ${n}. The rover hit the ${word} ${edgeOrBarrier}.`
A second, quieter advisory line may follow under it: `Program halted. The chips after step ${n} did not run.`

### 6.3 Success citations (printed on win + recorded on the mission card)
- Completion only: `Pad reached. Mission complete.` / for collect: `All samples collected. Mission complete.` / for activate: `Relay online. Mission complete.` / M12 (collect-only ring): `Circuit complete. Every crystal collected.`
- With efficiency star (chips ≤ par): append ` Clean run — ${chips} chips, par ${par}.`  e.g. `All samples collected. Mission complete. Clean run — 4 chips, par 6.`
- Per-mission flavor citation shown on the mission card after first clear (examples): M1 `First contact established.` · M6 `Off-route sample secured.` · M9 `One loop drove the whole corridor.` · M11 `Harvested on the move.` · M12 `Full perimeter walked on a single loop.`

### 6.4 Patch citations (printed at the end of the mint set-piece, §4.3)
- Sector 1: `MOVEMENT sector cleared. The rover drives true.`
- Sector 2: `OPERATIONS sector cleared. Contact confirmed on every target.`
- Sector 3: `LOOPS sector cleared. One instruction, many steps.`

### 6.5 End-without-win diagnostics — pattern from spec: `Program complete. N crystals still out there.`
Evaluated when the program exhausts with objectives unmet. Pluralize correctly; combine clauses if both crystals and a beacon remain.
- 1 crystal left: `Program complete. 1 crystal still out there.`
- 2+ crystals: `Program complete. 2 crystals still out there.`
- beacon unmet: `Program complete. The relay is still dark.`
- reached goal but objectives unmet (goal shimmered, did not win): `The pad shimmered, but the mission is not done. 1 crystal still out there.`
- both: `Program complete. 1 crystal still out there, and the relay is still dark.`
Verified case (M5, stepping onto goal without collecting): yields **"The pad shimmered, but the mission is not done. 1 crystal still out there."**

### 6.6 Other system strings
- Profile picker header: `Who's operating today?` (three monogram discs: Player One / Player Two / Guest)
- Chip-cap reached (20/20): `Program full. 20 chips is the limit — delete one to add another.`
- REPEAT body full (6 chips): `This loop is full. A loop holds up to six chips.`
- Empty-program RUN: `No chips loaded. Add a command, then run.`
- Sector locked: `Sector 2 locks until the Movement sector is clear.`
- Reset-profile (ErrorBoundary fallback): `Reset this operator's progress` / confirm `This clears only ${name}'s saved progress.`
- Status-line idle: `ROVER STANDBY // AWAITING PROGRAM`
- STEP hint (first time on a mission with a recorded collision): `Use STEP to walk the program one tick at a time.`

---

## 7. Achievements & Cosmetics

### 7.1 Badges (6 — pure CSS/SVG, surfaced in profile; "Debugger" is mandatory)
| Badge | Criteria | Note |
|-------|----------|------|
| **First Contact** | Complete M1. | The onboarding badge — earned in the first ≤2 minutes. |
| **Debugger** *(required)* | On any mission: have a run end in **collision**, then later achieve a **win** on that same mission. | The hero badge — celebrates fixing a bug. Tracked per-mission: set a `collided` flag on collision; award when that mission later wins. |
| **Efficient Operator** | Earn the efficiency star (chips ≤ par) on any 6 missions. | Rewards optimization without gating progress. |
| **Loop Master** | Clear all four Loops-sector missions. | Mints alongside the sector-3 patch. |
| **One-Liner** | Win a mission whose entire program is a **single REPEAT chip** (e.g. M9 ×5, or M12's circuit loop). | Celebrates elegant decomposition. |
| **Long Haul** | Trigger a run whose loop expansion is **≥15 commands** (e.g. M12's 20-command circuit). | Rewards seeing a big loop unfold; fires the first time the rover executes a long expansion. |

### 7.2 Cosmetics — rover paint jobs + decal sets (5, CSS-variable skins, profile screen)
Each cosmetic is purely CSS custom properties on the rover SVG (`--rover-body`, `--rover-accent`, `--rover-glow`, `--rover-decal`). No new geometry, no images.
| Cosmetic | Type | Colors | Unlock |
|----------|------|--------|--------|
| **Standard Issue** | paint | body `#9aa6b2`, accent green `#39d98a`, glow green | default (always available) |
| **Surveyor Cyan** | paint + decal | body `#0d1117`, accent cyan `#22d3ee`, cyan thruster glow; small "S-1" hull decal | clear sector 1 (Movement patch) |
| **Relay Orange** | paint | body `#1a140d`, accent warm amber `#f0a35e` (a warm token used only here for cosmetic contrast), green glow | clear sector 2 (Operations patch) |
| **Loop Runner** | paint + decal | green→cyan two-tone body via gradient var, glow gradient; a small ⟳ loop decal on the hull | clear sector 3 (Loops patch) |
| **Phosphor Veteran** | paint + decal | deep bg body with bright `#39d98a` pinstripe accents, intensified phosphor glow; "PAR" chevron decals | earn the **Efficient Operator** badge (6 efficiency stars) |

Cumulative unlocks ensure a completion-only player ends with Standard + the three patch skins (4 of 5); the 5th rewards mastery. Selected cosmetic persists per profile.

---

## 8. Early-Reader Path (sector 1 playable pre-reading, age 6)

Sector 1 (Movement) must be fully completable by the early reader with **zero reading required**.
- **Icon-first palette.** Every chip shows its glyph at large size with the short label beneath in smaller text: MOVE = up-arrow ↑, LEFT = ↶, RIGHT = ↷ (ACTION ◇ and REPEAT ⟳ do not appear in sector 1, so the sector-1 palette is just three big directional chips — minimal decode load). The glyph alone is sufficient to play.
- **Brief TTS.** Each mission brief has a `SpeakButton` (lucide `Volume2`, `aria-label="Read aloud"`) per the shared `tts` contract; tapping it reads the brief aloud (sentence-chunked, iOS-safe). A visible stop control shows while speaking. The early reader taps the speaker, hears "Rover online. Goal beacon is three tiles east. Drive straight to it," and plays. Briefs are written so the spoken version stands alone.
- **Text the early reader can ignore.** The chip-count badge ("3/20"), the status line telemetry, par numbers, and citation text are all non-blocking — nothing requires reading them to win. Stars and the patch are visual. Collision feedback is multi-channel: even if the early reader can't read "Collision at step 2," the rover slumps, dust bursts, the wall flashes red, and the failing chip lights red — they can see which chip is bad and fix it by sight.
- **Forgiving target sizes.** Sector-1 chips and RUN/STEP/STOP are ≥48px with generous gaps (shared hit-target rule) for small fingers; tap-to-append + tap-to-select means no drag is ever required.
- **First win path for the early reader:** pick the early reader's disc → M1 auto-loads → tap the ↑ chip three times (each pop is audible) → tap the big green RUN → rover drives three tiles, spins, star mints. Under two minutes, no words read.
- Sectors 2–3 introduce ACTION/REPEAT and lean more on reading; those are squarely the 8-year-old's range, and the early reader can play them with an adult reading briefs aloud — but the design does not promise solo pre-reading past sector 1.

---

## 9. Open Questions for the Director (≤5)

1. **Warm amber cosmetic token.** "Relay Orange" introduces one warm accent (`#f0a35e`) not in the spec's cold token set, used *only* on an optional rover skin for contrast. Acceptable, or should all cosmetics stay strictly within bg/green/cyan/alert/text?
2. **M12 has no goal tile.** The capstone is pure collect-all (`reachGoal:false`), which the interpreter supports, but it's the only mission without a `G`. Good as the "circuit" payoff, or do you want a goal tile added (it would lengthen the loop and raise par)?
3. **"Long Haul" badge threshold.** I set it at ≥15 expanded commands so M12 (20) reliably triggers it but a casual ×5 MOVE loop (5) does not. Comfortable, or tune the threshold?
4. **STEP-hint nudge.** I propose surfacing the one-time "Use STEP to walk the program one tick at a time" hint only after a kid's first collision on a mission (teaching the debugger exactly when it's useful). OK, or should STEP be explained upfront in an onboarding line?
5. **Efficiency-star slack in sector 2.** Missions 7 and 8 carry +1 par slack (optimal 9, par 10) so the efficiency star is fair; mission 6 is tight (par = optimal 11). Is that the right "loosen early, tighten at the capstone" curve, or should all sector-2 efficiency stars be tight?

---

## 10. Engineer Notes (within-rails reminders, not new requirements)
- Pars are **source-chip counts**; the 20-chip cap is on **source chips** (M12 is 6 source chips / 20 expanded — legal). The interpreter must count a REPEAT chip + each body chip once for par/efficiency, but expand fully for the trace.
- Win is evaluated **after every tick**; recorded win-steps above assume this (e.g. M1's win fires at step 3 even if extra MOVEs follow). Stepping onto `G` only wins when `collectAll`/`activateAll` are already satisfied — otherwise the goal tile shimmers (a visual, not a win).
- Collision halts the trace; chips after the failing index do not execute and must visibly **not** highlight as run.
- All grids are rectangular with exactly one `S`; every `reachGoal` mission has exactly one `G`; M12 has zero `G` by design. allowedOps respect sector gating (S1 no ACTION/REPEAT; S2 +ACTION, no REPEAT; S3 +REPEAT).

## 11. Verification Sign-off
Every grid, par, and recorded solution in §3 was implemented against a reference interpreter mirroring the spec's frozen semantics and executed:
- All 12 `solutions[0]` chip-counts ≤ par; all recorded solutions reach `win`. ✓
- Sector-3 pars verified **unreachable without REPEAT** by bounded breadth-first search over the loop-free op set (MOVE/LEFT/RIGHT/ACTION): shortest loop-free program length exceeds par for M9 (5 > 2), M10 (7 > 5), M11 (9 > 6), M12 (17 > 6). ✓
- Grid integrity (rectangular, exactly one `S`, `G` count matches `reachGoal`, ops-gating) verified for all 12. ✓
- Collision-copy step indices and wall directions in §6.2, and the end-without-win example in §6.5, were produced by running the cited programs through the reference interpreter (real step numbers, not estimates). ✓
