# Detective Academy — App Spec (port 5183)

> Read `PLAN.md` and `specs/shared-design.md` first; both are binding. This spec adds the app contract. The GDD (`specs/gdd/detective-academy-gdd.md`) finalizes content, tuning, and copy within these rails.

**Fantasy:** the kid IS a detective working real cases on a professional investigation dashboard. Dark case-file noir, manila folders, brass fittings, CONFIDENTIAL stamps, a desk lamp pool of light. Never cute, never babyish — *Only Murders in the Building* for kids, not Scooby-Doo. All crimes are warm/low-stakes (missing trophy, vanished cookies, mystery noise, swapped backpacks) — mischief, never violence.

## Aesthetic tokens
bg `#14161a` · surface `#1d2026` · evidence paper `#efe7d6` · brass `#d9a441` · stamp red `#b3402e` · text `#e8e6e1` · cleared green `#5a8a5e`. Display font `@fontsource/special-elite` (headers, stamps, case titles ONLY), body Inter (or system-ui stack). Motifs: folder tabs, paper grain on cards, pinboard with swaying pins, typewriter headers, ink-stamp set-pieces. Atmosphere: vignette + lamplight pool on the case board; paper cards get subtle rotation jitter (±0.5°) so the board feels physical.

## Core loop
Case Board → open case folder → read Briefing → examine Evidence (clue cards) → work Suspects (clear innocents by citing the clue that clears them) → ACCUSE (suspect + 2 implicating clues) → CASE CLOSED set-piece + deduction recap → XP/rank/badges → next case.

## Data model (binding shapes — engineer may extend, not change semantics)
```ts
type Hair = "black" | "brown" | "red" | "blond";
type Accessory = "scarf" | "glasses" | "cap" | "watch" | "backpack";
type Pet = "dog" | "cat" | "bird" | "none";
type Place = "library" | "gym" | "cafeteria" | "park" | "music room" | "art room";

interface Suspect { id: string; name: string; hair: Hair; accessory: Accessory; pet: Pet; alibiPlace: Place; }

type Clue =
  | { id: string; kind: "alibi"; clearsSuspectId: string; text: string }                    // always load-bearing
  | { id: string; kind: "attribute"; dimension: "hair"|"accessory"|"pet"; value: string;
      text: string; twoStep: boolean; loadBearing: boolean }                                 // describes the culprit
  | { id: string; kind: "flavor"; text: string };                                            // red herring, never load-bearing

interface Case {
  id: number; seed: number; tier: 1 | 2 | 3; title: string; intro: string;
  location: Place; suspects: Suspect[]; clues: Clue[];
  culpritId: string; implicatingClueIds: string[];                                           // attribute clues matching culprit
}
```

## Case generation (`src/game/generator.ts`) — CONSTRUCTIVE, the load-bearing module
For `caseId` 1–30: `rng = mulberry32(caseId)`; tier = 1 (ids 1–10, 3 suspects), 2 (11–20, 4), 3 (21–30, 5).

