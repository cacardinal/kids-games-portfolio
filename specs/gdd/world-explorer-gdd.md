# World Explorer: Game Design Document

> Binding order: `PLAN.md` -> `specs/shared-design.md` -> `specs/world-explorer.md` -> this GDD. This GDD finalizes content, tuning, copy, and set-pieces within those rails. Engineer reads all four. All facts are restricted to canonical, verifiable basics and have been pre-checked against ISO 3166-1, UN/Wikipedia reference figures, and origin sources; a Haiku fact-checker re-audits `data/` before ship.

## 1. Design Summary

World Explorer is a premium expedition journal. You open a linen world map under soft lamplight, pick a boarding-pass mission from the tray, and go find a place: by where chocolate began, by a landmark's silhouette, by tracing a storied route, or by judging which country is bigger. Every find lands a passport stamp with a real ink-thunk, and the fact you uncovered files itself into your Explorer Log. The book fills; covers unlock; three regions open in turn.

Five most important decisions: (1) **Warmer/colder turns every wrong tap into progress**, never punishment. Distance feedback plus a dignified 3rd-miss reveal, so the early reader never gets stuck. (2) **Compare missions use only wide-margin pairs** (>=2.5x apart) so the derived winner is fact-checker-proof and a kid's intuition can win. (3) **Locate/landmark targets are large or medium countries, or force a continent zoom first** so answers are always tap-findable. (4) **The stamp set-piece is the reward spine**, one 1000ms ink moment carrying the whole loop. (5) **The early reader plays fully pre-reading** via auto-zoom, TTS on every prompt, and icon-led boarding passes.

## 2. Tuning Tables

### Star / Stamp economy
| Event | Rule |
|---|---|
| Stamp | Earned on EVERY mission completion (including after 3 misses / reveal). One stamp per mission, region-styled. |
| Star (locate/landmark) | Awarded only if the correct country is the **first tap** (zero wrong taps). |
| Star (route) | Awarded if the full route is completed with **zero out-of-order taps**. |
| Star (compare) | Awarded if the **first card tapped is correct**. |
| Re-play | A completed mission can be replayed for fun; **stars/stamps never decrement and never re-award** (count is monotonic; first result is frozen). |
| Explorer Log | Every completed mission appends its fact(s) to the Log, deduped by fact id. Each fact has a SpeakButton. |

### Warmer / colder thresholds (locate + landmark)
Classifier compares the tapped country's centroid great-circle distance to the answer (`d3.geoDistance`, radians) against the **previous** wrong tap's distance. First wrong tap has no prior, so it uses absolute bands.

| State | Condition | Feedback |
|---|---|---|
| Correct | tapped iso3 == answer | success path (stamp set-piece) |
| Warmer | this distance < previous distance - 0.05 rad | "Warmer." + warm pulse |
| Colder | this distance > previous distance + 0.05 rad | "Colder." + cool pulse |
| Same heat | within +-0.05 rad of previous | "Still warm." / "Still cold." (by absolute band) |
| First wrong (absolute) | no prior tap | <0.35 rad -> "Close." ; 0.35-0.9 -> "Getting there." ; >0.9 -> "Far off." |

Absolute "warm zone" for the first-tap copy and the `Still warm/cold` split is threshold **0.6 rad** (~same continent neighborhood). Monotonic-with-distance is the only hard test requirement; bands above are the tuned values.

### Miss ladder (locate + landmark)
| Miss # | Behavior |
|---|---|
| 1 | warmer/colder copy (absolute band) + wrong-shake on tapped country |
| 2 | warmer/colder vs prior + **auto-zoom to the answer's continent** (200ms transform) + "Zooming in to help." |
| 3 | **Reveal**: answer country pulses highlight, neutral reveal copy shown, stamp earned WITHOUT star. No shake on reveal. |

Route out-of-order tap is NOT a "miss" against the star until the route is completed; the first out-of-order tap anywhere in the route forfeits the route star (tracked by a `clean` flag), with gentle-bounce feedback each time.

### Unlock gates
| Gate | Threshold |
|---|---|
| Region 1 (Americas) | open from first launch |
| Region 2 (Europe & Africa) | >=4 of 6 Americas missions complete |
| Region 3 (Asia & Oceania) | >=4 of 6 Europe & Africa missions complete |
| Locked region tab | shown, dimmed, with a small lock glyph + counter "Complete 4 Americas missions" |

