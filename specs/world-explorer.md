# World Explorer — App Spec (port 5184)

> Read `PLAN.md` and `specs/shared-design.md` first; both are binding. This spec adds the app contract. The GDD (`specs/gdd/world-explorer-gdd.md`) finalizes content, tuning, and copy within these rails.

**Fantasy:** a premium atlas/expedition app — Google Earth meets a beautiful travel journal. The kid is an explorer earning passport stamps by completing missions. Linen-textured map, gold route lines, boarding-pass mission cards, a passport book that fills up. Zero cartoon clipart.

## Aesthetic tokens
bg ink `#0f1419` · map land `#22303c` (visited tint `#2c3e4d`, highlight `#3ba99f`) · water `#0b1016` · route gold `#d4a843` · paper cards `#f4efe6` · text `#e6e3dc`. Display `@fontsource/fraunces` (titles, stamps), body Inter. Motifs: passport book + region-styled stamps, boarding-pass mission cards (perforation edge), compass rose, dotted travel lines that draw themselves. Atmosphere: faint linen texture over the map, soft vignette, stamp set-pieces with ink spread.

## Map contract (binding)
- Data: `world-atlas@2` `countries-110m.json` imported statically (bundled, offline), parsed with `topojson-client` → GeoJSON features keyed by ISO numeric id (`feature.id`).
- Projection: `geoNaturalEarth1` fitted to the viewport for world view; per-continent zoom via `fitExtent` against the continent's feature collection (precomputed bounds fine). Smooth zoom = CSS/SVG transform transition on the map group (200ms; this is a micro-interaction, not a set-piece).
- Rendering: one SVG `<path>` per country (d3 `geoPath`), pointer handlers per path, classes for states: default / hover (desktop only) / selected / correct-flash / wrong-shake / visited.
- Hit reliability: mission answers must be visually findable — when a mission targets a small country, the mission auto-zooms to its continent BEFORE accepting answers. Minimum on-screen target ~44px; if a target country renders smaller, zoom tighter (GDD picks targets mindful of this; engineer enforces the zoom rule).
- `src/game/geo.ts`: pure helpers — `centroidOf(iso3)`, `distanceBetween(iso3, iso3)` (d3 `geoDistance`), continent lookup. Unit-testable without DOM.

## Data model (binding shapes)
```ts
interface Country { iso3: string; isoN3: string; name: string; capital: string;
  continent: "north-america"|"south-america"|"europe"|"africa"|"asia"|"oceania";
  region: "americas"|"europe-africa"|"asia-oceania";
  facts: string[];            // 2–3 canonical, kid-readable facts
  signature: string;          // famous food/export/animal — one phrase
  population: number; areaKm2: number; }                 // approximate, for compare missions
interface Landmark { id: string; name: string; countryIso3: string; blurb: string; }
interface Route { id: string; name: string; waypoints: string[]; blurb: string; }  // iso3[], ordered
type Mission =
  | { id: string; type: "locate";   region: Region; prompt: string; answerIso3: string }
  | { id: string; type: "landmark"; region: Region; landmarkId: string }
  | { id: string; type: "route";    region: Region; routeId: string }
  | { id: string; type: "compare";  region: Region; metric: "population"|"areaKm2"; aIso3: string; bIso3: string };
```
Compare answers are DERIVED from stored values (never hardcoded separately). All facts/figures: canonical, verifiable basics only — capitals, famous landmarks, origins ("chocolate's cacao tree is native to the Amazon"), approximate population/area. No invented statistics; population/area rounded values from common reference (a Haiku fact-checker audits `data/` before ship).

## Mission flows (binding)
- **Locate:** prompt card ("Find where chocolate began") → tap a country. Wrong tap → warmer/colder feedback via centroid distance vs previous guess + wrong-shake; after 2 misses auto-zoom to the answer's continent; after 3rd miss reveal with neutral copy ("Here it is — Ecuador. The cacao tree grows here.") and stamp WITHOUT the first-try star. Correct → stamp set-piece.
- **Landmark:** landmark card (name + blurb, SpeakButton — v1 renders a stylized SVG silhouette or monogram disc, NOT sourced photos) → locate its country on the map (same warmer/colder rules).
- **Route:** waypoints listed on a boarding card → tap countries IN ORDER; out-of-order tap → gentle bounce + "The route goes through __ first." Completed route draws the gold dotted line animating across the map.
- **Compare:** two country cards + question ("Which has more people?") → tap a card → both flip showing the real numbers with the winner highlighted ("Brazil — 214 million. Peru — 34 million."). Numbers always shown after answer = the learning moment.
- Every completed mission: passport **stamp set-piece** (thunk + ink spread + page tilt + `sfx.stamp()`), fact(s) added to Explorer Log.

## Progression
3 region sets: americas → europe-africa → asia-oceania; 6 missions each (18 v1). Region N+1 unlocks at ≥4 missions complete in region N. Stars: first-try = star (compare: correct = star); stamps always earned on completion. Passport book shows stamps by region; Explorer Log lists discovered facts (each with SpeakButton). Cosmetics: 4–6 passport covers unlocked by stamps collected. Badges (~6, GDD finalizes): first stamp, full region, route master, fact reader, etc.

## Screens
ProfilePicker → Atlas (world map + region tabs + mission tray of boarding-pass cards) → Mission overlay (card + map interaction) → Stamp set-piece → Passport (stamp pages, covers, badges) → Explorer Log → Settings (mute / text size / reset profile).

## Required tests (Vitest)
1. Data integrity: every mission/landmark/route reference resolves; every `isoN3` exists in the bundled topojson; every route waypoint exists in `data/` countries.
2. Compare correctness: derived answer matches stored values for all compare missions.
3. Unlock logic: region gating at the ≥4 threshold.
4. `geo.ts`: centroid/distance sanity (Paris-country nearer to Germany than to Australia, etc.).
5. Warmer/colder classifier: monotonic with distance.

## Acceptance checklist (QA runs this verbatim)
1. Loads clean (zero console errors). 2. Map renders (>100 country paths in DOM). 3. Continent zoom transition works. 4. Locate mission 1: wrong tap → warmer/colder + shake; right tap → stamp set-piece with sound. 5. Route mission enforces waypoint order; completed route draws gold line. 6. Compare mission flips cards and shows real numbers; correct answer scores star. 7. Passport shows earned stamps after reload. 8. SpeakButton on facts works (`speechSynthesis.speaking` truthy). 9. Region 2 locked until region 1 has ≥4 complete. 10. First win ≤2 min. 11. Mute persists. 12. Manifest + icons present. 13. Aesthetic pass (linen texture, stamp quality, boarding-pass cards — would a kid screenshot it?).

## GDD must decide (designer scope)
The 45 countries (spread across regions, mix of sizes but tap-findable), 24 landmarks, 6 routes (storied ones: Silk Road, spice route, Pan-American...), all 18 mission prompts + exact facts (canonical only, kid-phrased), star/stamp economy, stamp + passport-cover designs (described for SVG), badge list, full copy deck, set-piece storyboard.
