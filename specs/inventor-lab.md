# Inventor Lab — App Spec (port 5185)

> Read `PLAN.md` and `specs/shared-design.md` first; both are binding. This spec adds the app contract. The GDD (`specs/gdd/inventor-lab-gdd.md`) finalizes level designs, tuning, and copy within these rails.

**Fantasy:** the kid is an engineer at a prototype bench solving build challenges on a living blueprint. Iteration is the hero mechanic — failure is data. "Engineers test things. Test #3."

## Aesthetic tokens
bg blueprint `#0e2a47` · deep panel `#0a1f36` · grid `rgba(255,255,255,.08)` · chalk `#e8f1ff` · cyan `#4cc9f0` · success `#80ed99` · warn amber `#ffd166`. Display + annotations `@fontsource/ibm-plex-mono`, body Inter. Motifs: drafting grid, dashed part outlines, dimension arrows, title-block mission stamps ("MISSION 07 — REV 2"), APPROVED stamp set-piece. Atmosphere: subtle chalk-dust speckle, corner title block like a real drawing sheet; impacts kick up dust particles.

## Deterministic simulation contract (BINDING — deviations are bugs)
- `matter-js` **exact `"0.20.0"`** (no caret) + `@types/matter-js` dev. Import ONLY engine modules (`Engine, World/Composite, Bodies, Body, Events` as needed) — never `Render`, `Runner`, `Mouse`, `MouseConstraint`.
- Fixed timestep everywhere: `Engine.update(engine, 1000/60)`. Browser: rAF drives an accumulator that consumes fixed 1000/60 slices (≤4 steps per frame cap); tests: a plain loop. Wall-clock NEVER affects physics.
- `engine.positionIterations = 6; engine.velocityIterations = 4; engine.constraintIterations = 2; engine.enableSleeping = false;` gravity default.
- World space fixed at **1280×720 units**. The SVG viewBox is `0 0 1280 720`, scaled to fit the screen; pointer input maps through the inverse transform. Physics never sees display pixels.
- Body creation order is FIXED: terrain (JSON array order) → placements (array order) → actors (array order). Same order in browser and tests.
- **Success rule:** the `hero` actor's AABB fully inside the goal rect for **≥30 consecutive steps**, achieved within **1200 steps**; out-of-bounds (y > 760 or x < −40 or x > 1320) = fail; step 1200 without success = fail. Sim-steps only, never seconds.
- Every level's `knownSolution` must pass with margin: success achieved by step ≤1000, and the hero settles well inside the goal (not grazing an edge).

## Rendering (SVG, binding)
One `<svg viewBox="0 0 1280 720">`: terrain + goal zone + placed parts + actors as SVG elements. During TEST, a rAF loop steps the accumulator and writes body `position`/`angle` into element transforms. ~20 elements max. Goal zone renders as a dashed target region. Each dynamic element carries `data-testid` (e.g., `actor-hero`) and live `data-x/data-y` attributes so QA can assert positions from the DOM.

## Parts (v1 roster — no other parts, no constraints/motors)
| Part | Body | Size | Physics | Cost |
|------|------|------|---------|------|
| Plank | static rect | 120×16 | friction 0.5 | 10 |
| Ramp | static right-triangle | 120×80 | friction 0.5 | 15 |
| Bouncer | static rect | 80×16 | restitution 1.4 | 20 |
| Crate | dynamic rect | 40×40 | defaults | 5 |
| Column | static rect | 24×120 | friction 0.5 | 8 |

Actors: `ball` (circle r=18, restitution 0.2, friction 0.05) and `crate` variants per level JSON, optional initial velocity. All unstated properties = matter-js 0.20.0 defaults (version pin makes them stable).

