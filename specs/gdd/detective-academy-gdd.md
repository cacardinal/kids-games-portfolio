# Detective Academy — Game Design Document

> Binding inputs (read first, this GDD obeys them): `PLAN.md`, `specs/shared-design.md`, `specs/detective-academy.md`. This document finalizes content, tuning, copy, and feel WITHIN those rails. It adds no systems and changes no data-model semantics. Where this GDD and the shared contract disagree, the contract wins.
>
> **Engineer note:** Everything below is implementable in CSS/SVG with zero image assets. Template slots are `{name}` `{place}` `{value}`. The generator fills templates; it never freestyles prose. `{value}` is the human label for an attribute value (`"a red scarf"`, `"glasses"`, `"a dog"`) — a per-value label map is specified in §3.4.

---

## 1. Design Summary

*(≤150 words — the experience and the five most important decisions)*

You sit in a pool of desk-lamp light, a manila folder in front of you stamped CONFIDENTIAL. Inside: a warm little mystery — a vanished trophy, missing cookies, a swapped backpack. You read the briefing, pin the evidence, clear the innocent by *pointing to the proof*, then accuse with two solid clues. A red stamp SLAMS. You are not a kid playing a game; you are a detective who closed a case.

Five decisions that shape everything:
1. **Justification is the verb.** You never tap a name — you cite the clue that clears them. Reading IS the mechanic.
2. **Calm competence over praise.** The game respects you; the stamp does the celebrating.
3. **Deduction recap as trophy** — your logic, read back as your achievement.
4. **The early reader plays the same real game**, scaffolded by icons + read-aloud, never a baby mode.
5. **The folder is a place** — lamplight, paper grain, sway — not a screen.

---

## 2. Tuning Tables

### 2.1 XP per case (base by tier)

| Tier | Cases | Suspects | Base XP |
|------|-------|----------|---------|
| 1 | 1–10 | 3 | 100 |
| 2 | 11–20 | 4 | 150 |
| 3 | 21–30 | 5 | 220 |

### 2.2 Bonuses (added to base, per case close)

| Bonus | XP | Condition |
|-------|----|-----------|
| First-try accusation | +50 | Correct on the first ACCUSE submit (no wrong accusation this case) |
| Sharp Eye (hint-free) | +40 | Case closed with zero hints used |
| Methodical | +30 | Every innocent cleared before the accusation was submitted |
| First-time clear | +25 | This case closed for the first time on this profile (replays earn base + earned bonuses, not this one) |

**Worked examples.** A flawless tier-1 case (first time, no hints, all cleared, first-try) = 100 + 50 + 40 + 30 + 25 = **245 XP**. A replay of the same case, hint-free + first-try + methodical = 100 + 50 + 40 + 30 = **220 XP**. A messy first tier-1 case (used hints, accused before clearing, one wrong accusation) = **125 XP** (100 base + 25 first-time). Floor for any closed case is base + 0 bonuses.

### 2.3 Rank thresholds (cumulative lifetime XP)

| Rank | XP needed | Reachable around |
|------|-----------|------------------|
| Cadet | 0 | start |
| Junior Detective | 250 | end of case 1–2 |
| Detective | 800 | ~case 5–6 |
| Senior Detective | 1,800 | ~case 11–12 (into tier 2) |
| Inspector | 3,400 | ~case 19–21 (into tier 3) |
| Chief Inspector | 5,600 | ~case 28–30 |

Tuned so a strong player ranks up roughly every 4–6 cases, and a thorough run of all 30 cases comfortably clears Chief Inspector (30 cases at base alone ≈ 4,900; with typical bonuses 6,500–7,500). Replays let a completionist who wants the top rank early grind earned bonuses, but the curve never *requires* replay. Cosmetics gate to ranks (§6.2), so each rank-up unlocks a visible reward.

### 2.4 Hint behavior

| Tier of hint | What it reveals | Visual | Cost |
|--------------|-----------------|--------|------|
| 1 — Nudge | The category of the next useful clue | Text in hint panel | revokes Sharp Eye for this case; no XP penalty |
| 2 — Highlight | Pulses the specific clue card | Card gets `--brass` ring, 2 slow pulses, scrolls into view | same |
| 3 — Spell it out | States the inference in plain words | Text + the clue card stays ringed | same |

- Hints are **per case, escalating**: first press = tier 1, second = tier 2, third = tier 3. After tier 3 the button reads "Inference shown" and is disabled until a state change (a clear or a tab change re-enables at the current needed step).
- Hints are **computed from current state** by the hint engine over solver semantics: the engine finds the highest-value *unmade* deduction (an innocent not yet cleared who is single-clue eliminable; if all cleared, it points at the accusation). Deterministic — same state always yields the same hint.
- **Sharp Eye** is lost on the FIRST hint press of any tier in a case. The hint *count* (0/1/2/3) is tracked per case for display and for the Sharp Eye check (`hintsUsed === 0`).
- A fresh case starts at hint tier 1. Hints never auto-trigger. Reduced-motion: the highlight pulse becomes a static ring, no animation.

