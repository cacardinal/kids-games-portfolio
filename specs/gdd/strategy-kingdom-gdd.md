# Strategy Kingdom — Game Design Document

> Binding rails: `PLAN.md` → `specs/shared-design.md` → `specs/strategy-kingdom.md`. This GDD finalizes economy, content, and copy inside those rails. No new resources, no new systems, reducer turn-order unchanged. All balance numbers below are verified by a Python simulation of the exact reducer (see §6 intended-strategy sketches); the engineer codes those sketches as the completability test (Required Test 6).

---

## 1. Design Summary

You rule a small kingdom across seasons, and every decision shows its arithmetic out loud. Assign workers to a farm and the panel reads `2 workers x 3 = 6 food, 10 people eat 10, deficit 4` — the kid does the math the game is about to do, then presses END TURN and watches the ledger tick it in with sound. Build farms, houses, libraries; research upgrades that change the multiplier in front of you; answer event cards that pose small honest trade-offs (take in travelers for +2 people, or take +5 gold). No fail state — a hungry kingdom just waits.

My five load-bearing decisions:
1. **The formula is the UI.** Every resource shows current value AND projected next-turn delta with its arithmetic on tap. The math is never hidden behind a result.
2. **Population is the engine and the governor** (grows +1/turn, capped by houses). This makes "build a house" a felt need, not a chore, and makes the visible food surplus the thing you steer.
3. **Pop-boost event cards are the balance lever.** Natural +1/turn can't reach the big goals alone; generous "+people" event options (spec-sanctioned) carry the growth scenarios with slack.
4. **Gold is the comfortable leg, pop and research are the squeeze** (Prosperity). A kid who over-trades feels rewarded by score, never blocked.
5. **END TURN resolution is the signature toy** — a 1.5–2s skippable ledger animation where production lines tick in one at a time, the banner reacts to surplus/deficit, and the recap stamps a rank seal at reign's end.

---

## 2. Economy Table (FINAL)

Start state, all scenarios: **food 8, wood 8, stone 4, gold 0, population 6, popCap 8**, pre-built **1 Farm + 1 Lumber Camp** (so turn 1 can already surplus). Workers available each turn = current population.

### Buildings

| Building | Base yield / worker | Worker slots | Build cost (wood / stone) | Effect / notes |
|---|---|---|---|---|
| Farm | 3 food | 3 | 4 / 0 | Food source. Max 4 on the map. |
| Lumber Camp | 2 wood | 3 | 3 / 0 | Wood source. |
| Quarry | 2 stone | 2 | 3 / 2 | Stone source. |
| Market | 2 gold | 2 | 5 / 3 | Gold source. Max 2 on the map. |
| Library | 1 RP | 2 | 5 / 4 | Research points. Max 2 on the map. |
| House | — (no workers) | 0 | 4 / 2 | **+4 popCap.** Max 5 on the map. |

- **popCap = 8 + 4 × houses.** (0 houses = 8; 5 houses = 28, the campaign ceiling.)
- **Caps** keep the 12-plot grid meaningful and numbers bounded: Farm ≤4, House ≤5, Market ≤2, Library ≤2 (Lumber/Quarry uncapped but plot-limited). Total plots = 12.
- **Worker math is always small:** the largest single-building product the game ever shows is a 3-slot fully-researched Farm = `3 × 5 = 15`. Every factor is single-digit; every product ≤15. Totals never exceed a few hundred.
- **Idle workers** (population − assigned) produce nothing; the panel shows "idle: N" so the kid sees unused hands.

### popCap curve (the only curve)

| Houses | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| popCap | 8 | 12 | 16 | 20 | 24 | 28 |

Linear, +4 per house — a 2nd-grader can predict the next cap by adding 4.

---

## 3. Research Tree (10 nodes, 3 tiers)

Library workers accrue RP (1/worker, +1 with Scriptorium). A node completes when `researchPoints ≥ cost`; cost is paid, node added, multiplier applies **from the next production phase** (additive to base, shown in the formula). Prereqs enforced.

**Tier 1 (no prereqs)**

