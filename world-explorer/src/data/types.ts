// Binding data-model shapes from specs/world-explorer.md §"Data model".
export type Continent =
  | "north-america"
  | "south-america"
  | "europe"
  | "africa"
  | "asia"
  | "oceania";

export type Region = "americas" | "europe-africa" | "asia-oceania";

export interface Country {
  iso3: string;
  isoN3: string; // topojson feature.id (zero-padded string)
  name: string;
  capital: string;
  continent: Continent;
  region: Region;
  facts: string[]; // 2–3 canonical, kid-readable
  signature: string; // famous food/export/animal — one phrase
  population: number; // millions (GDD §3.1 stored values)
  areaKm2: number;
}

export interface Landmark {
  id: string;
  name: string;
  countryIso3: string;
  blurb: string;
}

export interface Route {
  id: string;
  name: string;
  waypoints: string[]; // iso3[], ordered
  blurb: string;
}

export type MissionType = "locate" | "landmark" | "route" | "compare";
export type CompareMetric = "population" | "areaKm2";

export type Mission =
  | { id: string; type: "locate"; region: Region; prompt: string; answerIso3: string; fact: string }
  | { id: string; type: "landmark"; region: Region; landmarkId: string; fact: string }
  | { id: string; type: "route"; region: Region; routeId: string; fact: string }
  | {
      id: string;
      type: "compare";
      region: Region;
      metric: CompareMetric;
      question: string;
      aIso3: string;
      bIso3: string;
      fact: string;
    };

// Region display order + labels (GDD §5 copy deck).
export const REGION_ORDER: Region[] = ["americas", "europe-africa", "asia-oceania"];

export const REGION_LABEL: Record<Region, string> = {
  americas: "Americas",
  "europe-africa": "Europe & Africa",
  "asia-oceania": "Asia & Oceania",
};

// Stamp arc text — the approved "passport flourish" form (Director: keep flourish).
export const REGION_STAMP_ARC: Record<Region, string> = {
  americas: "THE AMERICAS",
  "europe-africa": "EUROPE & AFRICA",
  "asia-oceania": "ASIA & OCEANIA",
};

// Region → continents that belong to it (used by the map for continent zoom).
export const REGION_CONTINENTS: Record<Region, Continent[]> = {
  americas: ["north-america", "south-america"],
  "europe-africa": ["europe", "africa"],
  "asia-oceania": ["asia", "oceania"],
};
