import { geoCentroid, geoDistance, geoNaturalEarth1, geoPath } from "d3-geo";
import { COUNTRY_FEATURES, FEATURE_BY_ISON3, featureIsoN3 } from "../data/atlas";
import { ISO3_TO_ISON3, ISON3_TO_ISO3, COUNTRY_BY_ISO3 } from "../data/countries";
import type { Continent } from "../data/types";

// Pure geo helpers (no DOM). Unit-tested by src/game/geo.test.ts.
// Coordinates are [lon, lat] degrees throughout (GeoJSON convention).

export type LonLat = [number, number];

/** Great-circle centroid of a country, by iso3, as [lon, lat] degrees. */
export function centroidOf(iso3: string): LonLat {
  const isoN3 = ISO3_TO_ISON3[iso3];
  const f = isoN3 ? FEATURE_BY_ISON3[isoN3] : undefined;
  if (!f) return [0, 0];
  const c = geoCentroid(f);
  return [c[0], c[1]];
}

/** Great-circle distance between two countries' centroids, in radians (d3.geoDistance). */
export function distanceBetween(aIso3: string, bIso3: string): number {
  return geoDistance(centroidOf(aIso3), centroidOf(bIso3));
}

/** Continent a country belongs to (from the country table). */
export function continentOf(iso3: string): Continent | undefined {
  return COUNTRY_BY_ISO3[iso3]?.continent;
}

// ── Warmer / colder classifier (GDD §2 thresholds) ─────────────────────────
// Tuned bands; the only HARD test requirement is monotonic-with-distance.
export const HEAT_DELTA = 0.05; // rad — "meaningfully closer/farther" than prior
export const WARM_ZONE = 0.6; // rad — absolute "same-neighborhood" band

export type HeatState =
  | "correct"
  | "warmer"
  | "colder"
  | "still-warm"
  | "still-cold"
  | "first-close"
  | "first-mid"
  | "first-far";

/**
 * Classify a tap.
 * @param tappedIso3 the country tapped
 * @param answerIso3 the mission answer
 * @param priorIso3  the previous WRONG tap (undefined on the first wrong tap)
 *
 * Monotonic guarantee (tested): for a fixed answer + prior, a tap whose distance
 * is smaller never returns a "colder" verdict than a tap whose distance is larger.
 */
export function classifyHeat(
  tappedIso3: string,
  answerIso3: string,
  priorIso3?: string,
): HeatState {
  if (tappedIso3 === answerIso3) return "correct";

  const dist = distanceBetween(tappedIso3, answerIso3);

  if (priorIso3 === undefined || priorIso3 === answerIso3) {
    // First wrong tap — absolute bands.
    if (dist < 0.35) return "first-close";
    if (dist <= 0.9) return "first-mid";
    return "first-far";
  }

  const prior = distanceBetween(priorIso3, answerIso3);
  if (dist < prior - HEAT_DELTA) return "warmer";
  if (dist > prior + HEAT_DELTA) return "colder";
  // Within ±HEAT_DELTA of prior → "same heat", split by absolute warm zone.
  return dist <= WARM_ZONE ? "still-warm" : "still-cold";
}

/** True when a heat state means "you are in the warm half of the map". */
export function isWarmHalf(state: HeatState): boolean {
  return state === "correct" || state === "warmer" || state === "still-warm" || state === "first-close";
}

// ── Small-target zoom guard ──────────────────────────────────────────────────
// Coordinate space matches WorldMap.tsx (W=960, H=500).
const PROJ_W = 960;
const PROJ_H = 500;
const MIN_TARGET_PX = 44; // spec: answer's LARGER dimension must render ≥44px
const MIN_MINOR_PX = 24; // a thin sliver (e.g. Chile) can be tall yet only ~8px wide

/**
 * Decide whether a target rendered at `renderedW × renderedH` px is too small to
 * tap comfortably — and therefore needs a continent zoom. A target is too small
 * when EITHER its larger dimension < 44px (genuinely tiny country) OR its MINOR
 * dimension < 24px (a thin country like Chile: huge height, sliver width).
 * Pure + unit-tested (geo.test.ts) so the rule can be checked without a DOM.
 */
export function isSmallTarget(renderedW: number, renderedH: number): boolean {
  const larger = Math.max(renderedW, renderedH);
  const minor = Math.min(renderedW, renderedH);
  return larger < MIN_TARGET_PX || minor < MIN_MINOR_PX;
}

/**
 * Returns true when the answer country's bounding-box (larger dimension) at the
 * given region continents view would fall below MIN_TARGET_PX.
 * Uses the same NaturalEarth1 projection + fitExtent logic as WorldMap.tsx.
 */
export function needsContinentZoom(
  answerIso3: string,
  regionContinents: Continent[],
): boolean {
  // Build the region feature collection (same filter as WorldMap transform).
  const wantedCont = new Set(regionContinents);
  const regionFeatures = COUNTRY_FEATURES.filter((f) => {
    const iso3 = ISON3_TO_ISO3[featureIsoN3(f)];
    const cont = COUNTRY_BY_ISO3[iso3]?.continent;
    return cont ? wantedCont.has(cont) : false;
  });
  if (!regionFeatures.length) return false;

  // Base projection fitted to whole world (matches WorldMap useMemo).
  const baseProj = geoNaturalEarth1().fitExtent(
    [[0, 0], [PROJ_W, PROJ_H]],
    { type: "FeatureCollection", features: COUNTRY_FEATURES } as never,
  );

  // Compute the region zoom transform (same math as WorldMap transform useMemo).
  const basePath = geoPath(baseProj);
  const [[rx0, ry0], [rx1, ry1]] = basePath.bounds({
    type: "FeatureCollection",
    features: regionFeatures,
  } as never);
  const bw = rx1 - rx0;
  const bh = ry1 - ry0;
  if (bw <= 0 || bh <= 0) return false;

  const pad = 0.16;
  const scale = Math.max(1, Math.min(
    Math.min(PROJ_W / (bw * (1 + pad)), PROJ_H / (bh * (1 + pad))),
    6,
  ));

  // Find the answer country feature.
  const isoN3 = ISO3_TO_ISON3[answerIso3];
  const answerFeature = isoN3 ? FEATURE_BY_ISON3[isoN3] : undefined;
  if (!answerFeature) return false;

  // Bounds of the answer country in base projection coords.
  const [[ax0, ay0], [ax1, ay1]] = basePath.bounds(answerFeature as never);
  // Apply region scale to get rendered pixel dimensions.
  const renderedW = (ax1 - ax0) * scale;
  const renderedH = (ay1 - ay0) * scale;

  return isSmallTarget(renderedW, renderedH);
}

// Copy for each heat state (GDD §5 copy deck).
export const HEAT_COPY: Record<HeatState, string> = {
  correct: "",
  warmer: "Warmer.",
  colder: "Colder.",
  "still-warm": "Still warm. Look close by.",
  "still-cold": "Still cold. Try another region.",
  "first-close": "Close. Try a country nearby.",
  "first-mid": "Getting there. Move toward your target.",
  "first-far": "Far off. Try a different part of the map.",
};