### Cosmetic unlock ladder (passport covers, by total stamps)
| Stamps | Cover unlocked |
|---|---|
| 0 (default) | Voyager (Oxblood) |
| 3 | Field Linen (Sand) |
| 8 | Deep Sea (Navy) |
| 13 | Summit (Forest) |
| 18 (all) | Aurora (Foil), prestige |

(18 total stamps possible = 18 missions. Compare-only profiles still reach every gate.)

## 3. Content Design

### 3.1 The 45 Countries
Region maps to the data model: **americas** = N+S America; **europe-africa** = Europe+Africa; **asia-oceania** = Asia+Oceania. `isoN3` is the topojson `feature.id` (zero-padded). Population in millions, area in km2, both rounded common-reference values. Facts are canonical and kid-phrased; `signature` is one phrase.

#### Americas (continent in parens: NA = north-america, SA = south-america)
| Name | iso3 | isoN3 | Cont. | Capital | Pop (M) | Area (km2) | Facts | Signature |
|---|---|---|---|---|---|---|---|---|
| United States | USA | 840 | NA | Washington, D.C. | 342 | 9,525,000 | Has 50 states; the Grand Canyon is here. | bald eagle |
| Canada | CAN | 124 | NA | Ottawa | 41 | 9,985,000 | The second-largest country by land; covered in forests and lakes. | maple syrup |
| Mexico | MEX | 484 | NA | Mexico City | 131 | 1,964,000 | The ancient Maya built stone pyramids here. | tacos |
| Guatemala | GTM | 320 | NA | Guatemala City | 18 | 109,000 | Home to Tikal, a Maya city in the rainforest. | jade |
| Cuba | CUB | 192 | NA | Havana | 11 | 110,000 | The largest island in the Caribbean Sea. | sugarcane |
| Jamaica | JAM | 388 | NA | Kingston | 3 | 11,000 | A Caribbean island where reggae music began. | reggae |
| Costa Rica | CRI | 188 | NA | San José | 5 | 51,000 | Famous for rainforests full of frogs and sloths. | rainforest |
| Brazil | BRA | 076 | SA | Brasília | 213 | 8,510,000 | The Amazon rainforest covers much of it. | soccer |
| Argentina | ARG | 032 | SA | Buenos Aires | 46 | 2,781,000 | The tango dance grew up here. | tango |
| Peru | PER | 604 | SA | Lima | 34 | 1,285,000 | Machu Picchu, an old Inca city, sits in its mountains. | llamas |
| Chile | CHL | 152 | SA | Santiago | 20 | 756,000 | A very long, thin country along the Pacific. | penguins |
| Colombia | COL | 170 | SA | Bogotá | 53 | 1,139,000 | Known for coffee grown in its highlands. | coffee |
| Bolivia | BOL | 068 | SA | Sucre | 11 | 1,099,000 | Has a giant salt flat that looks like a mirror. | salt flats |
| Ecuador | ECU | 218 | SA | Quito | 18 | 257,000 | Sits right on the Equator; the cacao tree grows here. | cacao |
| Venezuela | VEN | 862 | SA | Caracas | 28 | 916,000 | Home to Angel Falls, the tallest waterfall on Earth. | Angel Falls |

#### Europe & Africa (EU = europe, AF = africa)
| Name | iso3 | isoN3 | Cont. | Capital | Pop (M) | Area (km2) | Facts | Signature |
|---|---|---|---|---|---|---|---|---|
| United Kingdom | GBR | 826 | EU | London | 69 | 244,000 | Made up of islands; Big Ben's clock tower is in London. | tea |
| France | FRA | 250 | EU | Paris | 69 | 644,000 | The Eiffel Tower stands in Paris. | baguette |
| Spain | ESP | 724 | EU | Madrid | 50 | 505,000 | Known for flamenco dancing and sunny coasts. | flamenco |
| Italy | ITA | 380 | EU | Rome | 59 | 301,000 | Shaped like a boot; famous for pizza and pasta. | pizza |
| Germany | DEU | 276 | EU | Berlin | 83 | 358,000 | Known for castles and building cars. | pretzels |
| Greece | GRC | 300 | EU | Athens | 10 | 132,000 | The Olympic Games began here long ago. | olives |
| Norway | NOR | 578 | EU | Oslo | 6 | 386,000 | Has deep ocean valleys called fjords. | fjords |
| Egypt | EGY | 818 | AF | Cairo | 109 | 1,001,000 | The Great Pyramids of Giza were built here. | pyramids |
| Morocco | MAR | 504 | AF | Rabat | 37 | 447,000 | The Sahara Desert stretches across its south. | mint tea |
| Kenya | KEN | 404 | AF | Nairobi | 53 | 580,000 | Lions and elephants roam its grasslands. | safari |
| Nigeria | NGA | 566 | AF | Abuja | 224 | 924,000 | The country with the most people in Africa. | jollof rice |
| Ethiopia | ETH | 231 | AF | Addis Ababa | 112 | 1,104,000 | Coffee was first discovered here. | coffee |
| South Africa | ZAF | 710 | AF | Pretoria | 60 | 1,219,000 | One of the few countries with three capital cities. | gold |
| Tanzania | TZA | 834 | AF | Dodoma | 68 | 947,000 | Mount Kilimanjaro, Africa's tallest peak, is here. | Kilimanjaro |
| Madagascar | MDG | 450 | AF | Antananarivo | 30 | 587,000 | A large island where lemurs live in the wild. | lemurs |

