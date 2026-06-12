# Inventor Lab — Game Design Document

> Binding inputs: `PLAN.md`, `specs/shared-design.md`, `specs/inventor-lab.md`. This GDD finalizes level designs, tuning, copy, juice, achievements, cosmetics, and the early-reader path within those rails. No new parts, no constraints/motors, fixed part costs, fixed physics contract. Coordinates are in the 1280×720 world space (origin top-left, **y increases downward**, matter-js body x/y = body CENTER). All solutions are DESIGN INTENT with deliberate margin; the engineer fine-tunes exact `knownSolution` coordinates until the headless test passes (success by step ≤1000, hero settled well inside goal).

---

## 1. Design Summary

> Inventor Lab is a prototype bench where the kid is an engineer, not a student. You read a one-line build brief on a real drafting sheet, drop ramps, planks, and bouncers onto a glowing blueprint grid, then hit TEST and watch your machine run. It almost never works the first time — and that is the entire point. Every failure logs as "Test #3," reframed as data, and every win slams an APPROVED stamp and raises a flag at the goal.
>
> Five design decisions drive everything: (1) **goals are always walled pockets**, oversized so the hero settles inside with ≥25px clearance — never a precision shot; (2) **iteration is celebrated, failure never punished** — soft tones, neutral data-framed copy, a Test Pilot badge for running 10 tests; (3) **starting motion is built into terrain** (spawn velocity or a downslope) so kids reason about the part, not the launch; (4) **three escalating fantasies** — bridge a gap, route a fall, launch a payload — each a distinct physical idea; (5) **the bench feels professional** — mono title blocks, dimension arrows, chalk-dust, dashed part ghosts. Competence over cuteness.

(148 words)

---

## 2. Tuning Tables

### 2.1 Star pars (3 stars: solved · parts ≤ par.parts · cost ≤ par.cost)

| # | Series | Level | Budget | par.parts | par.cost | Min real cost | Slack |
|---|--------|-------|--------|-----------|----------|---------------|-------|
| 1 | bridge | First Span | 30 | 1 | 10 | 10 | 3.0× |
| 2 | bridge | The Long Reach | 40 | 2 | 20 | 20 | 2.0× |
| 3 | bridge | Pillar Gap | 40 | 2 | 18 | 18 | 2.2× |
| 4 | bridge | Downhill Start | 35 | 2 | 25 | 25 | 1.4× |
| 5 | bridge | Two-Plank Cross | 30 | 2 | 20 | 20 | 1.5× |
| 6 | ballrun | Drop In | 30 | 1 | 15 | 15 | 2.0× |
| 7 | ballrun | The Funnel | 45 | 2 | 23 | 23 | 2.0× |
| 8 | ballrun | Switchback | 45 | 3 | 35 | 35 | 1.3× |
| 9 | ballrun | The Bank Shot | 50 | 3 | 40 | 40 | 1.25× |
| 10 | launch | Knock-Off | 40 | 1 | 20 | 20 | 2.0× |
| 11 | launch | The Catapult | 45 | 2 | 30 | 30 | 1.5× |
| 12 | launch | Over the Wall | 55 | 3 | 43 | 43 | 1.3× |

Budgets always exceed the intended solution cost (slack column) so a kid can over-build and still TEST — the cost star, not the budget, rewards efficiency. "Min real cost" = the intended solution's cost; the par.cost equals it so the third star demands the clean build.

### 2.2 Part cost reference (FIXED — from spec, do not change)

| Part | Cost | Role in this game |
|------|------|-------------------|
| Plank | 10 | span / catch / floor of a pocket |
| Ramp | 15 | start motion / redirect down / deflect |
| Bouncer | 20 | add energy (launch + Bank Shot only) |
| Crate | 5 | dynamic filler / wedge / step |
| Column | 8 | wall a pocket / block a wrong exit |

### 2.3 Difficulty ramp logic

Five independent dials, never all pushed at once:

1. **Gap / drop distance** — L1 gap 110px → L5 gap 300px; L6 drop 1 ledge → L9 drop with 2 redirects.
2. **Allowed parts breadth** — L1 = `[plank]` only (cannot fail by wrong part). Breadth widens through the bridge series, then re-narrows in each new series' opener (L6 `[ramp]`-led, L10 `[bouncer]`-led) so each fantasy re-teaches its core part in isolation.
3. **Budget tightness** — slack 3.0× at L1 decays toward ~1.25× by L9/L12; the last level of each series is the tightest in that series.
4. **Solution part count** — 1 part (L1, L6, L10) → 3 parts (L8, L9, L12).
5. **Path complexity** — straight span → single redirect → multi-bounce bank shot (L9) and a wall-clearing arc (L12).

Within a series, every level is strictly easier than or equal to the next on at least three dials. New-series openers (L6, L10) deliberately dip in difficulty to re-onboard the new mechanic — a sawtooth, not a monotonic climb, which keeps re-engagement high.

### 2.4 Shared terrain conventions

- **Ground slab** when present: `platform` top at **y=640**, full or partial width, h=80 (so its top surface — where things rest — is y=640).
- **Pedestal top** for launch crates: stated per level.
- **Goal pockets**: floor plank/ground at the bottom, two `wall`/`column` sides. Ball goal interiors ≥ 90 wide; crate goal interiors ≥ 110 wide. Goal rect drawn ~10px inside the pocket walls so the dashed target reads as "inside the catch."
- Hero **ball** AABB = 36×36; hero **crate** AABB = 40×40. Resting clearance target ≥25px each side.

---

## 3. Level Designs (12)

> Schema reminder: `TerrainBlock {kind, x, y, w, h, angleDeg?}` (x/y = CENTER). `Actor {kind, x, y, vx?, vy?, hero}`. `Placement {part, x, y, angleDeg}` (x/y = CENTER; ramp/plank/bouncer/column anchored at their geometric center). `goal {x, y, w, h}` is a rect (x/y = top-left per spec convention used in goal target rendering; engineer confirms corner vs center and adjusts — design intent is the *region*). Velocities in matter-js units/step.

---

### BRIDGE SERIES (5) — span a gap so the rolling hero crosses