1. Sample distinct-named suspects with attribute vectors (redraw a suspect if its full vector duplicates another's; all redraws share one attempt counter, hard cap 200 → throw).
2. Pick culprit.
3. **Elimination plan (constructive):** choose ≥2 attribute clues on dimensions where the culprit's value eliminates ≥1 innocent each (these are the implicating clues; at tier 3 at least one is `twoStep: true` — evidence implies the attribute: "Paw prints by the window. Whoever did it brought a dog." instead of stating it). For innocents not eliminated by attribute clues, add alibi clues naming them. Result: every innocent eliminable by ≥1 SINGLE citable clue.
4. Tier 3 only: add ≥2 red herrings — `flavor` clues, or `attribute` clues with `loadBearing: false` whose value eliminates nobody new.
5. **Verify with the independent solver** (below): exactly one consistent suspect AND it is the intended culprit; ≥2 implicating clues; per-innocent single-clue eliminability; ≥1 strictly load-bearing clue (removal → ≥2 consistent); herrings removable with solution unchanged. Any failure → redraw case under the same attempt cap.

Word budgets (tier 1): intro ≤40 words, clue/statement texts ≤15 words. Tiers 2–3 may go ~50%; longer never. Clue text comes from GDD-authored templates parameterized by attribute/name/place — the generator fills templates, it does not freestyle prose.

## Solver (`src/game/solver.ts`) — written INDEPENDENTLY
`consistentSuspects(c: Case, clueIds?: string[]): string[]` — brute-force filter; a suspect is inconsistent with: an `alibi` clue that names them; an `attribute` clue (loadBearing or not — semantics identical) whose value differs from theirs on that dimension; `flavor` constrains nobody. MUST NOT share code or helper functions with the generator (shared-bug masking is the failure mode this prevents). `clearsSuspect(c, clue, suspectId): boolean` powers the clearing mechanic and hints.

## Mechanics (binding)
- **Clearing:** tap suspect → "Clear this suspect" → player selects the clue that clears them → validated via solver semantics. Wrong clue → neutral rejection naming why ("That statement doesn't tell us where Maya was."). Cleared cards flip to CLEARED with the cited clue printed on them.
- **Accusation:** suspect + exactly 2 clues from `implicatingClueIds`. Wrong suspect OR wrong supporting clues → neutral feedback naming the gap, retry allowed, first-try flag lost. Correct → CASE CLOSED.
- **Hints (3 escalating tiers, computed from current state, deterministic):** (1) nudge toward the category of the next useful clue; (2) highlight that clue card; (3) spell out the inference. Hint use tracked per case (Sharp Eye = hint-free).
- **Recap screen:** the logical chain, rendered as the player's achievement ("The scarf statement narrowed it to two. The gym alibi cleared Marcus. That left Priya.").
- **Set-piece:** CASE CLOSED stamp slams onto the folder with ink splat + paper jolt + `sfx.stamp()`.

## Progression
XP per case (tier-scaled; bonuses: hint-free, first-try accusation). Ranks: Cadet → Junior Detective → Detective → Senior Detective → Inspector → Chief Inspector (GDD sets thresholds). ~8 badges (GDD finalizes; must include Sharp Eye, Methodical = cleared every innocent before accusing, and a completionist badge). Cosmetics: 4–6 detective ID-card styles unlocked by rank, shown on profile screen. Cases unlock sequentially; replay always allowed.

## Screens
ProfilePicker → CaseBoard (folder grid grouped by tier, rank header + XP bar, badge wall, settings: mute / text size / reset profile) → CaseView (tabs: Briefing | Evidence | Suspects; notebook slide-over auto-logging deductions; hint button; ACCUSE button) → AccuseModal → ResultScreen. Every prose block has a SpeakButton.

## Required tests (`src/game/__tests__/`) — Vitest, all must pass for all 30 seeds
1. Exactly one consistent suspect per case, equal to `culpritId`.
2. Every innocent eliminable by ≥1 single clue (`clearsSuspect`).
3. ≥2 implicating clues per case; each actually matches the culprit and eliminates ≥1 innocent.
4. ≥1 strictly load-bearing clue: its removal yields ≥2 consistent suspects.
5. Cases 21–30: ≥2 red herrings; removing ALL herrings leaves the consistent set unchanged.
6. Word budgets respected (tier 1: intro ≤40 words, clues ≤15).
7. Generator determinism: same seed → deep-equal case, twice.
8. Generation never exceeds the 200-attempt cap (the suite fails loudly if it does).
Plus hint-engine unit tests (returns a valid next deduction for representative mid-case states).

## Acceptance checklist (QA runs this verbatim)
1. Loads clean (zero console errors). 2. Profile pick works; first win path ≤2 min. 3. Case 1 solvable end-to-end using hints. 4. Clearing with a wrong clue rejected with specific feedback. 5. Wrong accusation handled neutrally; retry works. 6. Correct accusation → CASE CLOSED stamp set-piece with sound → recap → XP. 7. Badge toast on first badge. 8. Progress survives reload. 9. SpeakButton on briefing + statements; `speechSynthesis.speaking` truthy after click. 10. Case 2 locked until Case 1 closed. 11. Mute toggle works and persists. 12. Manifest + icons present. 13. Aesthetic pass vs tokens + forbidden list (atmosphere: lamplight, paper grain, stamp motif — would a kid screenshot it?).

## GDD must decide (designer scope)
Case titles/intro templates + clue text templates (the full template library with slots), name pool (diverse, kid-adjacent but not classmates), XP table + rank thresholds, badge list + criteria, ID-card cosmetic designs, notebook presentation, exact hint copy, settings screen copy, set-piece storyboard (timings within 800–1200ms), sound mapping beyond the shared set.