#### Asia & Oceania (AS = asia, OC = oceania)
| Name | iso3 | isoN3 | Cont. | Capital | Pop (M) | Area (km2) | Facts | Signature |
|---|---|---|---|---|---|---|---|---|
| China | CHN | 156 | AS | Beijing | 1,410 | 9,597,000 | The Great Wall stretches for thousands of miles. | tea |
| Japan | JPN | 392 | AS | Tokyo | 123 | 378,000 | A country of islands; Mount Fuji is its tallest peak. | sushi |
| India | IND | 356 | AS | New Delhi | 1,430 | 3,287,000 | The Taj Mahal, a white marble palace, is here. | spices |
| Russia | RUS | 643 | AS | Moscow | 144 | 17,098,000 | The largest country in the world by land. | nesting dolls |
| Thailand | THA | 764 | AS | Bangkok | 66 | 513,000 | Known for golden temples and elephants. | pad thai |
| Vietnam | VNM | 704 | AS | Hanoi | 100 | 331,000 | Famous for rice fields shaped like green stairs. | pho |
| Indonesia | IDN | 360 | AS | Jakarta | 281 | 1,905,000 | Made of more than 17,000 islands. | spices |
| Mongolia | MNG | 496 | AS | Ulaanbaatar | 3 | 1,564,000 | Wide grassy plains where horse riders roam. | horses |
| South Korea | KOR | 410 | AS | Seoul | 52 | 100,000 | A leader in phones, video games, and K-pop music. | kimchi |
| Saudi Arabia | SAU | 682 | AS | Riyadh | 36 | 2,150,000 | Mostly desert; the source of much of the world's oil. | dates |
| Pakistan | PAK | 586 | AS | Islamabad | 245 | 771,000 | The Indus River runs through it; near K2, the world's 2nd-tallest mountain. | cricket |
| Kazakhstan | KAZ | 398 | AS | Astana | 19 | 2,725,000 | The largest landlocked country in the world. | apples |
| Philippines | PHL | 608 | AS | Manila | 113 | 300,000 | An island country with more than 7,000 islands. | mangoes |
| Australia | AUS | 036 | OC | Canberra | 27 | 7,741,000 | Kangaroos live in the wild here. | kangaroos |
| New Zealand | NZL | 554 | OC | Wellington | 5 | 269,000 | Two main islands; known for sheep and tall mountains. | kiwi bird |