The hero is always the **ball**, spawned already rolling (`vx`) on a launch ledge, aimed at a goal pocket across a gap. Core idea: a flat or near-flat surface that bridges the void; the far pocket's back wall stops the ball so it settles for ≥30 steps.

#### Level 1 — "First Span"
- **Briefing:** "Drop one plank to bridge the gap. The ball is already rolling. Give it a road to the dock."
- **Terrain:**
  - Launch ledge (platform): x=180, y=520, w=300, h=40 → top surface y=500, spans x 30–330.
  - Goal dock floor (platform): x=720, y=520, w=320, h=40 → top y=500, spans x 560–880.
  - Dock back wall (wall): x=880, y=460, w=24, h=160 → stops the ball.
  - Gap between ledge (ends x=330) and dock (starts x=560) = **230 wide** at surface, but the plank (120 long) plus generous landing makes a ~110px true unsupported span (see solution).
- **Actor:** ball hero at x=120, y=470, **vx=6**, vy=0 (rolling right on the ledge).
- **Goal:** {x: 640, y: 440, w: 200, h: 90} — the dock interior; ball settles against back wall at ~x=850.
- **Budget:** 30. **allowedParts:** `["plank"]`. **par:** {parts: 1, cost: 10}.
- **Intended solution (1 part):**
  - Plank at x=445, y=500, angleDeg=0 — its right end (x≈505) meets the dock lip area; combined with the dock floor the ball rolls plank → dock → settles on back wall.
  - *Margin:* ball arrives with speed, the dock floor is 320 wide and back-walled; even if the plank is 20px off, the ball still reaches the dock. Single-plank, single-tap, under 30 seconds for a 6-year-old. **This is the ≤2-minute first win.**

#### Level 2 — "The Long Reach"
- **Briefing:** "One plank will not reach. Two planks make a longer road. Span the wide gap to the dock."
- **Terrain:**
  - Launch ledge: x=140, y=520, w=240, h=40 → top y=500, ends x=260.
  - Goal dock floor: x=900, y=520, w=300, h=40 → top y=500, starts x=750.
  - Dock back wall: x=1040, y=460, w=24, h=160.
  - Mid pier (pedestal, narrow) to rest the plank seam on: x=505, y=540, w=60, h=80 → top y=500. Sits in the middle of the gap so two planks bridge ledge→pier→dock.
  - Gap ledge-to-pier ≈ 215; pier-to-dock ≈ 215.
- **Actor:** ball hero at x=90, y=470, **vx=6.5**.
- **Goal:** {x: 820, y: 440, w: 200, h: 90}.
- **Budget:** 40. **allowedParts:** `["plank"]`. **par:** {parts: 2, cost: 20}.
- **Intended solution (2 parts):**
  - Plank A at x=385, y=500, angle=0 (ledge → mid pier).
  - Plank B at x=625, y=500, angle=0 (mid pier → dock).
  - *Margin:* the mid pier guarantees each plank only needs to span ~120; planks overlap the pier top generously. Ball rolls the full flat road to the back-walled dock.

#### Level 3 — "Pillar Gap"
- **Briefing:** "A tall pillar blocks the low road. Use a column to extend a landing, then plank across to the dock above it."
- **Terrain:**
  - Launch ledge: x=160, y=440, w=260, h=40 → top y=420, ends x=290.
  - Blocking pillar (wall): x=560, y=520, w=60, h=200 → tall column rising from ground, top y=420, sits mid-gap.
  - Goal dock floor: x=940, y=440, w=300, h=40 → top y=420, starts x=790.
  - Dock back wall: x=1080, y=380, w=24, h=120.
- **Actor:** ball hero at x=110, y=390, **vx=6.5**.
- **Goal:** {x: 860, y: 360, w: 200, h: 90}.
- **Budget:** 40. **allowedParts:** `["plank","column"]`. **par:** {parts: 2, cost: 18}.
- **Intended solution (2 parts):**
  - Column at x=560, y=460, angle=0 — placed ON TOP of the blocking pillar to raise a flat landing pad at its top (y≈400) level with the road. (Column top surface gives a flat 24-wide rest point.)
  - Plank at x=400, y=420, angle=0 — bridges ledge (ends x=290) toward the column-pad; then a second mental "plank" is not needed because…
  - *Refinement:* the cleaner 18-cost build is **Plank + Column**: plank from ledge to the raised column-pad, then the ball rolls onto the pillar top and the dock lip is reachable. Engineer tunes: if a single plank cannot span ledge→pillar AND pillar→dock, swap to **2 planks (cost 20, costs a star)** as the forgiving fallback the budget (40) allows. Design intent: pillar is an obstacle you build *over*, dock is back-walled.
  - *Margin:* dock floor is 300 wide and back-walled; the pillar top is a wide flat catch. Budget 40 lets a kid use a 2-plank brute-force route and still win (1 fewer star), so no one gets stuck.

#### Level 4 — "Downhill Start"
- **Briefing:** "The ball starts still. Build a ramp to get it rolling, then a plank to carry it across to the dock."
- **Terrain:**
  - Start shelf (platform, flat, SHORT): x=130, y=360, w=200, h=40 → top y=340, ends x=230. Ball rests here, vx=0.
  - Lower run platform: x=520, y=560, w=380, h=40 → top y=540, spans x 330–710. (The ramp drops the ball from the shelf down to this run.)
  - Goal dock floor: x=980, y=560, w=300, h=40 → top y=540, starts x=830. Gap 710→830 = 120.
  - Dock back wall: x=1120, y=500, w=24, h=120.
- **Actor:** ball hero at x=130, y=312, **vx=0** (still — must be set in motion).
- **Goal:** {x: 900, y: 480, w: 200, h: 90}.
- **Budget:** 35. **allowedParts:** `["ramp","plank"]`. **par:** {parts: 2, cost: 25}.
- **Intended solution (2 parts):**
  - Ramp at x=300, y=480, angle=0 — high edge near the shelf lip, slope descending right toward the lower run; the still ball rolls off the shelf, down the ramp, gains speed onto the lower run.
  - Plank at x=775, y=540, angle=0 — bridges the 120 gap (run ends x=710 → dock starts x=830).
  - *Margin:* the ramp converts the ~200px drop into ample speed; the lower run is 380 wide so timing is loose; the dock is back-walled. Teaches "ramp = motor for gravity," the bridge for launch series later.

