# Kids Games Portfolio — Run Log

Studio pipeline state. Updated by the director (orchestrating session) only.

| App | Port | GDD | Build | QA | Critic | Status |
|-----|------|-----|-------|----|--------|--------|
| detective-academy | 5183 | APPROVED | PASS 361/361 | GREEN | **SHIP** (5/5 resolved; pillars 2,4 → 4) | **SHIPPED** |
| world-explorer | 5184 | APPROVED | PASS 44/44 | GREEN | **SHIP** (final re-verdict; Depth 3→4) | **SHIPPED** |
| inventor-lab | 5185 | APPROVED | PASS 120/120 | GREEN | **SHIP** (Learning 4→5, Kid-choose 3→4) | **SHIPPED** |
| strategy-kingdom | 5186 | APPROVED | PASS 76/76 | GREEN (slate guard code-verified) | **SHIP** | **SHIPPED** |
| code-quest | 5187 | APPROVED | PASS 209/209 | GREEN | **SHIP** (3/3; pillar 4 firmed) | **SHIPPED** |

## Director rulings at GDD approval (binding on engineers)

- **detective-academy:** Quick Study timer tier-relative (90/150/210s). Keep 12 recurring titles. ADD 6th ID card (Chief Inspector tier: obsidian/ink + brass pinstripe, GDD design language). Replays re-earn performance bonuses. The early-reader profile defaults to Large text (via profiles.local largeText flag).
- **world-explorer:** Stamp arc flourish approved. REPLACE landmark "Riyadh Towers (SAU)" with Borobudur (IDN) — blurb "A stone temple mountain built 1,200 years ago, carved with a thousand Buddhas", stepped-stupa silhouette; if IDN is not in the country set use Forbidden City (CHN) instead; re-point any mission referencing the removed landmark. Keep compare first-card star. Picture-hint SVGs on all 6 locate missions only (none elsewhere).
- **inventor-lab:** L12 lower-wall fallback authorized at engineer's discretion (margin rule non-negotiable). REV numbering lifetime-persisted. ADD "Workshop Brass" pen unlocked at 5 stars (early-reader-reachable; warm brass from palette amber family). Keep failure path-trace. All 12 levels ship open (no gating).
- **strategy-kingdom:** Shave 1 RP off one early yield-spine research node (cushions Prosperity research leg; strictly loosens balance). Gold goal stays 80. Event decks FIXED order exactly as GDD (balance lever). Master Scholar = all 10 nodes across the campaign. ADD starter banner cosmetic granted on Tutorial Reign completion.
- **code-quest:** "Relay Orange" warm accent allowed (optional cosmetic only; chrome stays cold palette). M12 stays goal-less collect-all — 20-chip cap is on SOURCE chips, not expansion (engineer: do not mis-implement). Long Haul ≥15 expanded confirmed. STEP nudge stays event-timed after first collision. Par curve as designed.

## Roster amendment (2026-06-11 evening, Chris-prompted strategy review)

Fable-vs-Opus benchmarks (one-shot arcade demos) prompted a review. Architecture CONFIRMED (DOM/SVG + matter-js; Godot rejected for v1 — kills agent verifiability, a11y/TTS, and iPad load profile; earmarked for a future arcade title). Roster upgraded where the tier gap pays: **Game Critic → Fable** (blind taste gate), **Visual Polish Specialist → Fable**. Engineers/QA stay Opus. Escalation gate: any REWORK verdict, or ≥2 apps flat on game feel → propose targeted Fable rebuild/polish with critic evidence before spending.

## FINAL — 2026-06-12: ALL FIVE SHIPPED

810 tests portfolio-wide (361+44+120+76+209). Every app passed: engineer gates → Opus QA → blind Fable critic → fix rounds → re-verdict. Five first-pass critic verdicts were POLISH; all punch items implemented and re-verified; final verdicts all SHIP with pillar raises (Detective 2 pillars→4; Explorer Depth→4; Inventor Learning→5, Kid-choose→4; Kingdom Kid-choose→4; CQ Pillar-4 firmed).

**Pipeline cost shape:** 5 Opus designers, 5 Opus engineers, ~9 Opus QA sessions, 5 fresh Fable critics + 2 Fable re-verdict sessions, 1 Fable fix round (Kingdom), ~8 Opus/Sonnet fix rounds, 1 Haiku fact-check, 4 director surgical fixes inline.

**Chris's manual checklist (iPad Safari):** speech read-aloud buttons (gesture-gated, best-effort), touch feel on all five (tap targets, drag in Inventor), add-to-home-screen icons/manifests, sound on first tap.

**v1.1 backlog:** standing serve (LAN/LaunchAgent) so kids play without dev servers · Explorer stamp-gating + landmark art + content depth · Detective stable pets + reset-confirm copy + tier-3 reasoning variety · CQ sector 4 + read-aloud breadth · Kingdom event-deck depth + bar number-roll seam · Inventor sandbox + seesaw · offline service workers.

## Log

- 2026-06-11 18:39 CT — repo initialized, specs phase started.
- 2026-06-11 ~19:00 CT — Phase 0 committed (0f231e1): PLAN + shared contract + 5 specs.
- 2026-06-11 ~19:15 CT — 5 GDDs delivered (Opus designers, parallel). All APPROVED, zero revision rounds. Rulings above.
- 2026-06-11 ~19:20 CT — Phase 1: 5 Opus engineers dispatched (background, parallel).
- world-explorer build PASS (35/35; Borobudur amendment applied). detective-academy build PASS (316/316, 30 seeds proven). QA serial pipeline started on explorer.
- Fact-check (haiku) on explorer data: 2 issues — (1) chocolate-origin prompt → fix to "Find where people first used cacao, over 5,000 years ago." (missions.ts ~L15); (2) Borobudur blurb "a thousand Buddhas" → "over 500 Buddha statues" (landmarks.ts ~L143). HELD until QA releases the dev server (HMR contamination risk); apply before critic.