### 3.2 The 24 Landmarks
All rendered as stylized SVG silhouettes/monogram discs (no photos). Blurb is the card subtitle (kid-phrased, canonical).
| id | Name | Country (iso3) | Blurb |
|---|---|---|---|
| lm-statue-liberty | Statue of Liberty | USA | A giant copper statue holding a torch in New York harbor. |
| lm-grand-canyon | Grand Canyon | USA | A canyon so wide and deep a river carved it over ages. |
| lm-chichen-itza | Chichén Itzá | MEX | A stepped stone pyramid built by the Maya. |
| lm-tikal | Tikal | GTM | A tall Maya temple rising out of the rainforest. |
| lm-machu-picchu | Machu Picchu | PER | An Inca city of stone high in the mountains. |
| lm-christ-redeemer | Christ the Redeemer | BRA | A huge statue with open arms above Rio de Janeiro. |
| lm-angel-falls | Angel Falls | VEN | The tallest waterfall on Earth, dropping off a flat-topped mountain. |
| lm-salar-uyuni | Uyuni Salt Flat | BOL | A flat white desert of salt that mirrors the sky. |
| lm-eiffel-tower | Eiffel Tower | FRA | An iron tower built in Paris over a hundred years ago. |
| lm-big-ben | Big Ben | GBR | A famous clock tower beside the river in London. |
| lm-colosseum | Colosseum | ITA | A giant round stone arena from ancient Rome. |
| lm-parthenon | Parthenon | GRC | A marble temple on a hill above Athens. |
| lm-sagrada | Sagrada Família | ESP | A tall, spiky church in Barcelona still being built. |
| lm-pyramids-giza | Pyramids of Giza | EGY | Three enormous pyramids built as royal tombs. |
| lm-kilimanjaro | Mount Kilimanjaro | TZA | The tallest mountain in Africa, with snow on top. |
| lm-table-mountain | Table Mountain | ZAF | A mountain with a flat top like a tabletop, above Cape Town. |
| lm-great-wall | Great Wall | CHN | A stone wall that snakes for thousands of miles. |
| lm-taj-mahal | Taj Mahal | IND | A white marble palace built as a memorial. |
| lm-mount-fuji | Mount Fuji | JPN | A snow-capped volcano shaped like a perfect cone. |
| lm-ha-long | Ha Long Bay | VNM | A green bay full of tall limestone islands. |
| lm-grand-palace | Grand Palace | THA | A glittering golden palace in Bangkok. |
| lm-desert-towers | Riyadh Towers | SAU | Tall modern glass towers rising from the desert. |
| lm-opera-house | Sydney Opera House | AUS | A building with white sail-shaped roofs by the harbor. |
| lm-uluru | Uluru | AUS | A massive red rock rising from the flat outback. |

> Every landmark's country sits inside the 45-country set; silhouettes are stylized single-color SVG (Ha Long Bay = clustered karst humps; Riyadh Towers = a notched-top tower skyline). No landmark crosses a border or references a country outside the set.

### 3.3 The 6 Routes (storied; waypoints are iso3 from the country set, ordered)
| id | Name | Waypoints (in order) | Blurb |
|---|---|---|---|
| rt-silk-road | The Silk Road | CHN -> MNG -> KAZ -> RUS -> ITA | The old trading path that carried silk and spices from China toward Europe. |
| rt-spice-route | The Spice Route | IND -> THA -> VNM -> IDN -> PHL | Sailing ships followed these waters to gather pepper, cloves, and nutmeg. |
| rt-pan-american | The Pan-American Trail | USA -> MEX -> GTM -> COL -> PER -> CHL | A path running the length of the Americas, north to south. |
| rt-incense-nile | The Nile & Sahara Path | EGY -> ETH -> KEN -> TZA -> ZAF | A journey down Africa, following deserts, rivers, and grasslands. |
| rt-grand-tour | The Grand Tour | GBR -> FRA -> ESP -> ITA -> GRC | The classic loop young travelers once took to see Europe's great cities. |
| rt-pacific-rim | The Pacific Rim | JPN -> KOR -> PHL -> AUS -> NZL | Island-hopping down the western edge of the Pacific Ocean. |

> Route-star "clean" rule: a route is `clean` until the player's first out-of-order tap. All routes' waypoints are large/medium and tap-findable, and the route view zooms to fit the waypoint set's bounds before accepting taps.

### 3.4 The 18 Missions (6 per region; mixed types)
Type mix per region: **2 locate, 2 landmark, 1 route, 1 compare** (= 18 total: 6 locate, 6 landmark, 3 route, 3 compare). Locate/landmark targets are large/medium and tap-findable; the engine auto-zooms to the continent before accepting answers per the map contract. Prompts for locate/landmark are kept short (early-reader-readable + TTS).

#### Region 1: Americas (`region: "americas"`)
| id | Type | Prompt / payload | Answer | Star fact surfaced |
|---|---|---|---|---|
| am-1 | locate | "Find where chocolate began." | ECU | The cacao tree grows in Ecuador, on the Equator. |
| am-2 | locate | "Find the largest country in South America." | BRA | The Amazon rainforest covers much of Brazil. |
| am-3 | landmark | card: lm-machu-picchu (Machu Picchu) -> find its country | PER | Machu Picchu is an old Inca city in Peru's mountains. |
| am-4 | landmark | card: lm-chichen-itza (Chichén Itzá) -> find its country | MEX | The Maya built stone pyramids in Mexico. |
| am-5 | route | rt-pan-american (USA->MEX->GTM->COL->PER->CHL) | n/a | The Pan-American trail runs the length of the Americas. |
| am-6 | compare | metric: areaKm2, "Which country is bigger?" Canada vs Mexico | CAN | Canada about 10 million km2; Mexico about 2 million km2. |