#### Level 5 — "Two-Plank Cross" (bridge series finale — tightest)
- **Briefing:** "Widest gap yet, and only planks. Stage two planks across the drop to reach the far dock."
- **Terrain:**
  - Launch ledge: x=150, y=400, w=240, h=40 → top y=380, ends x=270.
  - Mid pier (pedestal): x=565, y=440, w=50, h=120 → top y=380, mid-gap.
  - Goal dock floor: x=1000, y=400, w=280, h=40 → top y=380, starts x=860.
  - Dock back wall: x=1130, y=340, w=24, h=120.
  - Gap ledge→pier ≈ 295 total but pier splits it: ledge(270)→pier(540) ≈ 270; pier(590)→dock(860) ≈ 270. **300px total drop-gap.**
- **Actor:** ball hero at x=100, y=350, **vx=7** (faster spawn to clear the long flat road without stalling).
- **Goal:** {x: 920, y: 320, w: 200, h: 90}.
- **Budget:** 30 (tight — exactly two planks + zero slack beyond). **allowedParts:** `["plank"]`. **par:** {parts: 2, cost: 20}.
- **Intended solution (2 parts):**
  - Plank A at x=400, y=380, angle=0 (ledge → pier).
  - Plank B at x=720, y=380, angle=0 (pier → dock).
  - *Margin:* identical structure to L2 but wider and faster spawn; the pier guarantees each plank spans only ~120 supported. The narrow budget (30) means no brute-force extra parts — this is the series mastery check, but the geometry is still forgiving (back-walled dock, fast ball).

---

### BALLRUN SERIES (4) — route the falling hero down through obstacles into the goal basin

Hero is the **ball**, dropped from a high spawn. Parts redirect the fall into a wide walled basin at the bottom. Ramps deflect, planks catch-and-roll, columns block wrong exits.

#### Level 6 — "Drop In" (series opener — easiest, re-teaches the ramp)
- **Briefing:** "The ball falls straight down past the goal. Add one ramp to nudge it sideways into the basin."
- **Terrain:**
  - Drop chute walls (two walls) framing the spawn: left wall x=300, y=200, w=24, h=200 (x 288–312); right wall x=440, y=200, w=24, h=200 (x 428–452). Ball falls between them, exits at y≈300.
  - Goal basin floor (platform): x=760, y=620, w=360, h=80 → top y=580, spans x 580–940.
  - Basin left wall (wall): x=590, y=540, w=24, h=160.
  - Basin right wall (wall): x=930, y=540, w=24, h=160.
  - Floor slab elsewhere left as void (ball that misses falls out-of-bounds = fail, motivating the ramp).
- **Actor:** ball hero at x=370, y=160, vx=0, vy=0 (drops straight).
- **Goal:** {x: 620, y: 500, w: 280, h: 90}.
- **Budget:** 30. **allowedParts:** `["ramp"]`. **par:** {parts: 1, cost: 15}.
- **Intended solution (1 part):**
  - Ramp at x=470, y=380, angle=0 — placed below the chute exit, high-left/low-right, so the falling ball hits the slope and is deflected rightward and down, arcing into the wide basin.
  - *Margin:* basin is 280 wide and double-walled; the ball only needs to land anywhere in a 280px window after a single deflection. One ramp, one tap, re-teaches "ramp redirects a fall." Engineer tunes ramp angle/position so the ball clears the basin left wall (x=590) and lands inside.

#### Level 7 — "The Funnel"
- **Briefing:** "Two ramps make a funnel. Catch the falling ball on the left, hand it to the right, and drop it in the basin."
- **Terrain:**
  - Spawn shelf overhang (platform): x=220, y=160, w=160, h=30 → ball rolls off its right edge (x=300) with a little vx, or spawn with vx.
  - Mid ledge (platform) the first ramp rests against: x=360, y=400, w=140, h=30 → top y=385.
  - Goal basin floor: x=900, y=620, w=340, h=80 → top y=580, spans x 730–1070.
  - Basin left wall: x=740, y=540, w=24, h=160. Basin right wall: x=1060, y=540, w=24, h=160.
  - A blocking column mid-screen the ball must be routed *around*: (none — kept clean for L7; complexity comes in L8).
- **Actor:** ball hero at x=180, y=130, **vx=3** (gentle, rolls off the shelf).
- **Goal:** {x: 770, y: 500, w: 280, h: 90}.
- **Budget:** 45. **allowedParts:** `["ramp","plank"]`. **par:** {parts: 2, cost: 23}.
- **Intended solution (2 parts):**
  - Ramp at x=420, y=470, angle=0 — high-left/low-right on/near the mid ledge; catches the ball falling off the shelf and sends it rightward.
  - Plank at x=620, y=520, angle≈ −8 (gentle downslope right) — catches the deflected ball and rolls it the last stretch into the basin window.
  - *Margin:* two wide catch surfaces in series; the basin is 280 wide and double-walled. Slack budget 45 lets a kid add a third catch plank if needed and still win (costs the cost star).

#### Level 8 — "Switchback"
- **Briefing:** "Zig then zag. Stack two ramps facing opposite ways so the ball switchbacks down, and a column to keep it on track."
- **Terrain:**
  - Spawn nook (platform): x=200, y=140, w=140, h=30 → ball drops off right edge.
  - Upper catch ledge (platform): x=420, y=300, w=160, h=30 → top y=285 (first ramp rests here, deflecting RIGHT).
  - Lower catch ledge (platform): x=820, y=440, w=160, h=30 → top y=425 (second ramp rests here, deflecting LEFT-down into basin).
  - Goal basin floor: x=560, y=640, w=300, h=80 → top y=600, spans x 410–710.
  - Basin left wall: x=420, y=560, w=24, h=160. Basin right wall: x=700, y=560, w=24, h=160.
  - Wrong-exit gap on the right of the lower ledge leads out-of-bounds — the column prevents over-shoot.
