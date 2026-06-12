# Inventor Lab — Physics Tuning Notes

How the 12 `knownSolution` coordinates were derived, and the matter-js 0.20.0 behaviors that shaped the level designs. The GDD authored levels as design intent; the engineer tuned exact coordinates until every headless suite passes with margin (success by step ≤1000, hero settled inside the goal, every part load-bearing).

## Ball liveliness retune (2026-06 — within the determinism contract)

The original ball used matter-js defaults (`frictionAir` 0.01 inherited) plus the spec's contact `friction 0.05`. The result read DEAD: a ball bled most of its speed on any flat run (a `vx=7` ball stopped in ~170px) and barely accelerated down a 15° ramp (peak speed ~3.9, crawling to ~1.4 by step 200). Rolls looked wrong to a kid and "stopped short" felt arbitrary rather than instructive.

Per the director amendment (the determinism CONTRACT — fixed timestep/iterations/body order/success margins/headless proofs — is unchanged, but exact ball physics values are the engineer's to tune within it), the ball values are now:

| Property | Old | New | Why |
|---|---|---|---|
| `frictionAir` | 0.01 (default) | **0.002** | The dominant drag. 5× lower lets gravity actually build momentum downhill; on a 15° ramp peak speed rises ~3.9 → ~4.1 and the ball *holds* ~2.4 at step 200 (was ~1.4), travelling ~580px (was ~350). |
| `friction` (contact) | 0.05 | **0.02** | Lower so the roll reads lively, but high enough that the ball still grips and settles in a goal rather than skating on ice (at 0.005 a flat `vx=7` ball slides ~770px — too slippery to ever settle). |
| `restitution` | 0.2 | 0.2 | Unchanged. |
| surface `friction` | 0.5 | 0.5 | Unchanged — that is the parts contract. |

Constants live in `sim.ts` (`BALL_FRICTION_AIR`, `BALL_FRICTION`, `BALL_RESTITUTION`). Values were chosen from a roll-down + flat-run sweep over `frictionAir ∈ [0.001, 0.01]` × `friction ∈ [0.005, 0.05]`. **All 12 `knownSolution`s were re-recorded** (and several levels' terrain/spawn adjusted) so every headless proof still passes with the contract's margins; see "Per-level outcomes" below. The headless `runLevel` is untouched (no early-settle), preserving the exact contract; early-settle is browser-only (`runtime.ts`).

The retune made the previously-dead levels lively, which broke six `knownSolution`s in two ways: (a) the faster ball reached some goals *unaided*, making the documented part decorative (L1, L2, L3, L5, L12); (b) the faster ball over/under-shot crate/bounce interactions (L9 flew out of bounds, L11 missed). Each was re-tuned (coords and, where noted, terrain) back to all-essential + margin.

## matter-js 0.20.0 findings (verified empirically, not assumed)

1. **Ramp orientation.** The Ramp is built from explicit right-triangle vertices via `Bodies.fromVertices`. At `angleDeg=0` the hypotenuse descends left→right (high-left / low-right) and deflects a falling/rolling ball to the **RIGHT** — matches the GDD's assumption. At `angleDeg=180` the triangle mirrors (high-right / low-left) and deflects **LEFT**. `Bodies.fromVertices` recenters the body to the triangle **centroid**, which is offset from the bounding-box center by `(+20, -13.3)` from the placement point; the SVG renderer (`render.ts` / `Sheet.tsx`) applies the same offset so the drawing matches the simulated body.

2. **A resting hero penetrates its support ~0.3px, so a goal's bottom edge must sit BELOW (not equal to) the floor it rests on.** A ball/crate settling on a surface has its AABB max ~0.3px past the surface top (matter-js soft contact). If the goal's bottom edge equals the floor top, the hero is never "fully inside" and never wins. Two consequences, both enforced by the new editor-validity proof: (a) the floor a hero rests in must be **terrain**, never a placed part, because a placed part inside the goal is forbidden by the editor; (b) the goal rect extends a few px below the terrain floor top. This fixed the latent L8/L9/L10/L12 designs whose floor was a placed plank sitting inside the goal zone — physically valid but **un-placeable in the UI**.

3. **Bouncer restitution required a fix + has no energy gain.**
   - **Bug:** `Bodies.rectangle(x,y,w,h,{ isStatic:true, restitution:1.4 })` silently resets `restitution` to `0` during static initialization. The bouncer was a dead plank. Fix: set `body.restitution = 1.4` **after** creation (`sim.ts`). A test guards this (`sim-units.test.ts`).
   - **Limitation:** even with `restitution=1.4` correctly set, matter-js clamps the bounce — a ball returns to roughly its drop height, never higher (effective restitution ≈ 1.0; values from 1.0 to 3.0 behave identically). So the bouncer **redirects** fall energy sideways/upward but cannot launch a ball over a tall wall with amplified energy. L9/L11/L12 were designed around this reality (see below).

## Per-level outcomes (after the ball retune + editor-validity proof)

Success steps below are the re-recorded values; all pass `step ≤1000` with hero settled well inside the goal, every part load-bearing, empty fails, and **every placement editor-valid** (new FIX 5 proof).

| # | Title | Solution | Step | Notes |
|---|-------|----------|------|-------|
| 1 | First Span | 1 plank (470,540,16°) | 174 | Spawn `vx` lowered **7 → 4**: the livelier ball would coast off the ledge into the dock unaided, so the plank is now genuinely required (unaided ball drops into the gap). |
| 2 | The Long Reach | 2 planks (16°) | 150 | Dock pushed right (+80) so a SINGLE plank lands short — both planks now load-bearing (the faster ball had made one plank enough). |
| 3 | Pillar Gap | 2 planks (14°) | 149 | Blocking pillar **raised** (top 520 → 460) so the unaided ball can no longer skim over it; the over-pillar bridge is required. |
| 4 | Downhill Start | ramp + plank | 169 | Unchanged design; re-recorded. Ramp is the motor (vx=0 start). |
| 5 | Two-Plank Cross | 2 planks (22°) | 121 | Dock pushed right (+120) so a single plank lands short — both load-bearing. |
| 6 | Drop In | 1 ramp | 103 | Unchanged design; re-recorded. |
| 7 | The Funnel | 2 ramps | 122 | Unchanged design; re-recorded. |
| 8 | Switchback | 2 ramps | 130 | **Floor changed from a placed plank to terrain** (the placed floor plank sat inside the goal zone → un-placeable; caught by the new proof). Now a 2-ramp cascade into a terrain-floored walled basin; `par` 3→2. |
| 9 | The Bank Shot | ramp + bouncer | 138 | **Floor changed to terrain** (same goal-overlap fix). 2-part ramp→bouncer bank into a deep terrain basin; the bouncer's spring keeps it lively ("expect a few tests"). `par` 3→2. |
| 10 | Knock-Off | 1 plank (530,408,0°) | 95 | **The critic's "invisible no-build zone" fix.** The old plank at runway height sat inside the crate's 50px keep-clear ring → un-placeable in the editor (confirmed by the new proof: it failed with reason `actor`). Pedestal pushed right (620 → 680) so the wide gap puts the bridge plank's center ~150px from the crate — now a clean, intuitive, editor-valid horizontal bridge. |
| 11 | The Catapult | ramp + bouncer | 146 | Re-tuned coords for the livelier ball (old coords missed the crate). `par.cost` corrected 30 → 35 (ramp+bouncer is inherently 35). |
| 12 | Over the Wall | ramp + bouncer | 137 | **Redesigned.** The old variant had two editor-validity faults (bridge plank inside the crate's ring; crate-floor plank inside the goal). Now a drop-chute launch: ramp→bouncer flings the ball into the crate, toppling it off the pedestal into a deep terrain basin past a terrain guard wall (the "wall"). 2 essential parts; `par` 3→2. |

### Mission 10 audit (FIX 5 / critic punch item)

The critic could find no path to the crate with the allowed parts and reported an "invisible no-build zone." Confirmed root cause: the **original `knownSolution` was itself un-placeable** — the documented `plank(528,408,0°)` was 32px from the crate spawn at (620,378), inside the 50px actor-clearance ring, so the editor rejected it (`reason: "actor"`). The *entire* runway-height row was forbidden (the ball at y=382 and crate at y=378 both project a clearance ring across it). A kid could only solve it with fiddly low/angled planks. Minimal honest fix: **pedestal moved right (x 620 → 680)**, widening the runway→pedestal gap so the obvious horizontal bridge plank (center x≈530) sits ~150px clear of the crate — placeable and intuitive. Re-recorded solution `plank(530,408,0°)`, wins step 95, plank essential, empty fails, editor-valid.

## `par` reconciliation

Each level's `par.parts`/`par.cost` were set to its actual `knownSolution` so the third star (clean build) is meaningful and achievable. The retune dropped four levels to 2 essential parts (L8, L9, L12: floor-now-terrain redesigns; their `par.parts` 3→2), and L11's `par.cost` was corrected 30 → 35.

## Snap-tolerance pass (2026-06 — robustness gap found in QA after the liveliness retune)

QA found that a hand-placed build at ~the `knownSolution` coordinates (within one 10px snap step) **overshot to out-of-bounds on L2**, while the exact `knownSolution` succeeded. The retune had tightened several solution basins to a knife-edge: the exact coords won, but a single snap-step of difference failed. A kid who builds "basically the right answer" must not fail on 10px.

**New suite — `snap-tolerance.test.ts`.** For every level it runs the `knownSolution` plus the 2N single-part ±10px-x variants, **skipping** any variant the editor would reject (incremental `checkPlacement` — same gate as the FIX-5 editor-validity proof). Every editor-valid variant must win within `MAX_STEPS` (1200). Margin policy: the strict ≤1000-step success margin and hero-settles-inside-the-goal margin stay enforced for the **exact** solution only (in `physics.test.ts` and re-asserted as this suite's baseline); variants only have to win (≤1200). A vacuous-pass guard requires ≥1 editor-valid variant per level (L10's lone plank legitimately skips its −10 side — it lands inside the crate's clearance ring — but its +10 side runs).

**Levels that failed snap-tolerance initially (7 of 12):** L1, L2, L4, L5, L8, L9, L12. (L3, L6, L7, L10, L11 already tolerant — the audit confirmed the re-geometried L1/L3/L5 specifically; L3 was already fine.)

**Two distinct failure modes were found, and fixed by the two distinct moves the brief prescribes:**

*Dock/goal CLIFF-edge cases (overshoot/undershoot out the side) — fixed by extending geometry, no re-record:*

| # | Failure | Geometry change | Why |
|---|---------|-----------------|-----|
| 2 | Lower plank ±10px → ball slammed the dock's left **cliff face** and rebounded into the gap (OOB). | Dock left edge **750 → 710** (terrain `x 960→940, w 420→460`; right edge fixed at 1170). | The cliff sat exactly where the chute delivered the ball; pulling the edge 40px toward the chute lands every variant on the dock TOP. A single plank still lands short of 710 (remove-any still fails). |
| 5 | Upper plank ±10px → ball rebounded off the dock face or trickled short (OOB) — worse, steeper 22° chute. | Dock left edge **780 → 720** (terrain `x 1000→970, w 440→500`; right edge fixed at 1220). | Same cliff fix, 60px. Single plank still short of 720 (remove-any holds). |
| 8 | First ramp +10px → ball settled leaning on the basin's right wall at x≈790; its AABB max (≈808) poked 2px past the goal's old right edge (806) → never "in goal" (timeout). | Goal right edge **maxX 806 → 810** (`w 152→156`), out to the right-wall inner face at x=808. | Captures the lean-on-the-wall resting pose. |

*Handoff / launch-chain CLIFF cases (ball missed the next part) — fixed by re-recording the solution to center it, no terrain change:*

| # | Failure | Re-record | Why |
|---|---------|-----------|-----|
| 1 | Plank +10px → the gentle (vx=4) ball dropped into the **notch** between the ledge lip and the plank's high end and stalled (timeout). | Plank `x 470 → 460`. | Tucks the plank's high end closer under the ledge lip; ±10px from 460 both clear. Tutorial stays trivial; remove-plank still fails. |
| 4 | Plank +10px → ball off the ramp struck the plank's raised **left END face** and bounced back into the gap (OOB). | Plank `x 500 → 490`. | Lands the ball on the plank's upper surface for both ±10px shifts. |
| 9 | Ramp +10px or bouncer −10px → ball **missed the bouncer** sweet spot and fell short of the basin (OOB). The "expect a few tests" bank shot was a knife-edge. | Ramp `(340,400,0) → (330,390,0)`, bouncer `(480,530,20) → (490,530,20)`. | Centers the ramp→bouncer→basin line; all four ±10px variants now win on the **same step** (138). |
| 12 | Ramp +10px → re-timed the bounce so the hammer ball **sailed over the crate** (landing in the basin itself) while the hero crate stayed on its pedestal — a win-condition miss (timeout). | Ramp `(320,380,5) → (310,370,5)`, bouncer `(480,540,20) → (470,540,20)`. | Hammer strikes the crate squarely for every ±10px variant. |

**No costs/pars changed; no geometry change forced a par change.** The L8 goal-edge nudge and the L2/L5 dock extensions do not alter part counts or budgets. The liveliness retune (`frictionAir 0.002`, `friction 0.02`) is untouched. All re-records keep the same part list, so `par.parts`/`par.cost` stay as reconciled above.

**All existing suites stay green** (physics proofs incl. ≤1000 exact margin + hero-inside, editor-validity FIX-5, determinism double-run, empty-fails, remove-any-fails) and the browser-runtime parity suite still matches the headless success steps for the re-recorded levels. Final count: **120 tests across 5 files** (was 107/4; +13 from the snap-tolerance suite: 12 per-level + 1 L2 regression).

## Tooling

Tuning used throwaway Vitest "sweep" harnesses (chute finders, single-part and joint grid sweeps, an essentiality checker) that drove the real `sim.ts`/`levels.ts` (no drift) and wrote reports to a scratch dir. They are deleted; only the required suites remain (`physics`, `sim-units`, `placement`, `runtime`, `snap-tolerance`). The snap-tolerance pass reused the same approach (a `vite-node` variant-sweep over the real sim) to find the minimal dock-edge extensions and re-record coordinates; those scratch scripts are deleted.