#### Region 2: Europe & Africa (`region: "europe-africa"`)
| id | Type | Prompt / payload | Answer | Star fact surfaced |
|---|---|---|---|---|
| ef-1 | locate | "Find where coffee was first discovered." | ETH | Coffee was first discovered in Ethiopia. |
| ef-2 | locate | "Find the country with the most people in Africa." | NGA | Nigeria has the most people of any country in Africa. |
| ef-3 | landmark | card: lm-eiffel-tower (Eiffel Tower) -> find its country | FRA | The Eiffel Tower stands in Paris, France. |
| ef-4 | landmark | card: lm-pyramids-giza (Pyramids of Giza) -> find its country | EGY | The Great Pyramids were built in Egypt. |
| ef-5 | route | rt-grand-tour (GBR->FRA->ESP->ITA->GRC) | n/a | The Grand Tour visited Europe's great old cities. |
| ef-6 | compare | metric: population, "Which country has more people?" Nigeria vs Kenya | NGA | Nigeria about 224 million; Kenya about 53 million. |

#### Region 3: Asia & Oceania (`region: "asia-oceania"`)
| id | Type | Prompt / payload | Answer | Star fact surfaced |
|---|---|---|---|---|
| ao-1 | locate | "Find the largest country in the world." | RUS | Russia is the largest country on Earth by land. |
| ao-2 | locate | "Find where kangaroos live in the wild." | AUS | Kangaroos live in the wild in Australia. |
| ao-3 | landmark | card: lm-great-wall (Great Wall) -> find its country | CHN | The Great Wall stretches across China. |
| ao-4 | landmark | card: lm-taj-mahal (Taj Mahal) -> find its country | IND | The Taj Mahal is a white marble palace in India. |
| ao-5 | route | rt-silk-road (CHN->MNG->KAZ->RUS->ITA) | n/a | The Silk Road carried goods from China toward Europe. |
| ao-6 | compare | metric: population, "Which country has more people?" India vs Australia | IND | India about 1.4 billion; Australia about 27 million. |

**Compare-pair safety (all >=2.5x apart, derived from §3.1 stored values):**
- am-6 area: CAN 9,985,000 vs MEX 1,964,000 -> 5.1x. Winner CAN. OK
- ef-6 pop: NGA 224 vs KEN 53 -> 4.2x. Winner NGA. OK
- ao-6 pop: IND 1,430 vs AUS 27 -> 53x. Winner IND. OK

(No US/China area pair, no Spain/Thailand area pair, no India/China pop pair; all near-ties excluded by design.)

## 4. Juice Script

Timings honor shared-design: micro-interactions 100-200ms ease-out; the one earned set-piece 800-1200ms, tap-skippable; `prefers-reduced-motion` collapses set-pieces to <=200ms fades and kills particles. Sound via `sfx.*` (two app voices added: `sfx.ink` and `sfx.line`).

### 4.1 Per-interaction
| Interaction | Visual | Sound | Timing |
|---|---|---|---|
| Tap country (neutral, e.g. browsing) | path lifts 1px via filter brightness +6%, cursor/hit ripple from tap point | `sfx.tap` | 120ms |
| Select boarding-pass card | card lifts 4px, soft shadow grows, perforation edge separates 2px | `sfx.select` | 150ms |
| **Tap correct country** | path fills highlight teal, a quick 1.06 scale pop, then hands to stamp set-piece | `sfx.success` then `sfx.ink` | 180ms -> set-piece |
| **Tap wrong country (locate/landmark)** | wrong-shake: 3-cycle 4px horizontal shake on tapped path; tapped path flashes a faint cool outline; warmth pulse on the MAP EDGE. Warm = a brief amber vignette breath, cold = a brief blue vignette breath | `sfx.fail` (soft) | 220ms shake + 180ms vignette |
| Warmer | amber vignette breath inward (opacity 0->0.18->0), warmth meter chip near prompt nudges toward "hot" | `sfx.tap` (single, higher) | 180ms |
| Colder | blue vignette breath, warmth meter nudges toward "cold" | `sfx.fail` | 180ms |
| Auto-zoom (after miss 2) | map group `transform` eases to continent `fitExtent`; compass rose spins 30deg and settles | `sfx.select` | 200ms |
| 3rd-miss reveal | answer country pulses highlight twice (scale 1->1.05->1), neutral copy fades in below prompt | `sfx.collect` (gentle, no fanfare) | 2x 300ms |
| Route, correct in-order waypoint | waypoint country gets a small gold dot pin (drops 6px + settles), a gold dotted segment begins drawing toward it from the previous waypoint | `sfx.line` (short rising blip) | dot 200ms; segment draw 300-450ms by length |
| Route, out-of-order tap | tapped country does a gentle vertical bounce (8px up/down, 1 cycle), hint copy slides in | `sfx.tap` (low) | 200ms |
| Route, completed | full gold dotted polyline finishes drawing across all segments, a faint compass bearing sweeps the path, then the stamp set-piece fires | `sfx.line` ascending arpeggio | line 600-900ms total -> set-piece |
| Compare, tap a card | both cards flip on Y axis (140ms each, 40ms stagger), numbers count up from 0 to the real value (number tween), winner card gets a gold ring + raises 6px, loser dims to 70% | flip: `sfx.select`; reveal: `sfx.success` if first-tap correct else `sfx.tap` | flips 320ms + count 500ms |
| Open passport | book cover swings open on left spine (perspective rotateY), pages settle | `sfx.select` | 400ms |
| Page turn (passport/log) | single page peels from the corner and lays over (rotateY + shadow sweep) | `sfx.tap` | 260ms |
| Unlock cover/badge | the new cover/badge tile mints: scales 0.8->1 with a brief gold sheen sweeping diagonally; a few gold dust particles | `sfx.collect` | 500ms |