| Node | RP cost | Exact effect | Prereq |
|---|---|---|---|
| Irrigation | 4 | Every Farm: base food **+1** (3→4/worker) | — |
| Wheelbarrow | 5 | Every Lumber Camp **and** Quarry: base **+1** (2→3/worker) | — |
| Coinage | 5 | Every Market: base gold **+1** (2→3/worker) | — |
| Scriptorium | 6 | Every Library: base RP **+1** (1→2/worker) | — |
| Surveying | 5 | Unlocks one extra build plot (13th plot opens) | — |

**Tier 2**

| Node | RP cost | Exact effect | Prereq |
|---|---|---|---|
| Masonry | 6 | Every Quarry: base stone **+1** again (with Wheelbarrow, 2→4/worker) | Wheelbarrow |
| Crop Rotation | 8 | Every Farm: base food **+1** again (with Irrigation, 3→5/worker) | Irrigation |
| Census | 7 | Each House gives **+1 extra popCap** (House becomes +5; recomputes popCap) | Surveying |

**Tier 3**

| Node | RP cost | Exact effect | Prereq |
|---|---|---|---|
| Guild | 9 | Every Market: base gold **+1** again (with Coinage, 2→4/worker) | Coinage |
| Great Hall | 10 | **+1 population immediately** on completion, and Festival-type events grant +1 extra person | Census |

Drawable as: 5 nodes across the top (Tier 1), 3 in the middle (Tier 2 each wired up to one Tier-1 parent), 2 at the bottom (Tier 3). The six "yield +1" nodes are the spine; Surveying→Census→Great Hall is the population branch; Coinage→Guild is the gold branch.

---

## 4. Event Decks (FIXED order, seeded at authoring)

Events fire on every 3rd turn. Tutorial (12 turns) → turns 3, 6, 9, 12 = **4 cards drawn** (deck has 10, only first 4 reached; rest are headroom and reused if a future longer mode appears). Growth (20) → turns 3,6,9,12,15,18 = **6 drawn** (deck of 11). Prosperity (24) → turns 3,6,9,12,15,18,21,24 = **8 drawn** (deck of 12). Decks are authored in full so the order is frozen forever. Both options always resolve legally; resources floor at 0, never negative; if an option can't be fully paid it still resolves and the resolution copy says so ("The larder was already bare").

Arithmetic is printed **in the option text** exactly as the reducer applies it. Generosity-vs-gold dilemmas appear but are never punishing — the "kind" option costs food you can usually spare and grows the kingdom; the "gold" option is safe.

### 4A. Tutorial Reign deck (10 cards; first 4 reached)

| # | Title | Setup (≤30 words) | Option A | Option B |
|---|---|---|---|---|
| 1 | Travelers at the Gate | A family asks to settle in your kingdom. There is room if the larder can spare some food. | Take them in: **+2 people, −8 food** | Send them on: **+5 gold** |
| 2 | Good Harvest | The fields came in heavy this season. The barns are full and the people are glad. | Store it: **+10 food** | Sell some: **+6 gold, +4 food** |
| 3 | Wandering Builder | A carpenter offers a week of work for a small wage. | Hire him: **−5 gold, +6 wood** | Thank him, no: **no change** |
| 4 | Spring Festival | The people want a festival to welcome the new season. | Hold it: **+2 people, −6 food** | Keep it quiet: **+4 gold** |
| 5 | Stone from the Hills | Miners found an easy seam this season. | Quarry it: **+6 stone, −3 food** | Leave it: **+3 gold** |
| 6 | A Visiting Scholar | A scholar will teach for a season if you house her. | Welcome her: **+5 research, −4 food** | Send her on: **+4 gold** |
| 7 | Trade Caravan | Merchants pass through with goods to sell. | Trade with them: **−6 food, +10 gold** | Wave them past: **no change** |
| 8 | Timber Order | A nearby town wants to buy your wood. | Sell wood: **−8 wood, +9 gold** | Keep the wood: **no change** |
| 9 | New Families | Word of your fair rule spreads. Families want to join. | Welcome them: **+2 people, −6 food** | Not yet: **+3 gold** |
| 10 | Bumper Year | Every field and forest gave more than expected. | Take the bounty: **+8 food, +6 wood** | Sell the surplus: **+8 gold** |

### 4B. Growth Reign deck (11 cards; 6 reached)

