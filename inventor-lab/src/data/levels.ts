// The 12 Inventor Lab levels.
// Coordinates are DESIGN INTENT from the GDD, fine-tuned by the engineer until each
// knownSolution passes the headless physics test with margin (success by step ≤1000,
// hero settled well inside goal). Tuning notes live in TUNING.md.
//
// Coordinate convention: 1280×720 world, origin top-left, y increases downward.
// terrain/placement x,y = body CENTER. goal x,y = top-left corner of the rect.
import type { Level } from "../game/types";

export const LEVELS: Level[] = [
  // ====================== BRIDGE SERIES (5) ======================
  {
    id: 1,
    series: "bridge",
    title: "First Span",
    briefing: "Drop one plank to bridge the gap. The ball is already rolling. Give it a road to the dock.",
    budget: 30,
    allowedParts: ["plank"],
    terrain: [
      { kind: "platform", x: 210, y: 500, w: 360, h: 40 }, // launch ledge, top y=480, ends x=390
      { kind: "platform", x: 700, y: 600, w: 380, h: 80 }, // goal dock floor (lower), top y=560, x 510-890
      { kind: "wall", x: 870, y: 520, w: 24, h: 160 }, // dock back wall at x=870
    ],
    // Spawn ball near the ledge edge with a GENTLE nudge (vx=4). With the retuned livelier ball (lower
    // frictionAir, see sim.ts/TUNING.md), a faster spawn would coast off the ledge into the dock unaided,
    // making the plank decorative; vx=4 means the unaided ball drops short into the gap (fails) and the
    // downhill plank is genuinely required to reach the dock.
    actors: [{ kind: "ball", x: 320, y: 462, vx: 4, vy: 0, hero: true }],
    // Goal placed where the ball naturally settles after the downhill bridge (oversized, forgiving).
    goal: { x: 540, y: 470, w: 280, h: 110 },
    par: { parts: 1, cost: 10 },
    // Downhill plank from the ledge lip toward the lower dock — gravity keeps the ball rolling. Ball
    // rolls down into the dock pocket and settles. (Retuned: plank lower/steeper for the gentler spawn.)
    // Snap-tolerance (2026-06): plank centered at x=460 (was 470) so the gentle ball's ledge→plank
    // handoff has margin on BOTH sides — at the old x=470 a +10px snap dropped the slow ball into the
    // notch between the ledge lip and the plank's high end and it stalled. x=460 tucks the high end
    // closer under the lip; all ±10px variants now clear. Pure re-record, no terrain change.
    knownSolution: [{ part: "plank", x: 460, y: 540, angleDeg: 16 }],
  },
  {
    id: 2,
    series: "bridge",
    title: "The Long Reach",
    briefing: "One plank will not reach. Two planks make a longer road. Span the wide gap to the dock.",
    budget: 40,
    allowedParts: ["plank"],
    terrain: [
      { kind: "platform", x: 220, y: 480, w: 320, h: 40 }, // ledge, top y=460, ends x=380
      // Dock: left edge extended 750 → 710 (w 420 → 460; right edge unchanged at 1170). Snap-tolerance
      // fix (2026-06): the dock's left CLIFF FACE sat right where the 2-plank chute delivered the ball;
      // a ±10px shift on the lower plank made the ball slam that face and rebound into the gap (OOB).
      // Pulling the left edge 40px toward the chute means the ball lands on TOP of the dock for all
      // ±10px variants. A single plank still lands short of x=710 (remove-any still fails — verified).
      { kind: "platform", x: 940, y: 640, w: 460, h: 80 }, // dock (lower), top y=600, x 710-1170
      { kind: "wall", x: 1150, y: 560, w: 24, h: 160 }, // dock back wall
    ],
    actors: [{ kind: "ball", x: 330, y: 442, vx: 6.5, vy: 0, hero: true }],
    goal: { x: 770, y: 510, w: 340, h: 110 },
    par: { parts: 2, cost: 20 },
    // Two collinear downhill planks (16°) form one continuous descending road into the walled dock. The
    // dock sits far enough right (retuned) that a SINGLE plank lands short of it — both planks are
    // load-bearing. Ball rides the chute and settles against the back wall well inside the pocket.
    knownSolution: [
      { part: "plank", x: 490, y: 515, angleDeg: 16 },
      { part: "plank", x: 596, y: 545, angleDeg: 16 },
    ],
  },
  {
    id: 3,
    series: "bridge",
    title: "Pillar Gap",
    briefing: "A tall pillar blocks the low road. Plank across to the dock, using the pillar top as a stepping stone.",
    budget: 40,
    allowedParts: ["plank", "column"],
    terrain: [
      { kind: "platform", x: 220, y: 440, w: 360, h: 40 }, // ledge, top y=420, ends x=400
      { kind: "wall", x: 560, y: 610, w: 50, h: 300 }, // blocking pillar, top y=460 (raised: an unaided
      // ball can no longer skim over it — the over-pillar plank bridge is required).
      { kind: "platform", x: 860, y: 640, w: 420, h: 80 }, // dock (lower), top y=600, x 650-1070
      { kind: "wall", x: 1050, y: 560, w: 24, h: 160 }, // dock back wall
    ],
    actors: [{ kind: "ball", x: 320, y: 402, vx: 6.5, vy: 0, hero: true }],
    goal: { x: 650, y: 510, w: 360, h: 110 },
    par: { parts: 2, cost: 20 },
    // Two collinear downhill planks (14°) bridge OVER the raised pillar (top y=460) into the dock pocket.
    // Ball rides the chute clear of the pillar and settles inside the pocket against the back wall.
    knownSolution: [
      { part: "plank", x: 454, y: 453, angleDeg: 14 },
      { part: "plank", x: 561, y: 480, angleDeg: 14 },
    ],
  },
  {
    id: 4,
    series: "bridge",
    title: "Downhill Start",
    briefing: "The ball starts still. Build a ramp to get it rolling, then a plank to carry it across to the dock.",
    budget: 35,
    allowedParts: ["ramp", "plank"],
    terrain: [
      { kind: "platform", x: 160, y: 360, w: 260, h: 40 }, // start shelf, top y=340, ends x=290
      { kind: "platform", x: 760, y: 660, w: 440, h: 80 }, // dock (low), top y=620, x 540-980
      { kind: "wall", x: 960, y: 580, w: 24, h: 160 }, // dock back wall
    ],
    actors: [{ kind: "ball", x: 300, y: 320, vx: 0, vy: 0, hero: true }],
    goal: { x: 560, y: 530, w: 380, h: 110 },
    par: { parts: 2, cost: 25 },
    // Ball balances at the shelf lip (vx=0); placing the ramp gives it a slope to tip onto, so the
    // ramp IS the motor. It rolls down-right onto a long downhill plank into the dock pocket.
    // Snap-tolerance (2026-06): plank center x=490 (was 500). At x=500 a +10px snap put the plank's
    // raised left END where the ball arrived off the ramp, so it struck the end face and bounced back
    // into the gap (OOB). x=490 lands the ball on the plank's upper surface for all ±10px variants.
    // Pure re-record, no terrain change.
    knownSolution: [
      { part: "ramp", x: 340, y: 410, angleDeg: 0 },
      { part: "plank", x: 490, y: 490, angleDeg: 26 },
    ],
  },
  {
    id: 5,
    series: "bridge",
    title: "Two-Plank Cross",
    briefing: "Widest gap yet, and only planks. Stage two planks across the drop to reach the far dock.",
    budget: 30,
    allowedParts: ["plank"],
    terrain: [
      { kind: "platform", x: 200, y: 400, w: 300, h: 40 }, // ledge, top y=380, ends x=350
      { kind: "pedestal", x: 600, y: 640, w: 50, h: 240 }, // decorative pier under the chute
      // Dock: left edge extended 780 → 720 (w 440 → 500; right edge unchanged at 1220). Snap-tolerance
      // fix (2026-06): same dock-cliff problem as L2 but worse (steeper 22° chute) — a ±10px shift on
      // the upper plank made the ball either rebound off the dock's left face or trickle short, both OOB.
      // Pulling the left edge 60px toward the chute catches every ±10px variant on the dock top. A single
      // plank still lands short of x=720 (remove-any still fails — verified).
      { kind: "platform", x: 970, y: 660, w: 500, h: 80 }, // dock (low), top y=620, x 720-1220
      { kind: "wall", x: 1200, y: 580, w: 24, h: 160 }, // dock back wall
    ],
    actors: [{ kind: "ball", x: 300, y: 362, vx: 7, vy: 0, hero: true }],
    goal: { x: 780, y: 530, w: 380, h: 110 },
    par: { parts: 2, cost: 20 },
    // Bridge finale: two collinear steep planks (24°) span the widest drop into the far dock pocket. The
    // dock is far enough right (retuned) that a single plank lands short — both planks are load-bearing.
    knownSolution: [
      { part: "plank", x: 480, y: 430, angleDeg: 22 },
      { part: "plank", x: 590, y: 474, angleDeg: 22 },
    ],
  },
  // ====================== BALLRUN SERIES (4) ======================
  {
    id: 6,
    series: "ballrun",
    title: "Drop In",
    briefing: "The ball falls straight down past the goal. Add one ramp to nudge it sideways into the basin.",
    budget: 30,
    allowedParts: ["ramp"],
    terrain: [
      { kind: "wall", x: 300, y: 280, w: 24, h: 280 }, // chute left
      { kind: "wall", x: 430, y: 180, w: 24, h: 120 }, // chute right (short, lets ball exit right)
      { kind: "platform", x: 660, y: 660, w: 460, h: 80 }, // basin floor, top y=620, x 430-890
      { kind: "wall", x: 870, y: 540, w: 24, h: 200 }, // basin right wall (stops the rolling ball)
    ],
    actors: [{ kind: "ball", x: 360, y: 130, vx: 0, vy: 0, hero: true }],
    goal: { x: 470, y: 530, w: 380, h: 110 },
    par: { parts: 1, cost: 15 },
    // One ramp catches the straight drop and deflects it RIGHT, arcing into the open basin.
    knownSolution: [{ part: "ramp", x: 360, y: 420, angleDeg: 0 }],
  },
  {
    id: 7,
    series: "ballrun",
    title: "The Funnel",
    briefing: "Two ramps make a funnel. Catch the falling ball on the left, hand it to the right, and drop it in the basin.",
    budget: 45,
    allowedParts: ["ramp", "plank"],
    terrain: [
      { kind: "wall", x: 260, y: 200, w: 24, h: 200 }, // drop chute left
      { kind: "wall", x: 410, y: 200, w: 24, h: 200 }, // drop chute right
      { kind: "platform", x: 880, y: 660, w: 440, h: 80 }, // basin floor, top y=620, x 660-1100
      { kind: "wall", x: 1090, y: 540, w: 24, h: 200 }, // basin right wall
      { kind: "wall", x: 670, y: 600, w: 24, h: 80 }, // basin left lip (low)
    ],
    actors: [{ kind: "ball", x: 360, y: 150, vx: 0, vy: 0, hero: true }],
    goal: { x: 690, y: 530, w: 380, h: 110 },
    par: { parts: 2, cost: 35 },
    // Funnel: two ramps cascade the drop rightward and down into the basin. Tuned via 2-part grid.
    knownSolution: [
      { part: "ramp", x: 340, y: 340, angleDeg: 0 },
      { part: "ramp", x: 540, y: 520, angleDeg: -5 },
    ],
  },
  {
    id: 8,
    series: "ballrun",
    title: "Switchback",
    briefing: "Zig then zag. Stack two ramps facing opposite ways so the ball switchbacks down into the basin.",
    budget: 45,
    allowedParts: ["ramp", "column", "plank"],
    terrain: [
      { kind: "wall", x: 260, y: 180, w: 24, h: 200 }, // drop chute left
      { kind: "wall", x: 380, y: 180, w: 24, h: 200 }, // drop chute right
      // Walled basin with a TERRAIN floor. (The floor was a PLACED plank, but a placed part inside the
      // goal zone is forbidden by the editor — the new editor-validity proof caught it. Floor is terrain
      // now; the goal extends just below the floor top so the resting ball's AABB is fully contained.)
      { kind: "wall", x: 640, y: 600, w: 24, h: 120 }, // basin left wall, top y=540
      { kind: "wall", x: 820, y: 600, w: 24, h: 120 }, // basin right wall, top y=540
      { kind: "platform", x: 730, y: 660, w: 200, h: 80 }, // basin FLOOR (terrain), top y=620, x 630-830
    ],
    actors: [{ kind: "ball", x: 320, y: 150, vx: 0, vy: 0, hero: true }],
    // Goal right edge extended maxX 806 → 810 (w 152 → 156). Snap-tolerance fix (2026-06): a +10px shift
    // on the first ramp let the ball settle leaning against the basin's right wall at x≈790, whose AABB
    // max (≈808) poked 2px past the old goal edge (806), so it never registered "in goal." The extra 4px
    // (just to the right-wall inner face at x=808) captures that resting pose. (basin right wall x808-832.)
    goal: { x: 654, y: 522, w: 156, h: 106 }, // x 654-810; bottom 628 (just below the terrain floor top y=620)
    par: { parts: 2, cost: 30 },
    // Cascade switchback: ramp A deflects the drop RIGHT (without it -> the ball is lost); ramp B continues
    // the descent into the basin (without it -> lost). Both ramps load-bearing (verified). Shipped as a
    // rightward 2-ramp cascade rather than the GDD's literal left/right mirror; 180° mirroring is verified
    // (see TUNING.md). The ball settles on the terrain basin floor between the walls.
    knownSolution: [
      { part: "ramp", x: 340, y: 340, angleDeg: 5 },
      { part: "ramp", x: 520, y: 500, angleDeg: -8 },
    ],
  },
  {
    id: 9,
    series: "ballrun",
    title: "The Bank Shot",
    briefing: "No clean line down. Bank the ball off a tilted bouncer and across into the deep basin. Expect a few tests.",
    budget: 50,
    allowedParts: ["bouncer", "ramp", "plank"],
    terrain: [
      { kind: "wall", x: 280, y: 220, w: 24, h: 260 }, // drop chute left
      { kind: "wall", x: 410, y: 220, w: 24, h: 260 }, // drop chute right
      // Wide walled basin at the end of the bank; its FLOOR is TERRAIN now (a placed plank floor sat
      // inside the goal zone, which the editor forbids — caught by the new editor-validity proof).
      { kind: "platform", x: 860, y: 660, w: 220, h: 80 }, // basin FLOOR (terrain), top y=620, x 750-970
      { kind: "wall", x: 762, y: 580, w: 24, h: 160 }, // basin left wall, top y=500
      { kind: "wall", x: 958, y: 580, w: 24, h: 160 }, // basin right wall, top y=500
    ],
    actors: [{ kind: "ball", x: 350, y: 200, vx: 0, vy: 0, hero: true }],
    goal: { x: 772, y: 520, w: 176, h: 110 }, // sits in the basin, bottom 630 just below the floor top
    par: { parts: 2, cost: 35 },
    // Bank shot: the ramp deflects the drop right; a steeply tilted bouncer banks it across into the deep
    // basin (its spring keeps the ball lively — that liveliness is why it takes a few tests). Both parts
    // load-bearing: without the ramp the ball never reaches the bouncer; without the bouncer it falls short.
    // Snap-tolerance (2026-06): re-recorded ramp 340→330, bouncer 480→490. The old coords sat at a bank
    // CLIFF — a ±10px shift on either part made the ball miss the bouncer's sweet spot and fall short of
    // the basin (OOB). This pairing centers the ramp→bouncer→basin line so every ±10px variant banks in
    // (all variants win on the same step). Pure re-record, no terrain change.
    knownSolution: [
      { part: "ramp", x: 330, y: 390, angleDeg: 0 },
      { part: "bouncer", x: 490, y: 530, angleDeg: 20 },
    ],
  },
  // ====================== LAUNCH SERIES (3) ======================
  {
    id: 10,
    series: "launch",
    title: "Knock-Off",
    briefing: "The ball is your hammer. Send it rolling to knock the crate off its pedestal and into the catch basin below.",
    budget: 40,
    allowedParts: ["plank", "ramp"],
    terrain: [
      { kind: "platform", x: 280, y: 420, w: 360, h: 40 }, // runway, top y=400, ends x=460
      { kind: "pedestal", x: 680, y: 480, w: 50, h: 160 }, // pedestal (narrow), top y=400, x 655-705
      // ^ pedestal pushed right (was x=620) so the gap is wide enough that the bridge plank's center
      //   sits well clear (>50px) of the crate's spawn — the OLD knownSolution plank at runway height
      //   was inside the crate's 50px keep-clear ring, i.e. un-placeable in the editor (the critic's
      //   "invisible no-build zone" + the new editor-validity proof both flag this). See TUNING.md.
      { kind: "platform", x: 860, y: 660, w: 360, h: 80 }, // basin floor, top y=620, x 680-1040
      { kind: "wall", x: 1030, y: 560, w: 24, h: 200 }, // basin right wall
    ],
    actors: [
      // Hammer spawns near the runway lip with high speed so it strikes the crate hard.
      { kind: "ball", x: 420, y: 382, vx: 14, vy: 0, hero: false },
      { kind: "crate", x: 680, y: 378, hero: true }, // payload on pedestal top (y=400, center 378)
    ],
    goal: { x: 700, y: 528, w: 330, h: 114 },
    par: { parts: 1, cost: 10 },
    // One horizontal plank bridges the WIDE runway-to-pedestal gap at runway height, so the fast ball
    // rolls across and strikes the crate's base, knocking it RIGHT off the pedestal into the catch basin.
    // Without the plank the ball drops into the gap and never reaches the crate (the part is essential).
    // The plank center (x=530) is ~150px from the crate (x=680) — comfortably editor-placeable.
    knownSolution: [{ part: "plank", x: 530, y: 408, angleDeg: 0 }],
  },
  {
    id: 11,
    series: "launch",
    title: "The Catapult",
    briefing: "The ball needs a boost. Roll it down a ramp into a bouncer to fling it at the crate. Then catch the crate in the basin.",
    budget: 45,
    allowedParts: ["ramp", "bouncer", "plank"],
    terrain: [
      { kind: "wall", x: 230, y: 200, w: 24, h: 240 }, // ball drop chute left
      { kind: "wall", x: 360, y: 200, w: 24, h: 240 }, // ball drop chute right
      { kind: "platform", x: 470, y: 640, w: 520, h: 80 }, // ground slab, top y=600, x 210-730
      { kind: "pedestal", x: 690, y: 560, w: 50, h: 120 }, // pedestal (narrow), top y=500, x 665-715
      { kind: "platform", x: 940, y: 660, w: 420, h: 80 }, // basin floor, top y=620, x 730-1150
      { kind: "wall", x: 1140, y: 560, w: 24, h: 200 }, // basin right wall
    ],
    actors: [
      { kind: "ball", x: 300, y: 180, vx: 0, vy: 0, hero: false },
      { kind: "crate", x: 690, y: 478, hero: true }, // payload on pedestal top (y=500, center 478)
    ],
    goal: { x: 724, y: 528, w: 416, h: 114 },
    par: { parts: 2, cost: 35 },
    // Catapult: the dropping ball meets a ramp that sends it down-right into a tilted bouncer; the
    // bouncer flings it RIGHT into the crate's side, knocking the crate off its pedestal into the basin.
    // Re-tuned for the livelier ball (see sim.ts/TUNING.md); par.cost is the realizable 35 (ramp+bouncer).
    knownSolution: [
      { part: "ramp", x: 320, y: 420, angleDeg: 5 },
      { part: "bouncer", x: 480, y: 560, angleDeg: 15 },
    ],
  },
  {
    id: 12,
    series: "launch",
    title: "Over the Wall",
    briefing: "A wall guards the basin. Fling the ball to knock the crate down and in. This will take a few tests. That is engineering.",
    budget: 55,
    allowedParts: ["ramp", "bouncer", "plank", "column"],
    terrain: [
      { kind: "wall", x: 230, y: 200, w: 24, h: 240 }, // ball drop chute left
      { kind: "wall", x: 360, y: 200, w: 24, h: 240 }, // ball drop chute right
      { kind: "platform", x: 470, y: 640, w: 520, h: 80 }, // ground slab, top y=600, x 210-730
      { kind: "pedestal", x: 690, y: 560, w: 50, h: 120 }, // pedestal (narrow), top y=500, x 665-715
      { kind: "platform", x: 850, y: 660, w: 320, h: 80 }, // basin floor (terrain), top y=620, x 690-1010
      { kind: "wall", x: 1010, y: 540, w: 24, h: 240 }, // basin far GUARD WALL ("over the wall"), top y=420
    ],
    actors: [
      { kind: "ball", x: 300, y: 180, vx: 0, vy: 0, hero: false },
      { kind: "crate", x: 690, y: 478, hero: true }, // payload on pedestal top (y=500, center 478)
    ],
    goal: { x: 724, y: 498, w: 270, h: 132 }, // in the basin; bottom 630 below the terrain floor top y=620
    par: { parts: 2, cost: 35 },
    // Over the wall: the dropping ball meets a ramp that sends it down-right into a tilted bouncer; the
    // bouncer flings it into the crate, toppling it off the pedestal into the deep walled basin past the
    // guard wall. Both parts load-bearing (without the ramp the ball misses the bouncer; without the
    // bouncer it never reaches the crate). Redesigned from the old bridge-plank variant, whose plank had
    // to sit inside the crate's keep-clear ring (un-placeable) and whose crate-floor plank fell in the
    // goal zone — both flagged by the new editor-validity proof. See TUNING.md.
    // Snap-tolerance (2026-06): re-recorded ramp 320→310, bouncer 480→470. At the old coords a +10px
    // shift on the ramp re-timed the bounce so the hammer ball sailed OVER the crate (landing in the
    // basin itself) while the crate stayed on its pedestal — a win-condition miss. This pairing makes
    // the hammer strike the crate squarely for all ±10px variants. Pure re-record, no terrain change.
    knownSolution: [
      { part: "ramp", x: 310, y: 370, angleDeg: 5 },
      { part: "bouncer", x: 470, y: 540, angleDeg: 20 },
    ],
  },
];

export function getLevel(id: number): Level | undefined {
  return LEVELS.find((l) => l.id === id);
}