### 4.2 Passport-stamp set-piece storyboard (1000ms; tap-to-skip jumps to end state)
This is the reward spine. Fired on every mission completion. The passport page is already visible behind the mission overlay (overlay dims to a soft scrim as the stamp falls).
| Beat | ms | Action |
|---|---|---|
| 1. Wind-up | 0-120 | Overlay scrim deepens; the target stamp (region-styled SVG, see §4.3) appears top-center at scale 1.4, rotated -8deg, opacity 0.0->0.85, casting a growing soft shadow (it is "above" the page, descending). A faint anticipatory low tone. |
| 2. Impact / thunk | 120-260 | Stamp slams to scale 1.0 onto its page slot; on contact: `sfx.stamp` (noise + low thunk) + `sfx.ink`; page does a 2deg tilt-and-recoil (whole passport rocks); a 6px impact ring expands from the stamp center. |
| 3. Ink spread | 260-620 | The stamp's ink "blooms": its colored fill animates via an SVG `feTurbulence`/radial-mask reveal from center outward (ink soaking into paper), edges slightly irregular; 5-8 tiny ink-fleck particles scatter and fade; the ring fades. Star (if earned) drops in beside the stamp with a small sparkle. |
| 4. Settle + fact | 620-1000 | Page un-tilts to rest; stamp sits with a faint emboss/inner-shadow (pressed into paper); the fact line slides up from the bottom of the page with its SpeakButton; a "Stamp earned" / "First-try star" micro-label fades in. Control returns. |

Skip: a tap anywhere after beat 1 jumps to beat 4 end-state instantly (stamp placed, ink full, fact shown). Reduced-motion: beats 1-3 collapse to a 180ms opacity fade of the finished stamp; no particles, no rock, no turbulence.

### 4.3 Stamp visual designs per region (SVG terms)
All stamps share the chassis: a **circular double-ring frame** (outer ring 2px, inner ring 1px, ~84px diameter) with the region name arced along the top inside the ring and a small year-style flourish along the bottom (no real dates; use a compass-point motif). Ink color is region-keyed; texture is the §4.2 bloom. A subtle perforated/scalloped outer edge sells "rubber stamp."

| Region | Ink color | Center motif (stylized SVG, single-color line/fill) | Arc text |
|---|---|---|---|
| Americas | warm terracotta `#b5642f` | a stepped Maya-style pyramid silhouette with a small sun above (geometric triangles + circle) | "THE AMERICAS" |
| Europe & Africa | deep olive-teal `#2f7d72` | a compass rose over a stylized acacia tree + obelisk pair (line art) | "EUROPE & AFRICA" |
| Asia & Oceania | indigo `#3b4e8f` | a wave crest (Hokusai-simple curl) with a small mountain peak behind | "ASIA & OCEANIA" |

Earned route missions overprint a tiny gold dotted-line glyph beneath the motif; compare missions overprint a tiny balance-scale glyph; landmark missions overprint a tiny silhouette of that landmark at ring-bottom. (Overprints are 12px, the route/compare/landmark "sub-stamp," in `route gold #d4a843`.)