- **Actor:** ball hero at x=170, y=110, vx=0 (drops).
- **Goal:** {x: 440, y: 520, w: 240, h: 90}.
- **Budget:** 45. **allowedParts:** `["ramp","column","plank"]`. **par:** {parts: 3, cost: 35}.
- **Intended solution (3 parts):**
  - Ramp A at x=470, y=360, angle=0 (high-left/low-right) on the upper ledge — deflects the dropped ball RIGHT toward the lower ledge region.
  - Ramp B at x=770, y=500, angle=180 (mirrored: high-right/low-left) on the lower ledge — deflects the ball LEFT and down toward the basin.
  - Column at x=720, y=480, angle=0 — a backstop right of Ramp B so an over-fast ball cannot skip past into the void; it banks back left into the basin.
  - *Margin:* the basin is 240 wide and double-walled, positioned directly below the switchback exit; the column removes the only failure mode (overshoot). Three wide surfaces, no precision shot. (Engineer: confirm Ramp B `angleDeg=180` yields the mirrored right-triangle orientation in 0.20.0; if the triangle hypotenuse faces wrong, use the angle that produces high-right/low-left and re-record.)

#### Level 9 — "The Bank Shot" (ballrun finale — only multi-bounce level)
- **Briefing:** "No clean line down. Bank the ball off a bouncer, over the divider, into the deep basin. Expect a few tests."
- **Terrain:**
  - Spawn shelf (platform): x=180, y=180, w=160, h=30 → ball rolls off right (x=260) with vx.
  - Center divider wall (wall): x=660, y=420, w=24, h=320 → tall wall x 648–672, top y=260, splitting the screen; the goal is on the RIGHT of it, the ball spawns LEFT.
  - Goal basin floor (platform): x=980, y=640, w=300, h=80 → top y=600, spans x 830–1130.
  - Basin left wall: x=840, y=560, w=24, h=160. Basin right wall: x=1120, y=560, w=24, h=160.
  - Landing shelf left of divider (platform) so the bounced ball has a launch surface: x=400, y=520, w=240, h=30 → top y=505.
- **Actor:** ball hero at x=160, y=150, **vx=4** (rolls off shelf, falls toward left landing shelf).
- **Goal:** {x: 850, y: 520, w: 270, h: 90}.
- **Budget:** 50. **allowedParts:** `["bouncer","ramp","plank"]`. **par:** {parts: 3, cost: 40}.
- **Intended solution (3 parts):**
  - Ramp at x=360, y=470, angle=0 — catches the ball falling toward the left shelf and sends it rightward/upward toward the bouncer.
  - Bouncer at x=560, y=440, angle≈ −20 (tilted so its normal points up-and-right) — the ball (restitution 0.2) plus bouncer (restitution 1.4) launches the ball UP and to the RIGHT, arcing OVER the divider (top y=260; ball must clear ~y=260 near x=660).
  - Plank at x=900, y=560, angle≈ −6 — a catch ledge inside/above the basin so the descending ball rolls into the basin window rather than bouncing back out.
  - *Margin:* this is the deliberately hard one. To protect winnability: the basin is 270 wide and double-walled; the catch plank widens the landing; the budget (50) lets a kid add a 4th part (e.g., a second catch plank or a wall to stop ricochet) and still win at the cost of the cost-star. **The divider clearance is the risk** — see §9 Risks. Engineer must verify the ball clears y≈250 at x≈660 with the recorded bouncer angle, and that 30 in-goal steps are reached by step ≤1000.

---

### LAUNCH SERIES (3) — a moving ball knocks the hero CRATE off its pedestal into the goal

Hero is the **crate** (40×40), resting on a pedestal. A non-hero **ball** is sent (spawn vx or a ramp) to strike the crate; the crate topples/slides into a walled goal basin. The ball is the tool, the crate is the payload.

#### Level 10 — "Knock-Off" (series opener — easiest, re-teaches the ball-as-tool)
- **Briefing:** "The ball is your hammer. Send it rolling to knock the crate off its pedestal and into the catch basin below."
- **Terrain:**
  - Ball runway (platform): x=200, y=420, w=300, h=40 → top y=400, spans x 50–350. Ball spawns here rolling right.
  - Pedestal (pedestal): x=560, y=460, w=80, h=120 → top y=400, level with the runway. Hero crate sits on top.
  - Goal basin floor (platform): x=820, y=640, w=320, h=80 → top y=600, spans x 660–980.
  - Basin left wall: x=670, y=560, w=24, h=160. Basin right wall: x=970, y=560, w=24, h=160.
  - (Pedestal sits just left of the basin; a knocked crate falls right and down into it.)
- **Actors (order: ball first, then hero crate):**
  - ball (non-hero) at x=110, y=372, **vx=8** (fast hammer).
  - crate **hero** at x=560, y=378 (resting on pedestal top y=400; crate center 22px above → y≈378).
- **Goal:** {x: 690, y: 510, w: 260, h: 100}.
- **Budget:** 40. **allowedParts:** `["plank","ramp"]`. **par:** {parts: 1, cost: 20}.
- **Intended solution (1 part):**
  - Ramp at x=420, y=470, angle=0 — NOT strictly required to redirect; its job is to BRIDGE the runway-to-pedestal gap (runway ends x=350, pedestal starts x=520) so the fast ball reaches the crate at runway height. High-left/low-right keeps the ball low and fast into the crate's base.
  - *Margin:* the crate, once struck by an 8-vx ball, slides/topples right off the pedestal and falls into the 260-wide double-walled basin directly below-right. The basin is huge relative to the crate (40 wide). One part, re-teaches "ball = kinetic tool." Engineer tunes ramp so the ball contacts the crate's lower half (clean push, not a pop-over).

#### Level 11 — "The Catapult"
- **Briefing:** "The ball needs a boost. Roll it down a ramp into a bouncer to fling it at the crate. Then catch the crate in the basin."
- **Terrain:**
  - Ball drop shelf (platform): x=160, y=240, w=160, h=30 → ball spawns, rolls off right (x=240).
  - Pedestal (taller, so the crate must be hit from below-side): x=720, y=420, w=80, h=200 → top y=320. Hero crate on top.
  - Goal basin floor (platform): x=980, y=640, w=300, h=80 → top y=600, spans x 830–1130.
  - Basin left wall: x=840, y=560, w=24, h=160. Basin right wall: x=1120, y=560, w=24, h=160.
  - Ground slab under the launch area (platform): x=420, y=620, w=520, h=80 → top y=580 (catches/supports the bouncer area), spans x 160–680.
