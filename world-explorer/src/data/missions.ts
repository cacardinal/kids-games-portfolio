import type { Mission } from "./types";

// The 18 missions — transcribed from world-explorer-gdd.md §3.4.
// 6 per region, type mix 2 locate / 2 landmark / 1 route / 1 compare.
// `fact` is the "star fact surfaced" appended to the Explorer Log on completion.
// Compare `question` is the §5 copy-deck wording; the winner is DERIVED at
// runtime from the stored population/areaKm2 values (game/compare.ts), never
// hardcoded here.
export const MISSIONS: Mission[] = [
  // ── Region 1: Americas ──────────────────────────────────────────────────
  {
    id: "am-1",
    type: "locate",
    region: "americas",
    prompt: "Find where people first used cacao, over 5,000 years ago.",
    answerIso3: "ECU",
    fact: "The cacao tree grows in Ecuador, on the Equator.",
  },
  {
    id: "am-2",
    type: "locate",
    region: "americas",
    prompt: "Find the largest country in South America.",
    answerIso3: "BRA",
    fact: "The Amazon rainforest covers much of Brazil.",
  },
  {
    id: "am-3",
    type: "landmark",
    region: "americas",
    landmarkId: "lm-machu-picchu",
    fact: "Machu Picchu is an old Inca city in Peru's mountains.",
  },
  {
    id: "am-4",
    type: "landmark",
    region: "americas",
    landmarkId: "lm-chichen-itza",
    fact: "The Maya built stone pyramids in Mexico.",
  },
  {
    id: "am-5",
    type: "route",
    region: "americas",
    routeId: "rt-pan-american",
    fact: "The Pan-American trail runs the length of the Americas.",
  },
  {
    id: "am-6",
    type: "compare",
    region: "americas",
    metric: "areaKm2",
    question: "Which country is bigger?",
    aIso3: "CAN",
    bIso3: "MEX",
    fact: "Canada about 10 million km²; Mexico about 2 million km².",
  },

  // ── Region 2: Europe & Africa ───────────────────────────────────────────
  {
    id: "ef-1",
    type: "locate",
    region: "europe-africa",
    prompt: "Find where coffee was first discovered.",
    answerIso3: "ETH",
    fact: "Coffee was first discovered in Ethiopia.",
  },
  {
    id: "ef-2",
    type: "locate",
    region: "europe-africa",
    prompt: "Find the country with the most people in Africa.",
    answerIso3: "NGA",
    fact: "Nigeria has the most people of any country in Africa.",
  },
  {
    id: "ef-3",
    type: "landmark",
    region: "europe-africa",
    landmarkId: "lm-eiffel-tower",
    fact: "The Eiffel Tower stands in Paris, France.",
  },
  {
    id: "ef-4",
    type: "landmark",
    region: "europe-africa",
    landmarkId: "lm-pyramids-giza",
    fact: "The Great Pyramids were built in Egypt.",
  },
  {
    id: "ef-5",
    type: "route",
    region: "europe-africa",
    routeId: "rt-grand-tour",
    fact: "The Grand Tour visited Europe's great old cities.",
  },
  {
    id: "ef-6",
    type: "compare",
    region: "europe-africa",
    metric: "population",
    question: "Which country has more people?",
    aIso3: "NGA",
    bIso3: "KEN",
    fact: "Nigeria about 224 million; Kenya about 53 million.",
  },

  // ── Region 3: Asia & Oceania ────────────────────────────────────────────
  {
    id: "ao-1",
    type: "locate",
    region: "asia-oceania",
    prompt: "Find the largest country in the world.",
    answerIso3: "RUS",
    fact: "Russia is the largest country on Earth by land.",
  },
  {
    id: "ao-2",
    type: "locate",
    region: "asia-oceania",
    prompt: "Find where kangaroos live in the wild.",
    answerIso3: "AUS",
    fact: "Kangaroos live in the wild in Australia.",
  },
  {
    id: "ao-3",
    type: "landmark",
    region: "asia-oceania",
    landmarkId: "lm-great-wall",
    fact: "The Great Wall stretches across China.",
  },
  {
    id: "ao-4",
    type: "landmark",
    region: "asia-oceania",
    landmarkId: "lm-taj-mahal",
    fact: "The Taj Mahal is a white marble palace in India.",
  },
  {
    id: "ao-5",
    type: "route",
    region: "asia-oceania",
    routeId: "rt-silk-road",
    fact: "The Silk Road carried goods from China toward Europe.",
  },
  {
    id: "ao-6",
    type: "compare",
    region: "asia-oceania",
    metric: "population",
    question: "Which country has more people?",
    aIso3: "IND",
    bIso3: "AUS",
    fact: "India about 1.4 billion; Australia about 27 million.",
  },
];

export const MISSION_BY_ID: Record<string, Mission> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
);

// Missions grouped by region, in authored (frozen) order.
import type { Region } from "./types";
export function missionsForRegion(region: Region): Mission[] {
  return MISSIONS.filter((m) => m.region === region);
}