## 5. Copy Deck (system register; no exclamation marks, no emoji)

### Atlas / navigation
- App title: **World Explorer**
- Region tab labels: "Americas" / "Europe & Africa" / "Asia & Oceania"
- Mission tray header: "Missions"
- Locked region tab: "Locked. Complete 4 Americas missions." (substitute region name)
- Mission card footer (incomplete): "Tap to begin"
- Mission card footer (complete): "Stamped" (+ star glyph if earned)
- Empty Log: "No discoveries yet. Complete a mission to fill your log."

### Mission prompts (locate/landmark shown verbatim from §3.4)
- Locate generic helper under prompt: "Tap a country on the map."
- Landmark card structure: [Landmark name] / [blurb] / "Find the country where it stands." (route/compare variants below)
- Compare card structure: "Which country has more people?" / "Which country is bigger?" + two named cards "Tap one."
- Route card structure: "Follow [route name]." / "Tap each country in order." + ordered waypoint list with index numbers.

### Warmer / colder + miss copy
- First wrong, far: "Far off. Try a different part of the map."
- First wrong, mid: "Getting there. Move toward your target."
- First wrong, close: "Close. Try a country nearby."
- Warmer (vs prior): "Warmer."
- Colder (vs prior): "Colder."
- Still warm: "Still warm. Look close by."
- Still cold: "Still cold. Try another region."
- Miss 2 zoom: "Zooming in to help."
- Reveal (miss 3, dignified, no scolding): "Here it is. [Country]. [One fact]." e.g. "Here it is. Ecuador. The cacao tree grows here."

### Route copy
- Out-of-order: "The route goes through [correct next country] first."
- After correct waypoint (not last): "[Country]. Next stop." (kept short)
- Route complete (pre-stamp): "Route traced. [Route name] complete."

### Compare copy
- Reveal line (always shows both numbers): "[Winner], [value]. [Other], [value]." e.g. "Nigeria, 224 million. Kenya, 53 million."
- Sub-line on correct first tap: "You called it."
- Sub-line on wrong first tap: "Now you know."

### Stamp / completion
- Stamp micro-label (star earned): "First-try star"
- Stamp micro-label (no star): "Stamp earned"
- Fact attribution under stamp: the §3.4 star fact, with SpeakButton.

### Passport / Log / badges
- Passport header: "Passport · [N] stamps"
- Region page header: region name + "[x] of 6"
- Cover picker header: "Passport cover"
- Cover locked label: "Unlocks at [N] stamps"
- Badge locked label: "Locked"
- Log header: "Explorer Log · [N] discoveries"
- Log entry: the fact text + SpeakButton + small region tag.

### Settings
- Header: "Settings"
- Sound toggle: "Sound" (on/off)
- Text size: "Text size" (Standard / Large)
- Reset: "Reset this profile" / confirm: "This clears [Name]'s stamps and log. Continue?" / buttons "Reset" / "Keep"

### Profiles
- Picker header: "Who's exploring?"
- Three monogram discs: P (Player One), P (Player Two), G (Guest). No subtitle copy.

### Errors / edge
- ErrorBoundary fallback: "Something went sideways. You can reset this profile's save to continue." + button "Reset this profile's save"

## 6. Achievements & Cosmetics

### Badges (6)
| Name | Criteria | Description (shown on badge) |
|---|---|---|
| First Stamp | Complete any 1 mission | "Your passport's first mark." |
| Trailblazer | First-try star on any locate or landmark mission | "Found it on the first tap." |
| Route Master | Complete all 3 route missions | "Traced every great route." |
| Continental | Complete all 6 missions in any one region | "Cleared a whole region." |
| Fact Reader | Use the SpeakButton on 10 different Log facts | "Listened to ten discoveries." |
| Globetrotter | Complete all 18 missions | "Stamped the whole world." |

(Fact Reader counter persists in save; increments only on distinct fact ids read aloud. Trailblazer fires the first time any star is earned.)