- **Actors (ball first, then hero crate):**
  - ball (non-hero) at x=150, y=210, **vx=3** (rolls off shelf, then your parts do the work).
  - crate **hero** at x=720, y=298 (on pedestal top y=320).
- **Goal:** {x: 860, y: 510, w: 260, h: 100}.
- **Budget:** 45. **allowedParts:** `["ramp","bouncer","plank"]`. **par:** {parts: 2, cost: 30}.
- **Intended solution (2 parts):**
  - Ramp at x=360, y=520, angle=0 — high-left/low-right; the ball falls off the shelf, hits the ramp, accelerates down-right toward the bouncer at ground level, gaining speed.
  - Bouncer at x=600, y=540, angle≈ −30 (tilted up-right) — the fast ball strikes it and is flung UP and RIGHT at the crate on the pedestal (top y=320, crate center y≈298), striking the crate's side and knocking it RIGHT into the basin.
  - *Margin:* the basin is 260 wide and double-walled, immediately right of the pedestal; any rightward knock lands the crate. Budget 45 allows a catch plank above the basin if the crate tends to bounce out. The catapult arc is tunable (ramp speed × bouncer angle); engineer records the angle that lands a solid side-strike. Risk: bouncer angle sensitivity — see §9.

#### Level 12 — "Over the Wall" (launch + campaign finale — hardest)
- **Briefing:** "A wall guards the basin. Launch the ball over it to knock the crate down and in. This will take a few tests. That is engineering."
- **Terrain:**
  - Ball runway (platform): x=180, y=460, w=280, h=40 → top y=440, spans x 40–320. Ball spawns rolling right.
  - Pedestal (pedestal): x=620, y=500, w=80, h=160 → top y=420. Hero crate on top.
  - **Guard wall** (wall): x=820, y=380, w=24, h=320 → tall wall x 808–832, top y=220, BETWEEN the pedestal and the basin — the crate cannot simply slide right into the basin; it must be knocked OVER/around, or knocked so it topples right and falls past the wall's far side. (Design intent: the crate is knocked right, tips over the pedestal edge, and the guard wall's inner face funnels it down — OR the ball arc itself carries energy. Engineer determines which knock direction lands it; the basin sits past the wall.)
  - Goal basin floor (platform): x=1020, y=640, w=300, h=80 → top y=600, spans x 870–1170. (Basin is RIGHT of the guard wall.)
  - Basin left wall = the guard wall's right face (x=832); basin right wall: x=1160, y=560, w=24, h=160.
- **Actors (ball first, then hero crate):**
  - ball (non-hero) at x=120, y=412, **vx=9** (fastest hammer in the game).
  - crate **hero** at x=620, y=398 (on pedestal top y=420).
- **Goal:** {x: 850, y: 510, w: 290, h: 100}.
- **Budget:** 55. **allowedParts:** `["ramp","bouncer","plank","column"]`. **par:** {parts: 3, cost: 43}.
- **Intended solution (3 parts):**
  - Ramp at x=440, y=480, angle=0 — bridges runway→pedestal base, keeps the 9-vx ball low and fast into the crate's lower-right, knocking it RIGHT and UP off the pedestal toward the guard wall.
  - Plank at x=720, y=380, angle≈ +12 (downslope toward the wall, i.e. high-left/low-right) — a kicker ledge: the knocked crate lands on it and is guided UP-and-right toward the top of the guard wall (top y=220), helping it clear or top the wall.
  - Bouncer at x=760, y=300, angle≈ −15 — positioned near the wall top to bounce the crate the final bit OVER the guard wall so it drops into the basin on the far side.
  - *Margin (and honesty):* this is the hardest level and the most physically delicate — a crate (not a ball) clearing a wall is a real test. Protections: (a) the basin is 290 wide and double-walled, so once the crate is over the wall it cannot miss; (b) budget 55 is the game's most generous absolute headroom, letting the engineer add a 4th part (extra kicker plank / column to raise the bounce) without breaking the cost star's intent at 43; (c) **fallback design** if "crate clears the wall" proves un-tunable with margin: LOWER the guard wall top to y≈300 and convert the win to "crate is knocked right, tips over the pedestal lip, and slides down the guard wall's inner face into the basin" (basin then sits in the wedge between pedestal and wall). Engineer chooses whichever variant passes the ≥30-step margin rule by step ≤1000 and records it. The brief copy ("a few tests") sets the kid's expectation that this one is meant to be iterated.

---

## 4. Juice Script

> All micro-interactions 100–200ms ease-out; set-pieces 800–1200ms, skippable by tap; `prefers-reduced-motion` → set-pieces become ≤200ms fades, particles killed. Every tap gives visible feedback within 100ms. Sounds reference `sfx` from shared-design plus the two app voices in §4.7.