| # | Title | Setup (≤30 words) | Option A | Option B |
|---|---|---|---|---|
| 1 | Refugees from the North | A larger group seeks shelter. They would more than fill an empty house. | Take them in: **+3 people, −12 food** | Offer supplies: **−4 food, +6 gold** |
| 2 | Harvest Festival | A feast would draw new families and lift spirits. | Hold the feast: **+2 people, −6 food** | Modest meal: **+5 gold** |
| 3 | Master Mason | A mason offers to cut stone cheaply for one season. | Hire him: **−4 gold, +8 stone** | Decline: **+3 gold** |
| 4 | Newlyweds | Two families join through marriage and want to stay. | Bless them: **+2 people, −6 food** | Gift of gold: **−5 gold, +0** (a kindness, no growth) |
| 5 | Rich Caravan | Wealthy traders will pay well for your goods. | Trade big: **−8 food, +12 gold** | Trade small: **−3 food, +5 gold** |
| 6 | A Good Year | The seasons were kind. Choose where the luck lands. | More people: **+2 people, −6 food** | More gold: **+8 gold** |
| 7 | Library Donation | A patron funds your scholars. | Accept books: **+5 research** | Accept coin: **+6 gold** |
| 8 | Forest Fire | A small fire took part of the woods. (Gentle: only wood, never people.) | Replant fast: **−6 wood, +4 wood next year is implied; now −6 wood** | Clear the land: **−6 wood, opens nothing, +4 gold** |
| 9 | Wandering Families | More families have heard of your kingdom. | Welcome them: **+2 people, −6 food** | Send greetings: **+4 gold** |
| 10 | Stone Windfall | A rockslide left easy stone in the valley. | Gather it: **+8 stone, −4 food** | Sell access: **+6 gold** |
| 11 | Great Market Day | Buyers crowd the square. | Sell hard: **−6 food, +12 gold** | Steady trade: **+6 gold** |

> Card 8 wording for the engineer: apply only `−6 wood` for option A, `−6 wood, +4 gold` for option B. The "next year" line is flavor, not a deferred effect (no deferred-effect system exists). Phrase the printed option as: A "Replant: **−6 wood**" / B "Clear it: **−6 wood, +4 gold**". (Listed verbosely above so intent is unambiguous; ship the parenthetical-free version.)

### 4C. Prosperity Reign deck (12 cards; 8 reached)

| # | Title | Setup (≤30 words) | Option A | Option B |
|---|---|---|---|---|
| 1 | Settlers Arrive | A wagon train of new families reaches your gates. | Take them in: **+2 people, −8 food** | Provision them: **−4 food, +6 gold** |
| 2 | Merchant Festival | Traders propose a market festival in your square. | Host it: **+8 gold** | Decline, plant instead: **+6 food** |
| 3 | A Wave of Refugees | A hard winter to the east sends many seeking shelter. | Shelter them: **+3 people, −12 food** | Send aid: **−6 food, +5 gold** |
| 4 | Visiting Scholar | A renowned scholar offers a season of teaching. | Welcome her: **+5 research, −4 food** | Pay her stipend: **−4 gold, +3 research** |
| 5 | Royal Wedding | A marriage of two houses brings new families. | Celebrate: **+2 people, −6 food** | Quiet vows: **+5 gold** |
| 6 | The Rich Caravan | The wealthiest traders of the season arrive. | Trade big: **−8 food, +12 gold** | Trade safe: **−4 food, +7 gold** |
| 7 | Inventor's Workshop | An inventor will share plans for coin. | Fund it: **−6 gold, +6 research** | Buy one plan: **−2 gold, +3 research** |
| 8 | Bountiful Season | A good year. Decide where the surplus goes. | Grow the people: **+2 people, −6 food** | Fill the treasury: **+8 gold** |
| 9 | Stonecutters' Guild | Masons offer cut stone in bulk. | Buy stone: **−6 gold, +10 stone** | Decline: **+4 gold** |
| 10 | Grand Bazaar | Buyers from three kingdoms fill the square. | Sell hard: **−6 food, +14 gold** | Steady stalls: **+8 gold** |
| 11 | Founders' Festival | A festival to honor your reign draws new families. | Hold it: **+2 people, −6 food** | Modest rites: **+6 gold** |
| 12 | A Prosperous Year | The kingdom thrives. One last choice. | Welcome more people: **+2 people, −6 food** | Crown the treasury: **+10 gold** |