---

## 3. Content Design

The generator (`generator.ts`) picks attribute values and names, then selects a template at random from the pool matching the clue's role and slot-shape, and fills it. **Seeded determinism:** template choice is drawn from the same `rng` stream, so Case N's wording is frozen forever. Pools below are deliberately oversized for variety; every entry respects tier-1 word budgets (intro ≤40, clue ≤15 words) unless tagged `[T2+]` (allowed only when the generator is filling a tier-2/3 case, where ~50% longer is permitted).

### 3.1 Name pool (24 first names, diverse, kid-adjacent, no surnames)

Used for suspects. Generator samples distinct names per case.

```
Maya, Priya, Marcus, Theo, Zoe, Amara, Hugo, Lena, Diego, Nina,
Omar, Ivy, Kai, Sofia, Felix, Aisha, Leo, Ruby, Mateo, Esme,
Jonah, Yara, Rowan, Cleo
```

(Deliberately not the kids', a parent's, or known classmates' names; spans many cultures; all 1–2 syllables and TTS-clean.)

### 3.2 Case titles (12 — "The Case of the …", warm/low-stakes only)

Generator assigns one per case (seeded, distinct within a run; with 30 cases, titles may recur across far-apart cases — acceptable, but the 12 here give wide spacing). All are mischief, never harm.

```
1.  The Case of the Vanishing Trophy
2.  The Case of the Missing Cookies
3.  The Case of the Mystery Noise
4.  The Case of the Swapped Backpacks
5.  The Case of the Borrowed Umbrella
6.  The Case of the Smudged Painting
7.  The Case of the Silent Bell
8.  The Case of the Wandering Hamster
9.  The Case of the Hidden Hall Pass
10. The Case of the Untied Shoelaces
11. The Case of the Last Slice of Pizza
12. The Case of the Mixed-Up Lunchboxes
```

### 3.3 Intro templates (≥10; assembled from a crime line + a setup line)

The generator composes an intro from one **crime line** (parameterized by `{place}` and an item) + one **setup line**. Intro = crime line + " " + setup line. Tier-1 budget: keep the pair ≤40 words (every pairing below is ≤32). The item noun is drawn to match the title's spirit but is cosmetic flavor (no clue depends on it). Item pool: `the trophy, the cookies, a backpack, the umbrella, the hall pass, the hamster, the last slice, a paintbrush, the bell rope, the lunchbox`.

**Crime lines (10):**
```
A1. Something went missing from the {place} this morning, and nobody owned up.
A2. The {place} was quiet when {item} disappeared without a trace.
A3. Somebody was in the {place} when they shouldn't have been.
A4. {item} vanished from the {place} between recess and lunch.
A5. A small mix-up in the {place} turned into a real mystery.
A6. The {place} looked normal — except {item} was gone.
A7. There was a strange noise in the {place}, then {item} went missing.
A8. {item} was right here yesterday. This morning, the {place} was empty-handed.
A9. Three things are certain: it was the {place}, it was today, and someone knows more than they are saying.
A10. The {place} kept a secret overnight, and now it is your job to open it.
```

**Setup lines (10):**
```
B1. A few people had reasons to be nearby. One of them did it.
B2. The witnesses left clues. Read them, clear the innocent, name who did it.
B3. You have the statements and the evidence. The rest is deduction.
B4. Everyone has a story. Only one of them holds up.
B5. Pin the evidence, clear the innocent, and make your accusation.
B6. The proof is in the folder. Find who it points to.
B7. Some clues matter. Some are noise. Tell them apart.
B8. Start with who could not have done it. What remains is your answer.
B9. Nobody is in trouble until the evidence says so.
B10. Take your time. Good detectives close the case, they don't rush it.
```

### 3.4 Attribute value-label map (used by clue templates)

Every clue template references `{value}` — the generator substitutes the human label below for the suspect's attribute value on the clue's dimension. (Singular phrasing chosen so templates read naturally.)

| Dimension | Value | `{value}` label | `{valueShort}` |
|-----------|-------|-----------------|----------------|
| hair | black | black hair | black |
| hair | brown | brown hair | brown |
| hair | red | red hair | red |
| hair | blond | blond hair | blond |
| accessory | scarf | a scarf | scarf |
| accessory | glasses | glasses | glasses |
| accessory | cap | a cap | cap |
| accessory | watch | a watch | watch |
| accessory | backpack | a backpack | backpack |
| pet | dog | a dog | dog |
| pet | cat | a cat | cat |
| pet | bird | a bird | bird |
| pet | none | no pet | none |

(`pet = none` clue templates are a separate subset, §3.7 — "Whoever did it has no pet" is a valid, citable constraint.)

### 3.5 Alibi clue templates (≥4 — always load-bearing; clears one named suspect)

Slots: `{name}`, `{place}`. Each states the named suspect was elsewhere/occupied, so they could not be the culprit. The clue card's solver semantics: the suspect whose `alibiPlace` is named is *cleared by* this clue when the player cites it (clearing mechanic), and any suspect this clue names is consistent-removed by the solver. Per the data model, an `alibi` clue carries `clearsSuspectId` — the named suspect.

```
AL1. {name} was reading in the {place} the whole time. The librarian confirmed it.
AL2. {name} never left the {place} — three people saw them there.
AL3. {name} was helping set up the {place} and didn't leave once.
AL4. The {place} sign-in sheet has {name}'s name from start to finish.
AL5. {name} was stuck in the {place} with a teacher the entire morning.   [T2+]
AL6. A photo timestamp puts {name} in the {place}, far from the scene.     [T2+]
```

`{place}` here is the suspect's `alibiPlace` (one of the 6 Places), and the generator guarantees it differs from the case `location` so the alibi genuinely clears them. Each names exactly one suspect.

### 3.6 Attribute clue templates — hair / accessory (≥6 each dimension; tier-3 `twoStep` variants included)

These describe the **culprit**. A suspect is inconsistent (and thus eliminable / clearable) if their value on this dimension differs from `{value}`. Direct templates state the attribute; `twoStep` templates (tier 3) present *evidence that implies* it.

**HAIR — direct (4):**
```
H1. A strand of {valueShort} hair was found at the scene.
H2. Whoever did it has {value}.
H3. Witnesses agree: the person they saw had {value}.
H4. The only clear detail anyone remembers is {value}.
```
**HAIR — twoStep (3) `[T3]`:**
```
H5. A {valueShort} hair was caught in the door hinge. Match it to the culprit's hair.
H6. The hat left behind had {valueShort} hairs inside it. That tells you the culprit's hair color.
H7. Paint on the brush held a {valueShort} hair — the same color as whoever painted it.
```

**ACCESSORY — direct (4):**
```
C1. A witness saw the person wearing {value}.
C2. Whoever did it had {value} on at the time.
C3. The one detail everyone agrees on: they were wearing {value}.
C4. Security spotted someone in {value} leaving the {place}.
```
**ACCESSORY — twoStep (3) `[T3]`:**
```
C5. {value} was snagged on the fence by the {place}. The culprit was wearing it.
C6. A button from {value} was left behind. The culprit wore {value}.
C7. The reflection in the window showed someone in {value}. That's your wardrobe clue.
```

### 3.7 Attribute clue templates — pet (≥6, incl. twoStep and the `none` subset)

Pet clues imply the culprit owns (or does not own) a pet of a given kind.

**PET (has-a-pet) — direct (3):**
```
P1. Whoever did it owns {value}.
P2. The culprit was seen earlier walking {value}.
P3. Everyone knows the person responsible has {value}.
```
**PET (has-a-pet) — twoStep (3) `[T3]`:**
```
P4. Paw prints by the window. Whoever did it brought {value}.
P5. {value} hair was all over the chair. The culprit must own one.
P6. Birdseed was scattered near the door — only someone with {value} carries that.   (used when value = a bird)
```
**PET (none) — direct (2):**
```
P7. The culprit has no pet at home — that rules some people out.
P8. Whoever did it keeps no animals; the person they saw came alone, no pet in sight.
```

(For `pet = none`, the solver eliminates any suspect whose `pet` is dog/cat/bird. P6 is only selected when `{value}` resolves to "a bird".)

### 3.7a Selection rules the generator must honor (designer constraints, not new mechanics)

- A clue's template subset is chosen by the clue's `kind`/`dimension` and `twoStep` flag, then a member is drawn from the seeded RNG.
- `twoStep` templates are eligible **only** in tier-3 cases and only when the spec requires ≥1 twoStep implicating clue.
- `[T2+]`-tagged alibi templates are eligible only in tiers 2–3.
- Templates whose `{place}` slot would name the case `location` for an alibi are never used for that suspect (the generator already differs the alibiPlace; this is the wording guard).

### 3.8 Red-herring / flavor templates (≥6 — never load-bearing; tier 3)

`flavor` clues constrain nobody (solver ignores them). They add texture and teach "some clues are noise." Word budget honored; `[T2+]` where slightly longer.

```
F1. The window was open, but it's always open on warm days.
F2. A juice box was left on the table. It belongs to half the class.
F3. Someone doodled a cat in the margin of the sign-in sheet.
F4. The clock in the {place} is four minutes fast. It has been for weeks.
F5. There were muddy shoe prints, but it rained on everyone this morning.        [T2+]
F6. A library book sat face-down on the chair. Nobody remembers leaving it.
F7. The {place} smelled faintly of popcorn. The popcorn machine is two rooms away.
F8. A single glove was on the floor. It fits nobody who was questioned.            [T2+]
```

(Note: a `loadBearing:false` *attribute* herring — a real attribute clue whose value eliminates nobody new — is also a valid tier-3 herring per the spec. When the generator builds that kind, it reuses the §3.6/3.7 direct templates with the non-eliminating value. The flavor templates above cover the pure-noise herrings.)

### 3.9 Content inventory (counts)

- Alibi templates: **6** (4 base + 2 `[T2+]`)
- Hair templates: **7** (4 direct + 3 twoStep)
- Accessory templates: **7** (4 direct + 3 twoStep)
- Pet templates: **8** (3 direct + 3 twoStep + 2 none)
- Flavor/red-herring templates: **8**
- Intro templates: **20 fragments** (10 crime × 10 setup → 100 combinations)
- Case titles: **12**
- Name pool: **24**

---

## 4. Juice Script

> Timings are targets. Micro-interactions 100–200ms ease-out; the CASE CLOSED set-piece lives in the 800–1200ms window and is skippable by tap. `prefers-reduced-motion` collapses every set-piece to a ≤200ms fade and kills particles/sway. All sounds route through `sfx` (shared module + the two added voices in §4.8). Nothing here adds a system — it dresses the existing mechanics.

### 4.1 Tap a clue card (open / read)

- **0ms:** card scales to 0.98 and lifts (`translateY(-2px)`, shadow deepens) — press state. `sfx.tap()`.
- **release:** card settles to a slightly larger "pulled" state (scale 1.0 from its resting 0.99, rotation jitter eases toward 0° so the read card sits straight). Paper-grain stays.
- A faint paper-shuffle on first open of a card (`sfx.paper()`, §4.8), once per card per case.
- Within 100ms the card text is legible at full contrast. SpeakButton visible top-right of the card.

### 4.2 Open the "Clear this suspect" flow

- Tap a suspect chip → chip presses (scale 0.98, `sfx.select()`), then the clear panel slides up from the suspect card (180ms ease-out): "Which clue clears {name}?" with the evidence list as tappable rows.
- Each evidence row is a 48px target; tapping arms a "Cite this clue" confirm.

### 4.3 Clear a suspect — RIGHT clue

- **0ms:** chosen clue row flashes brass, `sfx.select()`.
- **120ms:** suspect card does a single paper-flip on Y axis (240ms, ease-in-out). Mid-flip the face swaps to the CLEARED state.
- **On flip-complete:** a small green **CLEARED** stamp fades+settles into the corner (scale 1.06→1.0, 160ms), the cited clue text prints across the card in Special Elite, `sfx.success()` (the soft 3-note rise). Card desaturates ~30% and tilts to a "set aside" angle (+1.5°).
- Notebook auto-logs a line (§4.7). Suspect count "X of N cleared" ticks up with a 1-frame brass pulse.

### 4.4 Clear a suspect — WRONG clue

- **0ms:** chosen clue row shakes horizontally (±4px, 2 cycles, 160ms total), `sfx.fail()` (soft low tone, never harsh).
- The panel stays open; a calm rejection line appears under the row naming *why* it doesn't clear (copy in §5.4). No card flips. No XP changes. No "wrong" stamp. Player can pick another row immediately.
- Reduced-motion: row tints red-brown briefly instead of shaking.

### 4.5 Open ACCUSE → submit

- **ACCUSE button** lives in the CaseView footer, brass, ≥48px, with a subtle idle "breathing" glow (opacity 0.85↔1.0 over 3s) so it reads as the climax. It is enabled always (you may accuse early — that's a real choice), but if fewer than 2 implicating clues are even discoverable it still lets you try and fail gracefully.
- AccuseModal: pick **one suspect** (radio cards) + **exactly two clues** (the modal shows all evidence; selecting a third deselects the oldest, with a tick sound). Submit button disabled until suspect + 2 clues chosen. Submitting plays `sfx.tap()`.

### 4.6 Accusation result

**WRONG (suspect or supporting clues don't hold):**
- Modal does NOT slam shut. A typewriter line types in under the suspect (≈30ms/char, max ~60 chars) naming the gap (§5.4): e.g., "{name} was cleared by the gym alibi — they couldn't have done it." or "Those two clues don't both point at {name}."
- `sfx.fail()`. The first-try flag is lost (tracked silently; no scolding). Retry is immediate — selections persist so the player can adjust one thing.

**RIGHT → CASE CLOSED set-piece (storyboard §4.6.1).**

#### 4.6.1 CASE CLOSED set-piece storyboard (total ~1000ms, skippable by tap)

The modal dismisses and the case folder fills the lamplight. Beat by beat:

| t (ms) | Visual | Sound |
|--------|--------|-------|
| 0 | Folder snaps to center, lamp pool brightens ~15%, board behind dims to vignette. Folder sits slightly open. | — |
| 0–120 | A red **CASE CLOSED** stamp (Special Elite, stamp-red `#b3402e`) drops from above, scaling 1.6→1.0, rotating to a jaunty −7°, motion-blurred. | rising whoosh (`sfx.whoosh()`, §4.8) |
| 120 | **IMPACT.** Stamp lands. Folder jolts down 4px then settles. Ink-splat: 6–10 stamp-red SVG droplets burst outward (8–22px), fading over 260ms. Faint ring of ink bleeds at the stamp edge. | `sfx.stamp()` (noise burst + low thud) |
| 120–160 | Whole board shakes once (translate 3px, 90ms) — the "desk thump." | — |
| 220 | Two or three paper dust motes drift up through the lamp light (slow, 600ms, opacity ≤0.25). | — |
| 360 | The culprit's name fades in beneath the stamp in brass: "{name} did it." | soft `sfx.success()` low note |
| 360–800 | Stamp holds; a thin brass underline draws left-to-right beneath the name (CSS width transition, 320ms). | — |
| ~800 | "Tap to see your deduction" appears, gently pulsing. | — |

- **Skip:** a tap anytime after t=120 jumps straight to the recap screen (no audio cutoff — let the current sound tail out).
- **Reduced-motion:** stamp simply fades in at final position over 180ms with `sfx.stamp()`; no splat, no shake, no motes; name + underline appear immediately; go straight to the "tap to continue" affordance.

### 4.7 Notebook (auto-logging deductions)

- A slim notebook tab clings to the right edge ("NOTES", brass, vertical). Tapping slides it over (220ms). It is **append-only and automatic** — the player never types.
- Each cleared suspect writes one line in the moment of clearing, in a handwritten-feeling weight (Special Elite, slightly smaller): `— {name}: cleared. {one-line reason from the cited clue}.`
- When an attribute clue is *read* (opened) and it implicates, an optional faint line can note the narrowing ("Scarf clue: culprit wore a scarf."), but clears are the primary log. The notebook is the running spine the recap is built from.
- Slide-over has a SpeakButton that reads the whole log top to bottom.

### 4.8 Sound mapping (shared set + additions)

Reuse from `sfx`: `tap`, `select`, `success`, `fail`, `stamp`, `collect`. **Add two app voices** (engineer copies the `tone`/`noise` helpers):

```ts
// detective additions to sfx
whoosh: () => noise(0.18, 0.10),                       // rising air before the stamp lands
paper:  () => { noise(0.05, 0.06); tone(240, 0.05, "triangle", 0.05, 0.02); }, // soft page shuffle
```

| Event | Sound |
|-------|-------|
| Tap clue / button | `tap` |
| Arm a choice (clue row, suspect) | `select` |
| First open of a card | `paper` |
| Clear suspect (right) | `success` |
| Wrong clue / wrong accusation | `fail` (soft) |
| Stamp lands (CASE CLOSED) | `whoosh` then `stamp` |
| Badge earned | `collect` (the bright two-note) |
| Rank up | `success` then `collect` (chained, see §4.10) |

### 4.9 Badge toast

- Slides in from the top-right (220ms ease-out), a small "evidence label" card: brass border, a lucide glyph (per badge §6.1), badge name in Special Elite, one-line criterion under it.
- `sfx.collect()` on entry. A single brass shimmer sweeps across the card (400ms). Holds 3.2s, then slides out (220ms). Tapping it dismisses early and (if multiple queued) advances to the next.
- Toasts queue, never stack/overlap. Reduced-motion: fade in/out, no shimmer.

### 4.10 Rank-up

- After XP tally on the ResultScreen, if a threshold was crossed: the rank header's XP bar fills to 100% and "snaps" — the bar flashes brass, the old rank title strikes through and the **new rank types in** (Special Elite, ~40ms/char) with a brass underline draw.
- A new ID-card cosmetic (the one gated to this rank, §6.2) does a small "mint": it scales 0.9→1.0 with a brass glow sweep, captioned "New ID card unlocked: {style name}."
- Sound: `sfx.success()` then `sfx.collect()` chained (the success rise resolves, the collect sparkles the unlock). Reduced-motion: titles/bar update instantly, the ID card fades in, sounds still play.

### 4.11 Atmosphere & idle life (the "avatar")

The playable "thing" is the **case folder + board**. Its life:
- **Idle:** pinboard pins sway ±0.5° on a slow sine (8–12s period, staggered phases). The lamp pool has a barely-perceptible flicker (brightness ±2%, 6s). Paper cards hold their ±0.5° resting jitter (frozen per card per case via seeded value so they don't jitter every render).
- **On failure (wrong clue/accusation):** the lamp dips ~6% for 200ms then recovers — a small "hmm." No scolding motion.
- **On success (clear):** the cleared card's pin gives a tiny extra sway as the card settles.
- Reduced-motion: pins static, no flicker, jitter frozen (cards still rotated, just not animated).

---

## 5. Copy Deck

> Register (shared contract): calm, specific, quietly warm; talk to the player like a capable colleague. **No exclamation marks in system copy. No emoji. No "Great job, buddy."** Every line below could appear in a real professional tool.

### 5.1 Buttons & labels

| Key | Copy |
|-----|------|
| Open case | "Open case file" |
| Tabs | "Briefing" · "Evidence" · "Suspects" |
| Clear suspect (chip action) | "Clear this suspect" |
| Cite a clue (in clear panel) | "This clue clears them" |
| Clear panel prompt | "Which clue clears {name}?" |
| Accuse | "Accuse" |
| Accuse modal title | "Name the culprit" |
| Accuse modal sub | "Choose one suspect and the two clues that point to them." |
| Submit accusation | "Make the accusation" |
| Hint button | "Hint" |
| Hint, after tier 3 | "Inference shown" |
| Notebook tab | "NOTES" |
| Continue from recap | "Close the file" |
| Next case (board) | "Open next case" |
| Replay (closed case) | "Reopen this case" |
| Read aloud (aria) | "Read aloud" |
| Stop reading | "Stop" |
| Profile prompt | "Who's playing?" |

### 5.2 Empty / locked states

| State | Copy |
|-------|------|
| Case board, nothing closed yet | "Your first case is on the desk. Open it when you're ready." |
| Locked case (folder) | "Locked. Close case {n−1} to open this one." |
| Badge wall, none earned | "No badges yet. They're earned by how you work a case, not how fast." |
| Notebook, before any clears | "Your deductions will be recorded here as you clear suspects." |
| Suspects tab, before any evidence read | "Read the evidence first. Then decide who couldn't have done it." |

### 5.3 Recap framing (the deduction, as achievement)

Header: **"How you closed it"**. Then the chain, built from the notebook + the accusation, in plain detective prose. Template:

```
{ImplicatingLine1} {ImplicatingLine2}
That cleared {clearedNames joined}.
{culpritName} is the only one left — and {twoClueShortJustification}.
Case closed.
```

Worked example (tier 1): *"The scarf clue meant the culprit wore a scarf. The gym alibi put Marcus in the gym. That cleared Marcus and Zoe. Priya is the only one left — and she wore a scarf and owns the dog from the paw prints. Case closed."*

- Each line gets the cited clue's text available on tap (a small "show clue" disclosure).
- A line at the foot states what was earned: "Closed hint-free. First-try accusation. +190 XP." (only the bonuses actually earned are listed; no false praise).
- SpeakButton reads the whole recap.

### 5.4 Rejections (specific, never scolding)

**Wrong clue while clearing** — name why it doesn't clear:
| Situation | Copy |
|-----------|------|
| Cited a flavor clue | "That clue doesn't place anyone. It can't clear {name}." |
| Cited an alibi for a different person | "That statement is about {otherName}, not {name}." |
| Cited an attribute clue that {name} actually matches | "{name} matches that detail, so it doesn't clear them." |
| Cited an attribute clue on a dimension that doesn't rule {name} out | "That tells us about the culprit, but it doesn't rule {name} out." |

**Wrong accusation:**
| Situation | Copy |
|-----------|------|
| Accused a suspect already cleared | "{name} was already cleared by {clueShortRef}. They couldn't have done it." |
| Accused the wrong (uncleared) suspect | "The evidence doesn't point to {name}. Check who each clue rules out." |
| Right suspect, but the two clues don't both implicate | "Right instinct — but those two clues don't both point to {name}. Find the two that do." |
| Fewer than two implicating clues chosen | "An accusation needs two clues that point to the same person." |

### 5.5 Hint copy (all three tiers, deterministic per state)

The engine resolves the current best deduction, then fills:

**Tier 1 — Nudge (category):**
- Toward an attribute clue: "Look at the {dimension} clues. One of them rules someone out."
- Toward an alibi: "An alibi in the evidence clears one of your suspects. Find it."
- Toward the accusation (all cleared): "Everyone but one is cleared. You're ready to accuse — find the two clues that point to them."

**Tier 2 — Highlight (card pulses; copy in panel):**
- "This clue is the one. Read it again — who can't match it?"
- (alibi) "This statement places {name} somewhere else. That clears {name}."

**Tier 3 — Spell it out (the inference):**
- (attribute) "The culprit has {value}. {nonMatchingName} has {theirValue}, so {nonMatchingName} is cleared."
- (alibi) "{name} was in the {place} the whole time, so {name} couldn't have done it. Clear them."
- (accusation) "It's {culpritName}. Accuse them with the {clueA short} and the {clueB short}."

### 5.6 Settings screen

Title: **"Settings"**. Items:
| Control | Copy |
|---------|------|
| Sound | "Sound" — toggle, sub: "Stamps, chimes, page sounds." Default on. |
| Text size | "Text size" — three options: "Standard · Large · Largest". |
| Read aloud help | "Read aloud" — sub: "Tap the speaker on any text to hear it." (informational, not a toggle) |
| Reset profile | "Reset this profile" — sub: "Clears {profileName}'s cases and badges. This can't be undone." Confirm step: "Reset {profileName}? Type nothing — just confirm." → buttons "Keep my progress" / "Reset". |

### 5.7 Error boundary fallback

"Something in this case file got jammed. Your other cases are safe." Button: "Reset this profile's save". Sub: "Only {profileName}'s progress is cleared."

### 5.8 Profile picker

Header "Who's playing?" Three monogram discs: **P** (Player One), **P** (Player Two), **G** (Guest), each a colored circle + initial in Special Elite. Sub-line under each: the player's rank if they have one ("Junior Detective"), else "New detective".

---

## 6. Achievements & Cosmetics

### 6.1 Badges (8 — name, criterion, one-line description)

Lucide glyphs are CSS/SVG (no image assets). Each badge fires its toast (§4.9) the first time its criterion is met.

| # | Badge | Glyph | Criterion (precise) | Description |
|---|-------|-------|---------------------|-------------|
| 1 | **Sharp Eye** | `Eye` | Close any case with `hintsUsed === 0`. | Closed a case with no hints. |
| 2 | **Methodical** | `ListChecks` | Close a case where every innocent was cleared before the accusation was submitted. | Cleared everyone before naming the culprit. |
| 3 | **First Case** | `FolderOpen` | Close case 1. | Opened and closed your very first file. |
| 4 | **Clean Hands** | `Sparkles` | Close any case first-try (correct on first accusation submit). | No wrong accusations on the case. |
| 5 | **Quick Study** | `Zap` | Close any case in under 90 seconds (timer from case open to accusation). | Read fast, deduced faster. |
| 6 | **Red-Herring Hunter** | `Fish` | In a tier-3 case, correctly close it without ever citing a flavor clue in a clear or accusation. | Ignored the noise, used only real proof. |
| 7 | **Three Tiers** | `Layers` | Close at least one case in each tier (a tier-1, a tier-2, and a tier-3). | Solved across all difficulty tiers. |
| 8 | **Case Files Complete** *(completionist)* | `Trophy` | Close all 30 cases. | Every case in the academy, closed. |

(Sharp Eye, Methodical, and a completionist are all present per spec; the eighth slot is the completionist `Case Files Complete`.)

### 6.2 Cosmetics — Detective ID-card styles (5; CSS/SVG only; rank-gated)

Shown on the profile screen as the player's ID card (monogram disc + name + rank + the active style). Player may switch among unlocked styles. All are CSS gradients, borders, SVG textures, and the existing palette — **no images**.

| # | Style | Unlock rank | Visual (CSS/SVG terms) |
|---|-------|-------------|------------------------|
| 1 | **Standard Issue** | Cadet (default) | Manila `#efe7d6` card, thin brass `#d9a441` 2px border, Special-Elite name, paper-grain via repeating subtle SVG noise overlay, one CONFIDENTIAL micro-stamp watermark at 8% opacity. |
| 2 | **Lamplight** | Junior Detective | Same card with a radial-gradient warm pool (center `#fff6e0`→edge `#efe7d6`), faint vignette; brass border thickens to 3px; a tiny SVG desk-lamp glyph embossed top-left. |
| 3 | **Pinboard** | Detective | Card sits on a corkboard texture (CSS radial dot pattern in muted tans), held by two SVG push-pins (top corners) casting soft drop-shadows; slight ±0.7° rotation. |
| 4 | **Brass & Ink** | Senior Detective | Dark surface `#1d2026` card (inverted), brass foil border with a CSS linear-gradient sheen (animated shimmer sweep on hover, reduced-motion: static), name in brass, a stamp-red wax-seal SVG circle bottom-right. |
| 5 | **Chief's Seal** | Chief Inspector | Full noir: near-black card with a hand-drawn SVG laurel ring in brass, an embossed "CHIEF INSPECTOR" arc, a subtle gold-leaf speckle (tiny SVG dots), and a deep vignette. The "you made it" card. |

(Five styles, one per advancing rank except Inspector — Inspector rank-up grants no new card but unlocks an early replay-grind path to Chief; if the director prefers exactly one card per rank, see Open Question Q3. Range 4–6 is satisfied at 5.)

---

## 7. Early-Reader Path (age 6)

The early reader plays **the same real game** — tier 1 only to start, scaffolded so reading load never blocks them. No separate mode; these are properties of tier-1 content + universal affordances.

**Reading budget (tier 1, already enforced by the generator's word budgets, tuned by these templates):**
- Intro ≤40 words and built from short declarative lines (§3.3 pairings are all ≤32).
- Every clue ≤15 words, one idea per clue, common sight words first. (Templates H1–H4, C1–C4, AL1–AL4 are short and concrete.)
- Suspect chips show the **name + three attribute icons** (hair color swatch, accessory glyph, pet glyph) so the early reader can match a clue to a suspect *visually* without parsing the card — e.g., a scarf clue → find the chip with the scarf icon that *isn't* the cleared ones.

**TTS touchpoints (every prose block has a SpeakButton; the early-reader path leans on them):**
- Briefing: SpeakButton reads the full intro.
- Every clue card: SpeakButton reads the clue.
- The clear panel prompt and each evidence row: tappable speaker reads "Which clue clears {name}?" and each row's text.
- Recap: SpeakButton reads the whole chain back as his achievement.
- Hint tiers 1–3: each hint line has a speaker (he can *hear* the inference).

**Icon support (CSS/SVG glyphs, no text required to act):**
- Attribute icons: hair = colored hair-tuft SVG in the actual hair color; accessory = scarf/glasses/cap/watch/backpack lucide-style glyphs; pet = dog/cat/bird/none (none = small "no pet" circle-slash) glyphs.
- Clue cards carry a **category icon** (hair / accessory / pet / alibi / flavor) in the corner so the early reader can sort clue *types* pre-literately. Alibi = a small map-pin; flavor = a faint question-mark tag (teaches "maybe noise").
- Cleared = green check stamp; the CASE CLOSED stamp and the badge glyphs are all icon-legible.

**Flow for the early reader (concrete first win ≤2 min):** Open case 1 → tap the speaker, hear the briefing → Evidence tab, tap each clue's speaker → Suspects tab: an alibi clue's map-pin + the named chip makes one clear obvious; tap suspect → tap the clue row with the matching speaker → CLEARED flip. Repeat for the second innocent (an attribute icon mismatch) → ACCUSE the remaining chip with the two implicating clues (highlighted by hints if needed) → CASE CLOSED. Reading is *supported by* hearing and matching, never required to act.

**Largest text size** (§5.6) is the recommended default for the early-reader profile (the engineer may default that profile to "Large" via the `profiles.local` `largeText` flag; not binding).

---

## 8. Open Questions for the Director

1. **Quick Study timer (Badge #5).** I set the threshold at 90s from case-open to accusation, which favors a confident tier-1 close but is hard on tier-3. Should it be **tier-relative** (e.g., 90s tier-1, 150s tier-2, 210s tier-3), or do you want a single global time that effectively scopes the badge to early cases? I lean tier-relative.

2. **Title recurrence across 30 cases.** With 12 titles and 30 cases, titles repeat (widely spaced). Acceptable, or do you want me to author 30 distinct titles (I'd add 18 more in the same warm register)? I kept 12 to stay tight; expanding is cheap.

3. **Cosmetic-per-rank parity.** I authored 5 ID cards across 6 ranks, leaving **Inspector** without a new card (Inspector instead gates the replay-grind path to Chief). Do you want a 6th card so every rank-up mints one (cleaner reward loop), or is the 5-card spacing fine? Range allows 4–6 either way.

4. **Replay XP for bonuses.** I let replays re-earn the performance bonuses (first-try, Sharp Eye, Methodical) but not the one-time "first-time clear." This permits a completionist to grind toward Chief Inspector early without inflating the first-run curve. Confirm you're comfortable with replay-earned XP existing at all (the alternative is replays award zero XP and exist purely for fun).

5. **Early-reader default text size.** I recommend defaulting the **early-reader** profile to "Large" (the others to "Standard"), driven by the `profiles.local` `largeText` flag. This is the one place a per-profile default leaks into engineering. Approve, or keep all profiles at "Standard" and let the kid bump it in Settings?
