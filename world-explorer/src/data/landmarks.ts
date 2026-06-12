import type { Landmark } from "./types";

// The 24 landmarks — transcribed from world-explorer-gdd.md §3.2.
//
// DIRECTOR AMENDMENT (applied here, NOT in the GDD file):
//   "Riyadh Towers (SAU)" is REPLACED with "Borobudur (IDN)".
//   IDN (isoN3 360) is present in the bundled world-atlas 110m set, so the
//   primary replacement is used (the Forbidden City / CHN fallback is not needed).
//   No mission referenced lm-desert-towers, so no mission re-point was required
//   (the two landmark missions per region use Eiffel/Pyramids and Great Wall/Taj).
export const LANDMARKS: Landmark[] = [
  {
    id: "lm-statue-liberty",
    name: "Statue of Liberty",
    countryIso3: "USA",
    blurb: "A giant copper statue holding a torch in New York harbor.",
  },
  {
    id: "lm-grand-canyon",
    name: "Grand Canyon",
    countryIso3: "USA",
    blurb: "A canyon so wide and deep a river carved it over ages.",
  },
  {
    id: "lm-chichen-itza",
    name: "Chichén Itzá",
    countryIso3: "MEX",
    blurb: "A stepped stone pyramid built by the Maya.",
  },
  {
    id: "lm-tikal",
    name: "Tikal",
    countryIso3: "GTM",
    blurb: "A tall Maya temple rising out of the rainforest.",
  },
  {
    id: "lm-machu-picchu",
    name: "Machu Picchu",
    countryIso3: "PER",
    blurb: "An Inca city of stone high in the mountains.",
  },
  {
    id: "lm-christ-redeemer",
    name: "Christ the Redeemer",
    countryIso3: "BRA",
    blurb: "A huge statue with open arms above Rio de Janeiro.",
  },
  {
    id: "lm-angel-falls",
    name: "Angel Falls",
    countryIso3: "VEN",
    blurb: "The tallest waterfall on Earth, dropping off a flat-topped mountain.",
  },
  {
    id: "lm-salar-uyuni",
    name: "Uyuni Salt Flat",
    countryIso3: "BOL",
    blurb: "A flat white desert of salt that mirrors the sky.",
  },
  {
    id: "lm-eiffel-tower",
    name: "Eiffel Tower",
    countryIso3: "FRA",
    blurb: "An iron tower built in Paris over a hundred years ago.",
  },
  {
    id: "lm-big-ben",
    name: "Big Ben",
    countryIso3: "GBR",
    blurb: "A famous clock tower beside the river in London.",
  },
  {
    id: "lm-colosseum",
    name: "Colosseum",
    countryIso3: "ITA",
    blurb: "A giant round stone arena from ancient Rome.",
  },
  {
    id: "lm-parthenon",
    name: "Parthenon",
    countryIso3: "GRC",
    blurb: "A marble temple on a hill above Athens.",
  },
  {
    id: "lm-sagrada",
    name: "Sagrada Família",
    countryIso3: "ESP",
    blurb: "A tall, spiky church in Barcelona still being built.",
  },
  {
    id: "lm-pyramids-giza",
    name: "Pyramids of Giza",
    countryIso3: "EGY",
    blurb: "Three enormous pyramids built as royal tombs.",
  },
  {
    id: "lm-kilimanjaro",
    name: "Mount Kilimanjaro",
    countryIso3: "TZA",
    blurb: "The tallest mountain in Africa, with snow on top.",
  },
  {
    id: "lm-table-mountain",
    name: "Table Mountain",
    countryIso3: "ZAF",
    blurb: "A mountain with a flat top like a tabletop, above Cape Town.",
  },
  {
    id: "lm-great-wall",
    name: "Great Wall",
    countryIso3: "CHN",
    blurb: "A stone wall that snakes for thousands of miles.",
  },
  {
    id: "lm-taj-mahal",
    name: "Taj Mahal",
    countryIso3: "IND",
    blurb: "A white marble palace built as a memorial.",
  },
  {
    id: "lm-mount-fuji",
    name: "Mount Fuji",
    countryIso3: "JPN",
    blurb: "A snow-capped volcano shaped like a perfect cone.",
  },
  {
    id: "lm-ha-long",
    name: "Ha Long Bay",
    countryIso3: "VNM",
    blurb: "A green bay full of tall limestone islands.",
  },
  {
    id: "lm-grand-palace",
    name: "Grand Palace",
    countryIso3: "THA",
    blurb: "A glittering golden palace in Bangkok.",
  },
  {
    // ── Director amendment: was lm-desert-towers / Riyadh Towers / SAU ──
    id: "lm-borobudur",
    name: "Borobudur",
    countryIso3: "IDN",
    blurb: "A stone temple mountain built 1,200 years ago, with over 500 Buddha statues carved in stone.",
  },
  {
    id: "lm-opera-house",
    name: "Sydney Opera House",
    countryIso3: "AUS",
    blurb: "A building with white sail-shaped roofs by the harbor.",
  },
  {
    id: "lm-uluru",
    name: "Uluru",
    countryIso3: "AUS",
    blurb: "A massive red rock rising from the flat outback.",
  },
];

export const LANDMARK_BY_ID: Record<string, Landmark> = Object.fromEntries(
  LANDMARKS.map((l) => [l.id, l]),
);