---

## 5. Scenario Design

### 5A. Tutorial Reign — Counsel script (12 turns)

Counsel tips are scripted per turn, appear in the right panel with a SpeakButton, and are **dismissible** (tapping "Got it" closes the tip; END TURN is never blocked by a tip). Each tip teaches one beat: assign → produce → consume → grow → build → research → events → win. Plain, warm, an 8-year-old reads it cold.

| Turn | Counsel says (dismissible tip) | Teaches |
|---|---|---|
| 1 | "Welcome. Tap your Farm, then add workers. Each worker makes 3 food. Three workers make 9 food, and your 6 people eat 6. That leaves a surplus." | assign → produce → consume |
| 2 | "A surplus grew your kingdom by one person. To hold more people, you need houses. Tap an empty plot to build one. It costs 4 wood and 2 stone." | growth → build |
| 3 | "An advisor brings a choice. Read both options. The numbers show exactly what happens. Pick one, then you can end the turn." | events |
| 4 | "Your house is ready. Your cap went up by 4. More room means your kingdom can keep growing each turn it has a surplus." | popCap |
| 5 | "Watch the food line. As long as workers make more food than your people eat, you grow. If food runs low, add a farm worker." | steering surplus |
| 6 | "Wood comes from the Lumber Camp, stone from a Quarry. You need both to build. Keep one or two workers cutting wood." | resource chains |
| 7 | "You can build a second Farm for more food, or another House for more room. Both help you grow. There is no wrong order." | build choices |
| 8 | "Idle workers do nothing. The panel shows how many hands are free. Put them to work where you need the most." | idle workers |
| 9 | "Another choice card. Taking in people grows your kingdom but costs food. You usually have plenty. Choose what you like." | dilemma framing |
| 10 | "You are close to your goal of 14 people. Keep food positive and your kingdom will reach it." | goal awareness |
| 11 | "When a reign ends, your story is written from everything you did, and a rank is stamped. Steward, Reeve, Magistrate, or Monarch." | ranks |
| 12 | "Last turn. End it when you are ready, and watch your kingdom's story." | closure |

**Intended strategy (proves goal reachable, room to spare):** T1 assign 3 workers to the Farm (`3×3=9 food`, eat 6, **+3, grow to 7**) — first surplus inside 30 seconds. T2 build House #1, keep 3 farming (grow to 8). T3 build Farm #2; event #1 → take travelers (**+2 people**, −8 food). T4 House #2 (cap 16). T5–T12 keep ~4–6 farming, take the +people events (turns 6, 9, 12). Verified result: **population 16 by turn 12, goal 14 met around turn 7** — large margin.

### 5B. Growth Reign — goal population ≥ 25 (20 turns)

No Counsel script (Throne Room hint only: "Grow your kingdom to 25 people."). The skill is sequencing houses early (the popCap=8 ceiling bites hard until you build) while keeping food ahead of a growing population.

**Intended strategy:** Houses lead. T1 3 farm (grow to 7). T2 House #1. T3 Quarry + event (take +2 people). T4 Farm #2. T5–T6 Houses #2 and #3 (+ event T6 take +2). T7 Farm #3. T8–T9 Houses #4 and #5 → cap 28 (+ event T9 take +3). T10–T20: feed the growing population (3 farms = up to 18 food), take every +people event (turns 12, 15, 18). Verified: **population reaches 25 by turn 12, finishes at 28** — 8 turns of slack. The completability test asserts pop ≥ 25 by turn 20.

### 5C. Prosperity Reign — goals population ≥ 28 AND gold ≥ 80 AND ≥ 6 research nodes (24 turns)

