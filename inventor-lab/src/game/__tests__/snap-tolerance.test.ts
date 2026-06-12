// Snap-tolerance suite (robustness gap found in QA after the 2026-06 ball-liveliness retune).
//
// THE CONTRACT THIS GUARDS: a kid who builds "basically the right answer" must not fail on a single
// 10px snap-step of difference. QA found a hand-placed build at ~the knownSolution coordinates (within
// one 10px snap) OVERSHOT to out-of-bounds on L2 while the exact knownSolution succeeded. That brittle
// solution-basin is the bug this suite prevents from regressing.
//
// METHOD (per the fix brief): for EVERY level, the knownSolution must still succeed when each placement
// is independently shifted by ±10px in x. We run the knownSolution plus the 2N single-part ±10px-x
// variants. Variants that fail the EDITOR'S placement-validity (a player could not place them — e.g. the
// shift pushes a part inside an actor-clearance ring) are skipped, exactly as the editor would reject
// them. Every editor-VALID variant must win within MAX_STEPS (1200).
//
// MARGIN POLICY: winning is the bar for variants (≤1200 steps). The stricter ≤1000-step success margin
// and the hero-settles-inside-the-goal margin stay enforced for the EXACT solution only (see
// physics.test.ts). This suite additionally re-asserts the exact-solution ≤1000 margin as its baseline.
import { describe, it, expect } from "vitest";
import { LEVELS } from "../../data/levels";
import { runLevel, MAX_STEPS } from "../sim";
import { checkPlacement } from "../placement";
import type { Level, Placement } from "../types";

const SNAP = 10; // the editor's snap step (specs/inventor-lab.md §"Editor UX": 10px snap).

// A single-part ±10px-x variant of a solution.
interface Variant {
  label: string;
  placements: Placement[];
  partIndex: number;
  dx: number;
}

// Build the 2N single-part ±10px-x variants of a solution (each part shifted independently).
function singlePartXVariants(known: Placement[]): Variant[] {
  const out: Variant[] = [];
  for (let i = 0; i < known.length; i++) {
    for (const dx of [-SNAP, SNAP]) {
      const placements = known.map((p, j) => (j === i ? { ...p, x: p.x + dx } : { ...p }));
      out.push({ label: `part#${i + 1} ${dx > 0 ? "+" : ""}${dx}px x`, placements, partIndex: i, dx });
    }
  }
  return out;
}

// Would the editor accept this whole placement list? Place incrementally exactly as a player would —
// each placement must pass checkPlacement against the ones already down (and be an allowed part).
// This is the SAME gate the FIX-5 editor-validity proof uses; variants the editor would reject are
// skipped (a player can never build them, so they are out of scope for snap-tolerance).
function editorValid(level: Level, placements: Placement[]): boolean {
  const placed: Placement[] = [];
  for (const p of placements) {
    if (!level.allowedParts.includes(p.part)) return false;
    const check = checkPlacement(level, p, placed);
    if (!check.ok) return false;
    placed.push(p);
  }
  return true;
}

describe("Snap-tolerance — knownSolution survives a ±10px snap on any single part", () => {
  for (const level of LEVELS) {
    it(`L${level.id} ${level.title} — every editor-valid ±10px variant still wins`, () => {
      // Baseline: the EXACT solution must win with the strict ≤1000-step margin (kept for the exact
      // solution; relaxed to ≤1200 for the shifted variants below).
      const exact = runLevel(level, level.knownSolution);
      expect(exact.success, `L${level.id} exact knownSolution must succeed`).toBe(true);
      expect(exact.successStep!, `L${level.id} exact must win by step <=1000`).toBeLessThanOrEqual(1000);

      const variants = singlePartXVariants(level.knownSolution);
      let ranCount = 0;
      for (const v of variants) {
        if (!editorValid(level, v.placements)) {
          // A player could not place this — skip it (out of scope, like the editor rejecting it).
          continue;
        }
        ranCount++;
        const r = runLevel(level, v.placements, MAX_STEPS);
        expect(
          r.success,
          `L${level.id} variant [${v.label}] must still WIN within ${MAX_STEPS} steps ` +
            `(got ${r.failReason ?? "no-win"}, hero ended at ${r.heroEnd.x.toFixed(0)},${r.heroEnd.y.toFixed(0)})`,
        ).toBe(true);
        expect(r.successStep!).toBeLessThanOrEqual(MAX_STEPS);
      }

      // Guard against a vacuous pass: at least one ±10px variant must actually be editor-valid and run,
      // otherwise this level would "pass" by skipping everything. (Single-part solutions yield 2 variants;
      // L10's lone plank sits one snap from the crate's clearance ring, so one side is legitimately
      // skipped — but the other must run.)
      expect(ranCount, `L${level.id} must have at least one editor-valid ±10px variant to test`).toBeGreaterThanOrEqual(1);
    });
  }
});

// A focused regression for the exact build QA reported: the L2 hand-build one snap off the knownSolution
// that overshot to out-of-bounds. With the dock left-edge extended, both ±10px shifts of the lower plank
// now land on the dock instead of rebounding off its cliff face into the gap.
describe("Snap-tolerance — L2 regression (the QA-reported overshoot)", () => {
  const L2 = LEVELS.find((l) => l.id === 2)!;
  it("L2 lower-plank shifted +/-10px in x no longer goes out of bounds", () => {
    for (const dx of [-SNAP, SNAP]) {
      const placements = L2.knownSolution.map((p, j) => (j === 1 ? { ...p, x: p.x + dx } : { ...p }));
      expect(editorValid(L2, placements), `L2 +${dx} variant should be editor-valid`).toBe(true);
      const r = runLevel(L2, placements, MAX_STEPS);
      expect(r.failReason).not.toBe("out-of-bounds");
      expect(r.success, `L2 lower plank ${dx}px must win`).toBe(true);
    }
  });
});
