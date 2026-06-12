# Strategy Kingdom — App Spec (port 5186)

> Read `PLAN.md` and `specs/shared-design.md` first; both are binding. This spec adds the app contract. The GDD (`specs/gdd/strategy-kingdom-gdd.md`) finalizes the economy, content, and copy within these rails.

**Fantasy:** the kid rules a small kingdom through seasons — a real strategy game (light Civilization), with every decision's arithmetic laid bare. **The visible math IS the learning:** the game always shows its formulas ("Farm: 2 workers × 3 = 6 food · 10 people eat 10 · **+2 surplus**"). Numbers stay small (nothing above a few hundred).

## Aesthetic tokens
bg slate `#171a21` · panel `#20242e` · parchment `#e9dfc8` · brass `#c9a86a` · food `#8ab87a` · wood `#a9805b` · stone `#9aa3ad` · gold `#d9b945` · text `#e8e5de`. Display `@fontsource/spectral` (titles, seals), body Inter. Motifs: ledger lines on parchment panels, wax/rank seals, a waving crest banner (CSS animation), season vignette behind the board. Atmosphere: parchment texture, candle-warm panel glow; END TURN resolution animates the math lines ticking in sequence with sounds — this is the signature moment.

## Core model (`src/game/kingdom.ts`) — PURE reducer, fully testable
```ts
type BuildingId = "farm"|"lumberCamp"|"quarry"|"market"|"house"|"library";
interface KingdomState {
  scenarioId: string; turn: number;           // 1-based; season = turn % 4 (spring/summer/fall/winter, cosmetic)
  resources: { food: number; wood: number; stone: number; gold: number };
  population: number; popCap: number;          // popCap = 8 + 4 × houses
  plots: (BuildingId | null)[];                // 12 plots, 3×4 grid
  workers: Record<BuildingId, number>;         // assigned ≤ slots per building; rest idle
  researchPoints: number; researched: ResearchId[];
  buildQueue: { plot: number; building: BuildingId }[]; // completes next turn
  eventIndex: number; pendingChoice: EventCard | null;
  log: TurnReport[];                           // the math story, used by recap
}
type Action = { type: "assignWorker"|"unassignWorker"; building: BuildingId }
  | { type: "build"; plot: number; building: BuildingId }
  | { type: "research"; node: ResearchId }
  | { type: "chooseEvent"; option: 0 | 1 }
  | { type: "endTurn" };
```
**Turn resolution order (binding, deterministic):** (1) production — per building: `workers × base × multiplier` (research multipliers additive to base, shown in formula); (2) consumption — `population × 1` food; (3) growth — surplus > 0 AND population < popCap → +1 population; deficit → food floors at 0, growth paused, **no death spiral, no fail state** ("The kingdom waits. More food first."); (4) build queue completes; (5) research points accrue (library workers), node completes at its cost; (6) every 3rd turn: next event card from the scenario's FIXED deck order (seeded at authoring time, not runtime) becomes `pendingChoice` — must be resolved before next END TURN.

Base yields (GDD tunes, spec defaults): farm 3 food/worker (slots 3), lumberCamp 2 wood/worker (3), quarry 2 stone/worker (2), market 2 gold/worker (2), library 1 RP/worker (2), house (no workers, +4 popCap). Build costs in wood/stone (GDD tunes). Research tree ~10 nodes with prereqs (Irrigation: farms +1 base; Wheelbarrow: lumber/quarry +1; Coinage: market +1; etc. — GDD designs the tree).

**Events:** choice cards with EXACT arithmetic effects in their text ("Travelers ask for shelter: take them in → +2 population, −10 food · or → +5 gold"). Both options always legal (resources can floor at 0 but never negative; if an option can't be paid it still resolves with floors and says so). ~10–12 cards per scenario in fixed order.

## Scenarios (3, v1)
1. **Tutorial Reign** — 12 turns, guided by Counsel tips (scripted per turn, dismissible), goal: population ≥ 14.
2. **Growth Reign** — 20 turns, goal: population ≥ 25.
3. **Prosperity Reign** — 24 turns, goals: population ≥ 28 AND gold ≥ 80 AND ≥6 research nodes.
Reign end (turn limit reached or goals met early) → **recap set-piece**: the kingdom's story scrolls from `log` (key turns, choices, the math highlights), rank seal stamps (Steward → Reeve → Magistrate → Monarch by GDD scoring formula). Scenario N+1 unlocks on completing N (goal met or not — completion counts; rank reflects performance). Mid-reign autosave every action.

## UI (binding)
ProfilePicker → Throne Room (scenario select + ranks + banners) → Reign screen: resource bar top (each resource shows current AND projected next-turn delta with its formula on tap), 3×4 plot grid center (tap empty plot → build sheet with costs; tap building → worker stepper with live formula), Counsel panel right (advisor text + SpeakButton, event cards appear here), END TURN button (disabled while `pendingChoice`), turn/season indicator. END TURN plays the resolution sequence: production lines tick in one by one with `sfx.collect()`-style sounds, then consumption, then growth — readable, ~1.5–2s total, tap to skip.

## Progression & feel
Ranks per scenario + overall best shown in Throne Room. Cosmetics: 4–6 crest/banner styles unlocked by ranks (banner waves in header). Badges (~6, GDD finalizes; include "Full Larder" — end a reign with surplus every turn — and a research badge). The crest banner reacts: droops slightly on deficit turns, perks on surplus (avatar charm).

## Required tests (Vitest)
1. Production math: workers × base × multiplier across research states.
2. Consumption + growth: surplus grows pop (capped by popCap), deficit pauses growth and floors food at 0.
3. Build: cost deduction, queue completes next turn, plot occupancy rules.
4. Research: prereqs enforced, multipliers apply from the next production phase.
5. Events: fire on every 3rd turn in fixed deck order; both options apply EXACTLY their stated arithmetic; floors respected.
6. Scenario completability: a scripted reasonable strategy (coded in the test) meets each scenario's goals within its turn limit — proves the balance is achievable.
7. Determinism: same action sequence → identical final state.

## Acceptance checklist (QA runs this verbatim)
1. Loads clean (zero console errors). 2. Profile pick; Tutorial Reign starts with Counsel tip; first win moment (first surplus turn) ≤2 min. 3. Assign a worker → END TURN → resolution animation shows formula lines; displayed math matches the formula (spot-check the arithmetic). 4. Build a farm: cost deducted immediately, building completes next turn, yield appears the turn after. 5. Event card on turn 3: chosen option applies exactly its stated numbers. 6. Force a deficit: growth pauses with neutral copy, no fail screen, food floors at 0. 7. Reign end → recap set-piece + rank seal with sound. 8. Mid-reign reload resumes exactly. 9. SpeakButton on Counsel/event text works. 10. Mute persists. 11. Manifest + icons present. 12. Aesthetic pass (parchment ledger atmosphere, seal stamps, waving banner — would a kid screenshot it?).

## GDD must decide (designer scope)
Final economy table (yields, slots, costs, popCap curve), the 10-node research tree (names, costs, effects, prereqs), all 3 event decks (10–12 cards each with exact arithmetic), Counsel tutorial script (12 turns), scoring formula + rank thresholds, badge list, crest/banner cosmetics, recap storyboard, full copy deck (medieval-lite but plain language — an 8-year-old reads it cold; no thees/thous).