## Level schema (binding)
```ts
interface TerrainBlock { kind: "platform"|"wall"|"pedestal"; x: number; y: number; w: number; h: number; angleDeg?: number }
interface Actor { kind: "ball"|"crate"; x: number; y: number; vx?: number; vy?: number; hero: boolean }
interface Placement { part: "plank"|"ramp"|"bouncer"|"crate"|"column"; x: number; y: number; angleDeg: number }
interface Level {
  id: number; series: "bridge"|"ballrun"|"launch"; title: string; briefing: string;
  budget: number; allowedParts: Placement["part"][];
  terrain: TerrainBlock[]; actors: Actor[]; goal: { x: number; y: number; w: number; h: number };
  par: { parts: number; cost: number };
  knownSolution: Placement[];
}
```
12 levels: 5 bridge (span gaps so the rolling hero crosses), 4 ballrun (route the hero down through obstacles to the goal), 3 launch (use bouncers/ramps so a moving ball knocks the hero crate off its pedestal into the goal). The GDD authors levels + intended solutions as DESIGN INTENT; the engineer tunes exact knownSolution coordinates until the headless test passes with margin (report any level whose terrain needed adjustment).

## Editor UX (tap-first, binding)
Tray of part cards (cost labels) → tap to arm → ghost follows pointer on the sheet → tap to place (10px snap). Tap placed part → floating chips: rotate −15° / +15° / delete. Placement forbidden intersecting the goal zone or within 50px of any actor spawn (ghost turns warn-amber). Budget meter live; over-budget parts unaffordable (grayed). **TEST** locks editing and runs the sim (test counter increments: "Test #3"); **RESET** restores the build exactly (testing is never destructive). `?solve=1` (dev) auto-places `knownSolution`. Success → APPROVED stamp set-piece (+ flag raise at the goal) + stars: solved / parts ≤ par.parts / cost ≤ par.cost. "My Inventions": saved solution per level (placements serialized; mini-SVG thumbnail), re-loadable.

## Progression & feel
Series rows on mission select with stars. Cosmetics: 4–6 blueprint pen colors (placed-part line color) unlocked by total stars. Badges (~6, GDD finalizes; must include an iteration-positive badge, e.g., "Test Pilot — 10 tests run" framed as virtue). Physics impacts emit dust particles + app-specific `sfx` voice (soft boing for bouncer, wood knock for crate).

## Required tests (Vitest, headless matter-js in Node)
1. All 12 levels: `knownSolution` succeeds by step ≤1000 (margin rule).
2. All 12 levels: empty build fails.
3. All 12 levels: `knownSolution` minus any single part fails (no decorative parts).
4. Determinism: running level 1's knownSolution twice yields the identical success step.
5. Out-of-bounds detection, consecutive-steps-in-goal counter, budget arithmetic, placement-validity rules (unit level).

## Acceptance checklist (QA runs this verbatim)
1. Loads clean (zero console errors). 2. Profile pick; level 1 brief visible; first win ≤2 min (level 1 is one plank). 3. Tap-place a plank from tray; ghost + snap behave. 4. TEST on a bad/empty build runs and fails gracefully ("Test #N" framing, retry available). 5. `?solve=1` then TEST → success: APPROVED stamp set-piece with sound + stars; `actor-hero` element's `data-x/data-y` inside goal rect. 6. Rotate and delete chips work. 7. Budget enforced (can't place beyond budget). 8. RESET preserves the build after a test. 9. Stars persist after reload. 10. SpeakButton on briefing works. 11. Mute persists. 12. Manifest + icons present. 13. Aesthetic pass (drafting-sheet atmosphere, dust particles, dashed outlines — would a kid screenshot it?).

## GDD must decide (designer scope)
The 12 level designs (terrain layouts, actor setups, budgets, allowed parts, pars, intended solutions, briefs ≤30 words), difficulty ramp (level 1 trivially winnable), star pars, badge list, pen-color cosmetics, set-piece storyboard, app-specific sound voices, all copy (mission titles, counsel-style tips, failure copy variants — neutral, iteration-positive).
