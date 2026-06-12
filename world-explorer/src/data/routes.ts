import type { Route } from "./types";

// The 6 storied routes — transcribed from world-explorer-gdd.md §3.3.
// Waypoints are iso3, ordered. Every waypoint sits inside the 45-country set
// (guarded by the data-integrity test).
export const ROUTES: Route[] = [
  {
    id: "rt-silk-road",
    name: "The Silk Road",
    waypoints: ["CHN", "MNG", "KAZ", "RUS", "ITA"],
    blurb: "The old trading path that carried silk and spices from China toward Europe.",
  },
  {
    id: "rt-spice-route",
    name: "The Spice Route",
    waypoints: ["IND", "THA", "VNM", "IDN", "PHL"],
    blurb: "Sailing ships followed these waters to gather pepper, cloves, and nutmeg.",
  },
  {
    id: "rt-pan-american",
    name: "The Pan-American Trail",
    waypoints: ["USA", "MEX", "GTM", "COL", "PER", "CHL"],
    blurb: "A path running the length of the Americas, north to south.",
  },
  {
    id: "rt-incense-nile",
    name: "The Nile & Sahara Path",
    waypoints: ["EGY", "ETH", "KEN", "TZA", "ZAF"],
    blurb: "A journey down Africa, following deserts, rivers, and grasslands.",
  },
  {
    id: "rt-grand-tour",
    name: "The Grand Tour",
    waypoints: ["GBR", "FRA", "ESP", "ITA", "GRC"],
    blurb: "The classic loop young travelers once took to see Europe's great cities.",
  },
  {
    id: "rt-pacific-rim",
    name: "The Pacific Rim",
    waypoints: ["JPN", "KOR", "PHL", "AUS", "NZL"],
    blurb: "Island-hopping down the western edge of the Pacific Ocean.",
  },
];

export const ROUTE_BY_ID: Record<string, Route> = Object.fromEntries(
  ROUTES.map((r) => [r.id, r]),
);