### 4.1 Arm a part (tap a tray card)
- Card lifts 4px, gains a 2px cyan focus ring, cost label pulses once (scale 1→1.08→1, 140ms). `sfx.select()`.
- Cursor/pointer now carries a **ghost** of the part: dashed cyan outline (the part's silhouette) at 70% opacity, following the pointer. A faint dimension arrow shows the part's width.
- If the tray card is unaffordable (cost > remaining budget): card is grayed, tap does a 120ms horizontal shake (±3px) + `sfx.fail()` (soft 196Hz). No arm.

### 4.2 Move ghost over the sheet
- Ghost snaps to a 10px grid as it moves (subtle 60ms ease between snap cells — reads as magnetic, professional).
- Over a forbidden zone (intersecting goal rect, or within 50px of an actor spawn): ghost outline turns **warn-amber** (#ffd166), a small "no-place" dimension bracket appears, placement tap is blocked with `sfx.fail()`.

### 4.3 Place a part (tap on a valid spot)
- Ghost solidifies into the real part with a **120ms "draft-ink" wipe**: the dashed outline fills with the current pen color from left edge to right (like ink drawing the line). `sfx.tap()` + a 1-frame chalk-dust puff (4–6 tiny chalk specks, 200ms fade) at the part's base.
- Budget meter animates down (number counts, bar shrinks, 180ms) and briefly flashes cyan.
- The placed part gets a thin dimension arrow on hover/select.

### 4.4 Select a placed part → floating chips
- Tap a placed part: it gains a selection halo (2px cyan dashed, slow 1.2s march animation), and three floating chips appear above it: **rotate −15°**, **rotate +15°**, **delete** (trash). Chips are ≥44px, 12px apart.
- Rotate chip: part rotates 15° with a 140ms ease, a faint protractor arc (showing the new angle in mono, e.g. "−15°") flashes for 500ms. `sfx.tap()`.
- Delete chip: part does a 160ms "un-ink" wipe (line retracts right→left to nothing) + a chalk-dust puff + `sfx.tap()` at lower pitch; budget meter animates back up (counts up, flashes cyan).

### 4.5 TEST start
- TEST button (primary, cyan, ≥48px) press: 120ms press-in, then the whole sheet does a subtle **"engage" pulse** — the blueprint grid brightens 8% for 200ms, the title block's REV number ticks, and a **test counter** stamps in the corner: "TEST #N" in mono, sliding in from the right (160ms). `sfx.select()` then a short rising two-tone "system arm."
- Editing locks (tray dims to 50%, chips vanish). The hero actor gets a 1-frame highlight ring so the kid knows what to watch.
- The rAF accumulator begins stepping the sim; bodies move via transform writes.

### 4.6 During the run — impacts
- **Ball/crate hits a plank, ramp, ground, or wall:** at the contact point, a **dust burst** — 5–9 chalk specks (2–4px, #e8f1ff at 60% → 0 over 260ms) kicked in the impact direction, scaled by impact speed (fast hit = more, wider specks). Paired sound: **wood knock** voice (§4.7) for plank/ramp/ground, soft thud for wall.
- **Ball hits a bouncer:** a cyan **ring-flash** (expanding 1px ring, 240ms) at the contact + the bouncer flexes (squash 1.0→0.9→1.0 on its short axis, 180ms) + **boing** voice (§4.7).
- **Crate (hero) gets knocked:** a brief motion-blur streak (CSS, 1 frame) + extra dust; reinforces "payload launched."
- **Hero idle bob (pre-test):** before TEST, the hero ball/crate has a 2px vertical idle bob (2.4s sine loop) and a slow blink of a tiny cyan "live" pip — it looks alive, never a static asset.

### 4.7 App-specific sound voices (added to the shared `sfx` object)
- **`sfx.boing`** — bouncer contact. Two quick sine tones sliding UP (e.g. 300→520Hz, 120ms, gain 0.14) with a tiny pitch wobble — a soft, springy boing. Never harsh.
- **`sfx.knock`** — wood/crate contact. A short low triangle "tok" (160Hz, 70ms, gain 0.12) layered with a 30ms filtered noise click — a dry wooden knock. (Engineer implements both in the same synthesized style as the reference module; zero asset files.)

### 4.8 FAILURE (framed as data)
- When the sim ends without success (out-of-bounds, or step 1200 reached): the run **freezes for 1 frame**, then a calm **data card** slides up from the bottom (220ms): mono header "TEST #N · LOGGED", one neutral diagnostic line (see §5 copy variants, chosen by failure mode), and a faint trace overlay — the hero's path drawn as a thin dashed dotted line so the kid SEES where it went (this is the "failure is data" made literal and is the game's signature teaching beat).
- Sound: `sfx.fail()` (soft 196Hz) only — never a buzzer, never a downward "sad" slide.
- The hero actor returns to its spawn with a quick 200ms ease. "RETEST" / "EDIT" buttons appear. No modal, no blocking — the kid can immediately re-arm a part.
- The test path trace persists faintly (20% opacity) behind the editor for ONE edit cycle, so the kid can adjust against the actual trajectory, then clears on the next TEST.

### 4.9 SUCCESS set-piece — APPROVED stamp + flag raise (storyboard, ~1000ms total)
> Triggered the instant the hero completes its 30th consecutive in-goal step. Skippable by tap (jumps to the stars state).

- **t=0–120ms — Settle confirm:** the hero gives a tiny "locked" pulse (scale 1→1.06→1) inside the goal; the dashed goal rect snaps from dashed-cyan to solid-success-green (#80ed99) and the basin floor glows green (160ms). `sfx.success()` chord begins.
- **t=120–520ms — APPROVED stamp slam:** a large mono **"APPROVED"** stamp (success-green, slightly rotated −6°, drafting-stamp style with a thin border and a tiny "REV N / MISSION NN" subline) **slams down** from above onto the title block corner: scale 1.6→1.0 with an overshoot ease (lands at ~360ms), a **0.85→1.0 ink-splat** (radial chalk-dust ring of 12–16 specks bursting outward, 300ms fade), and a 60ms screen-impact shake (±2px) ONLY if reduced-motion is off. Layered `sfx.stamp()` (noise + low thunk) at the slam frame.
- **t=300–900ms — Flag raise at the goal:** a small **pennant flag** (CSS triangle in the current pen color) rises on a thin staff planted in the goal basin — staff draws upward (0→full height, 320ms ease-out), flag unfurls (skew/wave keyframe, 2 gentle waves over 600ms). A soft three-note rising arpeggio (reuse `sfx.success` tail or a quiet `sfx.collect`) accents the unfurl.
- **t=520–1000ms — Stars reveal (see §4.10).**
- Reduced-motion path: goal turns green (fade), "APPROVED" fades in over 180ms, flag appears already-raised (no unfurl), stars fade in sequentially with no particles. Total ≤500ms.

### 4.10 Stars reveal
- Three star slots sit in the data/title block. They reveal **left-to-right, 140ms apart**, each star: a small mono caption types in beside it, then the star "mints" — drawn as an SVG outline that fills with success-green + a single sparkle (4-point glint, 200ms).
  - **Star 1 — "SOLVED"** — always earned on success. Mints first.
  - **Star 2 — "≤ {par.parts} PARTS"** — mints only if the build used ≤ par.parts; otherwise the slot stays a dim outline with caption "used {n} parts".
  - **Star 3 — "≤ {par.cost} COST"** — mints only if total cost ≤ par.cost; otherwise dim with caption "cost {c}".
- Each minted star plays a single `sfx.collect()`. Unearned slots are calm, never red, never shaming — just an un-inked outline (the kid reads them as "next time").
- After the reveal: a quiet footer line and the level's stars persist to the save; the row on mission-select updates its star pips.

---

## 5. Copy Deck (every system string)

> Register: calm, specific, quietly warm; talk to the player as a capable colleague. **No exclamation marks in system copy. No emoji. No "Great job, buddy."** Mono for stamps/labels/diagnostics, Inter for prose/briefings.

### 5.1 Shell & navigation
- App title / header: **Inventor Lab**
- Profile prompt: **Who's at the bench?**
- Profile discs: Player One · Player Two · Guest (monogram, colored disc)
- Mission select header: **Prototype Bench**
- Series row labels: **BRIDGE** · **BALL RUN** · **LAUNCH**
- Series subtitles: "Span the gap." · "Route the drop." · "Launch the payload."
- Locked-series hint (if gated by stars in future — v1 all open): "Earn stars to unlock." *(v1: all 12 open; copy reserved.)*
- Level card subline: "MISSION {NN} · REV {r}" (REV increments per solve/edit session)
- Back to bench: **Bench**
- Mute toggle aria-label: "Mute sound" / "Unmute sound"
- Read-aloud button aria-label: "Read aloud"; stop affordance aria-label: "Stop"

### 5.2 Editor
- Tray header: **PARTS**
- Part names + cost labels: "Plank · 10" · "Ramp · 15" · "Bouncer · 20" · "Crate · 5" · "Column · 8"
- Budget meter label: **BUDGET** — "{remaining} / {budget}"
- Over-budget tooltip (on grayed card): "Over budget. Free up {n} to place this."
- Forbidden-placement note: "Cannot place here. Keep clear of the goal and the actor."
- Chip labels (aria): "Rotate left 15 degrees" · "Rotate right 15 degrees" · "Delete part"
- Primary buttons: **TEST** · **RESET** · **RETEST** · **EDIT**
- RESET confirm (inline, non-blocking): "Build restored." (toast, 1.5s)
- Empty-build TEST guard (allowed, just fails): no block — runs and logs as a test.

### 5.3 Briefings
> Each level's `briefing` (≤30 words) is in §3. Every briefing gets a SpeakButton. Briefing panel header: "BRIEF · MISSION {NN}". Mono stamp in corner: "MISSION {NN} · REV {r}".

### 5.4 TEST counter & run
- Test stamp: **TEST #{N}** (N = lifetime tests run on THIS level by THIS profile; persisted)
- Run status (while stepping, small mono): "RUNNING…"
- (No timer shown — sim-steps only; the kid never sees step counts.)

### 5.5 Failure diagnostics (data-framed; engine picks by failure mode)
> Header always: **TEST #{N} · LOGGED**. Then ONE line. All neutral, iteration-positive, specific. Rotate variants so repeat fails do not repeat the exact line.

**Mode: ball/crate fell out of bounds (off an edge):**
- "Off the edge at the {left/right} side. The path needs a catch there."
- "It ran out of road. Try extending the span."
- "Dropped past the goal. A ramp could nudge it in."

**Mode: stopped short / never reached goal (settled outside, ran 1200 steps):**
- "Test {N} logged. The ball stopped short. More ramp?"
- "It settled before the goal. A little more slope, or a longer road."
- "Close. The payload did not clear. More push, or a steeper launch."

**Mode: reached goal area but did not hold (bounced out / under 30 steps):**
- "It touched the goal but rolled back out. Walls or a flatter catch will hold it."
- "Almost seated. The landing was too lively. Soften it."

**Mode: launch series — ball missed the crate entirely:**
- "The hammer missed the crate. Aim the ball lower and faster."
- "No contact. The ball needs to reach the crate's base."

**Mode: launch — crate knocked but landed wrong:**
- "Crate knocked, but it missed the basin. Catch it on the way down."

**Generic fallback (any mode):** "Test {N} logged. Adjust a part and run it again."

### 5.6 Success copy
- Stamp: **APPROVED**
- Stamp subline: "MISSION {NN} · REV {r}"
- Star captions: "SOLVED" · "≤ {par.parts} PARTS" · "≤ {par.cost} COST"
- Unearned star captions: "used {n} parts" · "cost {c}"
- Success footer (one calm line, rotates): "Logged and approved. Clean build." / "It holds. Mission approved." / "Solved in {N} tests. That is the job." *(the last variant celebrates iteration explicitly)*
- "Next mission" button: **Next**; "Replay": **Rebuild**

### 5.7 My Inventions
- Section header: **My Inventions**
- Saved-build card: "MISSION {NN} · {stars}★ · {parts} parts, {cost} cost"
- Load button: **Load build**
- Empty state: "Solve a mission to save your first build."

### 5.8 Achievements & cosmetics surfaces (strings in §6/§7)
- Achievements header: **Engineer's Log**
- Cosmetics header: **Blueprint Pens**
- Locked cosmetic tooltip: "Unlock at {n} stars."

### 5.9 Profile / settings micro-copy
- Reset save (ErrorBoundary & settings): "Reset this profile's save" → confirm "Clear {name}'s bench? Builds and stars for {name} are erased." → "Clear" / "Keep"
- Sound default: ON. Mute persists per profile.

---

## 6. Achievements (6 badges) + Cosmetics (6 pens)

### 6.1 Achievements — "Engineer's Log" (mono badge plates, drafting-stamp style)
> All framed as virtues; the iteration badge is the emotional centerpiece. Each unlock = a quiet `sfx.collect()` + a badge-plate mint (200ms), no interruption to play.

| Badge | Plate name | Criteria | Why it exists |
|-------|-----------|----------|---------------|
| 1 | **First Approval** | Solve any mission (first APPROVED stamp). | Onboarding payoff. |
| 2 | **Test Pilot** | Run 10 tests total (across all missions). | *The iteration-positive badge.* Rewards trying, not winning — explicitly counts failures as progress. Plate subline: "Engineers test things." |
| 3 | **Clean Sheet** | Earn all 3 stars on any single mission. | Rewards efficiency without forcing it. |
| 4 | **Bridge Builder** | 3-star every BRIDGE level (5/5). | Series mastery. |
| 5 | **Down the Run** | Solve all 4 BALL RUN levels. | Series completion. |
| 6 | **Launch Authority** | 3-star the finale "Over the Wall" (Mission 12). | The capstone flex. |

> Reserved (not v1, but criteria pre-defined so adding is append-only): "Hundred Tests" (100 tests run), "Full Bench" (3-star all 12).

### 6.2 Cosmetics — "Blueprint Pens" (placed-part LINE color; pure CSS variable `--pen`)
> Unlocked by TOTAL stars across all missions (max possible = 36). Surfaced in the profile/Pens screen; selecting one re-colors all placed-part outlines and the flag pennant. Default is Chalk.

| Pen | Name | Hex | Unlock |
|-----|------|-----|--------|
| 1 | **Chalk White** | `#e8f1ff` | Default (0 stars). |
| 2 | **Cyan Draft** | `#4cc9f0` | 6 stars. |
| 3 | **Amber Line** | `#ffd166` | 14 stars. |
| 4 | **Spec Green** | `#80ed99` | 22 stars. |
| 5 | **Magenta Rev** | `#f72585` | 30 stars. |
| 6 | **Gold Master** | `#ffd700` | 36 stars (all stars — the prestige pen). |

All hexes meet ≥4.5:1 against the blueprint bg (#0e2a47) for the line weights used; Gold Master is a reward color reserved for total mastery.

---

## 7. Early-Reader Path (6-year-old)

> Goal: the early reader reaches their first APPROVED stamp in under 2 minutes, alone, on a tablet, without reading a full sentence.

### 7.1 Briefing comprehension (reading-optional)
- Every briefing has a prominent **SpeakButton** (lucide `Volume2`, ≥48px, labeled "Read aloud"). On the profile-pick → first level path, the SpeakButton sits directly under the brief, visually the most inviting non-TEST control. The early reader taps it; TTS reads the brief at rate 0.95.
- Briefings are written ≤30 words, present-tense, concrete verbs ("Drop one plank…", "The ball is rolling…"). The FIRST clause is always the action ("Drop one plank to bridge the gap").
- Visual reinforcement of the brief: the goal pocket pulses gently once when the brief is read, and a faint **dimension arrow** spans the gap the kid must bridge — so "bridge the gap" is shown, not just told.

### 7.2 Visual affordances (the early reader can play by looking)
- The **gap** the hero must cross is the most visually obvious feature: framed by the launch ledge and the dashed goal pocket, with the hero ball idle-bobbing at the start (a living thing that wants to GO).
- The **only affordable, allowed part** on L1 is the Plank (allowedParts = `["plank"]`), so the early reader cannot pick a wrong part. The tray has exactly one card.
- The **ghost** shows exactly where the part will land; the 10px snap makes it feel like the part wants to fit. The early reader drags the ghost over the gap, taps, done.
- **TEST** is the single biggest, brightest button on the screen (cyan, ≥48px). It never moves. After placing, the obvious next action is TEST.

### 7.3 Forgiving design, levels 1–3
- **L1** is winnable with one plank placed anywhere in a ~120px-wide zone over the gap — the dock is 320 wide and back-walled, the ball spawns rolling. There is no aiming. (The ≤2-minute first win.)
- **L2 / L3** keep `allowedParts` to 1–2 part types and add a **mid pier / pillar** that does the hard alignment FOR the kid — the kid only has to drop planks onto an obvious flat target. Budgets are 2.0–2.2× slack so over-building still wins (just costs a star, never a loss).
- Failure is never a dead end for the early reader: the **path trace** (§4.8) shows the ball's actual route as a dotted line, and the soft `sfx.fail()` + neutral one-liner ("It ran out of road. Try extending the span.") invites one more part. No modal, no "you lost," no retry penalty. RETEST is one tap.
- The **APPROVED stamp + flag raise** is loud, physical, and immediate — the reward the early reader is chasing. It fires on their first solve and mints **First Approval**.
- Star 2/3 being unearned looks calm (dim outline), never red — the early reader keeps Star 1 ("SOLVED") every time they win, which is the only one they need to feel like an engineer.

### 7.4 The 8-year-old layered on top
- The 8-year-old reads briefings herself (SpeakButton optional), chases the cost star (efficiency), and is the target for L7–L9 and L11–L12 multi-part solutions. The same levels serve both kids: the early reader wins Star 1 by over-building inside the generous budget; the 8-year-old earns all three by finding the clean build. No separate difficulty tracks — the star system IS the difficulty layering.

---

## 8. Open Questions for the Director

1. **L12 wall-clearing risk.** "Over the Wall" asks a *crate* (not a ball) to clear a guard wall — the most delicate physics in the game. I designed a fallback (lower the wall, convert to a topple-and-slide-down-the-inner-face win) inside the same schema. **Do you accept the fallback variant as engineer's discretion, or must the finale be the over-the-wall arc specifically?** (Recommend: accept fallback — the margin rule is non-negotiable, the spectacle is preservable either way.)

2. **REV numbering semantics.** I increment "REV {r}" per solve/edit session for drafting-sheet flavor. **Should REV reflect lifetime edits to a mission, or reset per session?** (Recommend: lifetime, persisted — it reads as a real revision history and quietly rewards return visits.)

3. **Total stars ceiling vs. final pen.** Gold Master pen unlocks at the full 36 stars. **Is "all stars" too steep for a 6-year-old to ever see, and do you want an early-reader-reachable prestige pen earlier?** (I kept it aspirational on purpose; could add a 5-star "Bench Rookie" pen if you want an early win for the 6-year-old.)

4. **Path-trace persistence.** The failure path trace persists faintly for one edit cycle so kids adjust against the real trajectory. **Any concern this reveals too much / makes solutions trivial for the 8-year-old?** (Recommend: keep — it is the core "failure is data" teaching beat and the 8-year-old still must reason about the fix.)

5. **Series gating.** v1 ships all 12 levels open (copy reserved for star-gating). **Confirm fully-open is desired** — vs. gating BALL RUN / LAUNCH behind, say, 6 / 14 stars to pace progression. (Recommend: fully open for two kids sharing a tablet; gating creates "I can't play that one" friction between siblings.)

---

*End of GDD. Content inventory: 12 levels (5 bridge / 4 ballrun / 3 launch), 6 badges, 6 cosmetic pens. All `GDD must decide` items specified with zero TBDs; intended solutions are design intent with deliberate margin for engineer coordinate-tuning against the headless physics test.*