### Cosmetic passport covers (5)
| Name | Unlock | Visual (CSS/SVG) |
|---|---|---|
| Voyager (Oxblood) | default | Oxblood `#6e2f2a` leatherette texture (subtle CSS noise), gold foil compass-rose emboss centered, "WORLD EXPLORER" arced in gold serif (Fraunces), corner foil ticks. |
| Field Linen (Sand) | 3 stamps | Sand `#cdbb9c` woven-linen pattern (CSS repeating-linear gradients), debossed globe-meridians motif, brown thread-stitch border. |
| Deep Sea (Navy) | 8 stamps | Navy `#1b2a44`, foil constellation + a single foil sailing ship silhouette, subtle radial vignette like deep water. |
| Summit (Forest) | 13 stamps | Forest `#244033`, embossed mountain-range silhouette across the lower third, gold sun-disc, pine-grain texture. |
| Aurora (Foil) | 18 stamps (all) | Near-black `#11161d` with an animated subtle aurora sheen (slow CSS gradient drift, paused under reduced-motion), full gold foil compass rose + 18 tiny foil stars ringing the edge; the prestige cover. |

All covers are pure CSS/SVG variables applied to the passport book component; switching covers is instant and persisted per profile.

## 7. Early-Reader Path (6-year-old, pre-reading)

Goal: the early reader completes locate and landmark missions with little or no reading. Mechanisms:
1. **Auto-narration touchpoint, gesture-gated.** Every mission overlay shows a large `SpeakButton` (lucide `Volume2`, 48px, top-right of the card) that reads the full prompt aloud. It is the most prominent control on the card. (Cannot auto-play per iOS gesture rule, but it is impossible to miss.)
2. **Icon-led boarding passes.** Each mission card carries a type icon so the GOAL is legible without reading: locate = a map-pin glyph; landmark = the landmark's SVG silhouette (huge, fills the card: a pyramid, a tower, a wall); route = a dotted-line glyph; compare = a balance-scale glyph. For landmark missions, the silhouette IS the prompt; the early reader matches picture-to-place.
3. **Signature-emoji-free visual cue on facts.** Each locate prompt pairs the text with its signature icon where one exists (cacao pod for chocolate, a coffee bean for coffee, a kangaroo silhouette) as a small SVG beside the prompt, a picture hint, not decoration.
4. **Warmer/colder is non-verbal-first.** The amber/blue vignette breaths and the warmth meter chip (a small thermometer filling hot/cold) communicate direction with COLOR and MOTION before any word is read; copy is secondary. The early reader can play the whole locate loop on color feedback alone.
5. **Auto-zoom safety net.** After 2 misses the continent zoom shrinks the search space to a handful of large shapes; after 3 the answer pulses and TTS can read the one-line reveal. The early reader is structurally unable to get stuck.
6. **Big targets only for the unread path.** Region 1's locate/landmark answers (ECU, BRA, PER, MEX) are all large or continent-zoomed; no pixel-hunting.
7. **Compare for the early reader.** Compare cards show the two country shapes + names; the SpeakButton reads "Which has more people?" and each card name. Tapping either flips to numbers; the bigger number's card is ringed gold, a size/visual judgment, readable as "the gold one won."

The Settings "Text size: Large" affects prompt/card/Log type (not the map), for the early reader and far-sighted adults.

## 8. Open Questions for the Director (5)

1. **Region naming on stamps.** Stamps arc "THE AMERICAS / EUROPE & AFRICA / ASIA & OCEANIA" while tabs read "Americas / Europe & Africa / Asia & Oceania." Keep the stamp "THE AMERICAS" flourish, or match tabs exactly? (I prefer the flourish; it reads more like a real passport stamp.)
2. **Two synthesized landmarks.** To keep every landmark inside the 45-set and dodge cross-border claims, two of the 24 are "place-type" rather than single iconic buildings: **Ha Long Bay (VNM)** (limestone-karst silhouette) and **Riyadh Towers (SAU)** (a notched-top desert skyline). Confirm both read clearly as SVG silhouettes, or swap for a more iconic alternative (e.g. Borobudur/IDN, Forbidden City/CHN). Flagged because they are the two least-recognizable silhouettes in the set.
3. **South Africa capital fact.** I list `capital: "Pretoria"` and use the "three capital cities" line as the interesting fact. Acceptable, or would you rather the capital field read "Pretoria (one of three)"? (Data-model `capital` is a single string; I kept it clean.)
4. **Compare star generosity.** Compare star = first card correct. With 53x-margin pairs (India vs Australia), the star is nearly free for an 8-year-old and a coin-flip for a pre-reader. Keep as-is (rewards intuition), or should compare missions never grant a star (stamp only) to preserve star scarcity?
5. **Signature picture-hints scope.** I propose small SVG signature icons beside locate prompts (cacao, coffee bean, kangaroo) for the early reader. These are extra SVG art for the engineer. Ship all where they exist, or limit to the four Region-1 locate prompts to cap art scope?