The capstone: three demands on one worker pool. The teaching is **phased prioritization** — secure the finish-line goal (research) mid-game, keep food strong throughout (population is the slowest goal), let gold ride (markets are strong; it's the comfortable leg).

**Intended strategy (phased):**
- **T1–T5 (found):** T1 3 farm (grow). T2 House #1. T3 Quarry + event (+2 people). T4 Farm #2. T5 Library.
- **T6–T12 (research + houses):** keep 2 in the Library every turn. Research in cost order as RP allows: Irrigation (4) ~T7, Scriptorium (6) ~T8 (now 4 RP/turn), Wheelbarrow (5) ~T9, Coinage (5) ~T10, Masonry (6) ~T11, Surveying (5) ~T12. Build Houses #2–#5 across these turns (cap 28). Build Market #1 ~T10. Take +people event T9; gold events T6, T12 feed the treasury. **6th research node lands ~T12–T15** with the T12 scholar/inventor card's +RP as cushion.
- **T13–T24 (fill + trade):** research done → move Library workers to the second Market. Keep just enough farm workers to feed the population and net +1 (guarantees a growth turn). Take the remaining +people events (15, 18, 21) to push population to 28; the festival/bazaar gold cards (turns 18, 24) overshoot gold comfortably.
- Verified: **population 28 by turn 18, gold 80 by turn 19, research 6 by turn 22**; final state pop 28 / gold ~156 / research 6 — all three met before turn 24. Gold finishes ~1.9× the goal, which is intentional headroom, not a balance error.

The completability test codes this exact sequence and asserts all three goals true at turn 24 (with margin).

---

## 6. Scoring Formula + Rank Thresholds

At reign end, compute a **Reign Score** from the final state plus efficiency, then map to a rank. Score components are deliberately legible (a kid could roughly predict their rank):

```
score =  population
       + floor(gold / 5)
       + (researchNodes × 3)
       + (turnsRemaining × 2)        // finishing early is rewarded
       + (allTurnsSurplus ? 10 : 0)  // Full Larder bonus
```

`turnsRemaining = turnLimit − turnReached` (0 if you used all turns; the reign ends the moment all goals are met, banking the remainder). All inputs are small integers; the kid sees the breakdown line-by-line in the recap.

**Rank thresholds (per scenario, tuned to that scenario's reachable score ceiling):**

| Scenario | Steward | Reeve | Magistrate | Monarch |
|---|---|---|---|---|
| Tutorial Reign | completed (goal met) | ≥ 28 | ≥ 36 | ≥ 44 |
| Growth Reign | completed | ≥ 45 | ≥ 58 | ≥ 70 |
| Prosperity Reign | completed | ≥ 70 | ≥ 90 | ≥ 110 |

- **Steward** is the floor: reaching reign end always earns at least Steward, even if a goal wasn't met (completion counts; the next scenario unlocks regardless — spec rule).
- Worked example (Tutorial intended strategy, finished turn 7 of 12): population 16 + gold ~6→`floor(6/5)=1` + research 0 + `turnsRemaining 5 ×2 = 10` + Full-Larder 10 = **37 → Magistrate**. A perfectly-fed early finish reaches Monarch. The math is shown so the path to a higher rank is visible.
- Worked example (Prosperity intended, finished turn 22): population 28 + `floor(156/5)=31` + `6×3=18` + `2×2=4` + Full-Larder(if held)10 = **91 → Magistrate**, brushing Monarch — the kid sees exactly which lever (more gold, hold surplus, finish a turn sooner) tips it over.

---

## 7. Juice Script

All set-pieces respect `prefers-reduced-motion` (cut to ≤200ms fades, kill particles). Every animation is **skippable by tap**.

### 7A. END TURN resolution sequence (the signature moment, 1.5–2.0s, skippable)

On END TURN press: button gives a press-state + `sfx.tap()`, then the Counsel panel collapses and a **ledger overlay** slides up over the resource bar. Beat by beat:

1. **0.0s — "The season turns."** The season vignette behind the board cross-fades (spring→summer→fall→winter tint) over 300ms. A soft `tone` swell.
2. **0.2–0.9s — Production lines tick in, one per active building type, staggered ~120ms apart.** Each line writes itself left-to-right on a parchment ledger row: `Farm  3 × 3 = +9 food`. As each lands, the matching resource counter on the bar **rolls up** to its new value (number-roll, ~250ms) with a `sfx.collect()`-style two-note chirp (food = warm low chirp, wood = woody knock via `noise`, stone = duller knock, gold = bright `collect`, RP = a soft bell). Idle workers get a greyed line: `Idle  4 hands, +0`.
3. **0.9–1.2s — Consumption.** A single deduct line writes in a muted ink: `People  10 eat −10 food`, food counter rolls **down** with a soft descending tone.
4. **1.2–1.5s — Net + growth.** The food row shows the net in brass if positive (`+3 surplus`) or grey if zero/negative. If surplus and under cap: a `+1` person pip flies from the granary to the population badge, population rolls up, `sfx.success()` (three rising notes). The **crest banner perks up** (see 7D). If deficit: no pip; the food line reads `0` with the caption "The kingdom waits. More food first.", banner droops, a single soft low tone (never the harsh `fail`).
5. **1.5–1.8s — Build queue + research.** If a build completed, the plot's scaffold SVG swaps to the finished building with a 200ms scale-pop + impact dust particles + `sfx.stamp()`. If a research node completed, a small wax seal stamps onto the tech panel tab with `sfx.stamp()` and the affected formula on screen briefly flashes its new multiplier (`3` → `4` in brass).
6. **1.8–2.0s — Settle.** Ledger overlay slides away, Counsel panel returns. If this was an event turn (3rd), the event card enters (7B).

Tapping anywhere during 1–5 **fast-forwards**: all counters jump to final, one summary `sfx.collect()` plays, the card (if any) still enters. The ledger rows remain visible in the turn log for review.

### 7B. Event card entrance

The card **deals in** from the top of the Counsel panel: a parchment card rotates from −8° to 0° and drops 24px with a 220ms ease-out and a soft paper `noise` whoosh. Its rank-seal wax dot presses in last (60ms scale + `sfx.tap()`). The two option buttons fade up 80ms after the card settles. Choosing an option: the chosen button fills brass, the card's arithmetic animates onto the resource bar exactly like a mini production tick (same number-roll + chirps), then the card slides off to the turn log. END TURN re-enables.

### 7C. Build placement

Tap empty plot → build sheet rises from the bottom (200ms) listing affordable buildings (cost shown, unaffordable ones greyed with the missing resource named). Select one → sheet dismisses, a **translucent scaffold** SVG drops onto the plot with a 150ms settle + `sfx.select()`, cost deducts immediately with a quick counter-roll-down, and a small "ready next season" tag pins to the plot corner. (Completion happens during the next END TURN, 7A step 5.)

### 7D. Banner reacts to surplus/deficit (avatar charm)

The crest banner waves continuously in the header via a 4s CSS keyframe (gentle sine skew). State overlays:
- **Surplus turn:** on growth, the banner **perks** — a 400ms upward billow (amplitude +30%, hue brightens toward brass), settling back to baseline. Reads as a proud flag catching wind.
- **Deficit turn:** the banner **droops** — wave amplitude drops to ~40%, the fabric sags 6px, tint cools toward grey for that turn, recovering next surplus. Never grim; just a flag on a still day.
- **At rest (no change):** baseline wave. This is the kingdom's "idle bob."

### 7E. Reign-end recap set-piece (storyboard)

Triggered when the turn limit is reached OR all goals met early. Full-screen parchment scroll, ~6–9s, skippable, built entirely from `state.log`:

1. **Title plate (0–1s):** "The Reign of [Profile]'s Kingdom" in Spectral, a wax seal pressed beneath it (`sfx.stamp()`). Candle-warm vignette.
2. **The story scrolls (1–6s):** 5–7 lines auto-selected from the log — the opening ("Your kingdom began with 6 people."), each event choice ("You welcomed travelers. The kingdom grew."), the math highlight ("Your fields fed 28 people in the final season."), and the peak ("Population reached 28."). Each line writes in with a soft page-turn `noise`; the matching resource icon ghosts beside it.
3. **The tally (6–7.5s):** the Reign Score breakdown lists line by line (population, gold/5, research×3, turns saved×2, Full Larder), each row chiming in with a `collect`, summing to the total.
4. **The seal (7.5–9s):** the earned **rank seal slams** center-screen — a large wax seal scales from 140%→100% with an ink-splat particle burst and `sfx.stamp()` (deep + noise). The rank name ("Magistrate") embosses across it. If a new cosmetic or scenario unlocked, a single line slides up: "New banner unlocked: Harvest Crest." `sfx.success()`.
5. Buttons: "Throne Room" and (if a higher rank looks reachable) "Reign Again." No auto-advance.

---

## 8. Copy Deck

**Counsel voice:** plain, warm, specific. Medieval-lite flavor (kingdom, reign, larder, season) but zero thee/thou/hath. An 8-year-old reads it cold. No exclamation marks in system copy. No emoji. Talk to the player like a capable young ruler.

### System strings

| Key | String |
|---|---|
| app.title | Strategy Kingdom |
| profile.prompt | Who is ruling today? |
| throne.title | The Throne Room |
| throne.scenario.tutorial | Tutorial Reign |
| throne.scenario.growth | Growth Reign |
| throne.scenario.prosperity | Prosperity Reign |
| throne.locked | Finish the reign before this one to unlock. |
| reign.goal.tutorial | Grow your kingdom to 14 people. |
| reign.goal.growth | Grow your kingdom to 25 people. |
| reign.goal.prosperity | Reach 28 people, 80 gold, and 6 discoveries. |
| bar.food | Food |
| bar.wood | Wood |
| bar.stone | Stone |
| bar.gold | Gold |
| bar.research | Research |
| bar.population | People |
| bar.popcap | Room for [N] |
| bar.idle | Idle: [N] hands |
| formula.farm | Farm: [W] workers × [B] = [P] food |
| formula.consume | [POP] people eat [POP] |
| formula.surplus | Surplus [N]. Your kingdom grows. |
| formula.even | Even. No growth this season. |
| formula.deficit | The kingdom waits. More food first. |
| worker.add | Add worker |
| worker.remove | Remove worker |
| worker.full | All slots full |
| build.title | Build here |
| build.cost | Costs [W] wood, [S] stone |
| build.cannot | Need [N] more [resource] |
| build.ready | Ready next season |
| build.capped | The kingdom has all of these it can hold. |
| research.title | Discoveries |
| research.cost | [N] research |
| research.locked | Discover [prereq] first |
| research.progress | [HAVE] of [COST] research |
| event.resolve | Choose, then end the turn. |
| endturn.label | End Turn |
| endturn.blocked | Answer the advisor first. |
| turn.indicator | Season [N], [spring/summer/fall/winter] |
| deficit.banner | The kingdom waits. More food first. |
| recap.title | The Reign of [Name]'s Kingdom |
| recap.again | Reign Again |
| recap.throne | Throne Room |
| rank.steward | Steward |
| rank.reeve | Reeve |
| rank.magistrate | Magistrate |
| rank.monarch | Monarch |
| unlock.banner | New banner unlocked: [Name] |
| unlock.scenario | New reign unlocked: [Name] |
| save.reset | Reset this kingdom |
| mute.on | Sound on |
| mute.off | Sound off |
| speak.aria | Read aloud |
| speak.stop | Stop |

### Deficit / waiting register (never punishing)

- Primary: "The kingdom waits. More food first."
- On a deficit END TURN: "Food ran short, so the kingdom held steady this season. Add a worker to a Farm."
- If an event option overdrew food: "The larder was already bare, so it stayed at zero. The rest still happened."
- Never: "You failed", "Oops", "Game over", any loss-aversion or scolding.

### Recap line templates (assembled from log)

- Opening: "Your kingdom began with 6 people and one field."
- Event taken (people): "You welcomed [N] new families. The kingdom grew."
- Event taken (gold): "You traded with the caravan and filled the treasury."
- Research: "Your scholars made [N] discoveries."
- Peak: "Your people reached [N], and your fields fed every one of them."
- Close (goal met): "The goals of the reign were met. The seal is yours."
- Close (goal not met): "The reign has ended. The kingdom stands, and your work is recorded."

---

## 9. Achievements + Cosmetics

### Achievements (6)

| Badge | Name | Earned by |
|---|---|---|
| 1 | **Full Larder** | End a reign with a surplus on **every** turn (`allTurnsSurplus` true). |
| 2 | **First Light** | Complete the Tutorial Reign (any rank). |
| 3 | **Master Scholar** *(research badge)* | Complete **all 10** research nodes in a single reign. |
| 4 | **Founder** | Build all 5 Houses in a single reign (reach popCap 28). |
| 5 | **Treasurer** | End a reign holding **100+ gold**. |
| 6 | **Crowned** | Earn the **Monarch** rank in any scenario. |

Badges surface on the Throne Room profile shelf as small wax-seal medallions; earning one mid-reign quietly mints it into the recap unlock line (no mid-turn interruption).

### Cosmetics (6 crest/banner styles)

The header banner is the canvas; each is pure CSS/SVG (color variables + a simple charge motif). Selectable in the Throne Room once unlocked.

| # | Name | Visual | Unlock |
|---|---|---|---|
| 1 | **Plain Standard** | Solid brass field, simple bar — the default. | Available from start. |
| 2 | **Harvest Crest** | Wheat-sheaf charge on a food-green field, gold border. | Complete Growth Reign. |
| 3 | **Mason's Mark** | Crossed hammer-and-chisel on slate-grey, stone trim. | Research Masonry. |
| 4 | **Scholar's Seal** | Open-book charge on deep parchment, ink-blue lines. | Earn the Master Scholar badge. |
| 5 | **Sovereign's Gold** | Crown charge, full gold field with a fine dark border, subtle shimmer keyframe. | Earn Monarch in any scenario. |
| 6 | **Founders' Banner** | Three small house charges on split green/wood field. | Earn the Founder badge. |

---

## 10. Early-Reader Path (age 6)

The early reader plays the **Tutorial Reign** end to end with the same UI; nothing is dumbed down, but everything they need is reachable without fluent reading:

- **Counsel TTS:** every Counsel tip and every event card has the SpeakButton (`Volume2`, "Read aloud"). The early reader taps it and the tip/card is read at rate 0.95. The visible Stop button lets them cut it off. They never have to read a sentence to proceed — they can listen, then tap.
- **Big numbers UI:** the resource bar numbers and the formula products render large (the "× = " lines use h2 scale). The worker stepper has +/− buttons at ≥48px with the live product shown big (`2 × 3 = 6`). Pressing + chirps and the number rolls — the early reader learns "more workers, bigger number" by feel before they read it.
- **What they can ignore:** research (the Tutorial goal is reachable with zero research — the intended strategy uses none), gold (events let them pick "more people" every time), and the tech tree entirely. The only loop they need is: tap Farm, add workers until the surplus line turns brass, press End Turn, watch the ledger, build a house when Counsel says to. The +people event option is always the first/left button on growth cards so "tap the left one to get bigger" is a learnable rule.
- **No reading-gated failure:** there is no fail state, no timer, no penalty for a wrong tap. They can press End Turn into a deficit and the worst that happens is "the kingdom waits" — then they add a farmer and it grows. Autosave means a parent can step away mid-reign safely.
- **First win for the early reader:** assign 3 farm workers (Counsel turn-1 tip, read aloud), press End Turn — the +1 person pip flies and `success` chimes inside ~30 seconds.

---

## 11. Open Questions for the Director

1. **Research-leg slack in Prosperity.** The intended strategy lands the 6th node around turn 12–15 and the test passes at turn 24 with margin, but the *6th node specifically* is the tightest of the three goals (it competes with food for early workers). Acceptable as the designed "capstone squeeze," or should I drop one early node's RP cost by 1 to widen the cushion?
2. **Gold overshoot (~1.9× goal in Prosperity).** Markets are intentionally strong so gold is the comfortable leg. Keep as-is (rewards over-trading via score), or raise the Prosperity gold goal from 80 to ~110 to make all three goals bite equally? (Spec fixes 80; flagging in case you want it tighter.)
3. **Event determinism vs. the `eventIndex` model.** Decks are fixed-order and the same card always appears on the same turn — but a kid replaying sees identical events. Intended (learnable, like a frozen case seed), or do you want the deck shuffled per-reign by the profile seed (still deterministic per save, but varied between the kids)? My default: fixed order, per the spec's "seeded at authoring time."
4. **Census/Great Hall reachability.** Two of the ten research nodes (Census, Great Hall) are only worth it in long reigns and the Master Scholar badge (all 10) is hard inside 24 turns. Is "all 10 in one reign" the right bar for that badge, or should it be "all 10 across your campaign"?
5. **Cosmetic for the Tutorial.** Right now the Tutorial unlocks no banner (its completion gives the First Light badge). Should finishing the Tutorial also grant a starter cosmetic so the early reader gets a visible banner reward on their most-likely-completed scenario?
