import { geoMercator, geoPath } from "d3-geo";
import { COUNTRY_BY_ISO3, ISO3_TO_ISON3 } from "../data/countries";
import { FEATURE_BY_ISON3 } from "../data/atlas";
import type { CompareMetric } from "../data/types";

// Compare answers are DERIVED from stored population/areaKm2 — never hardcoded.
// Unit-tested by src/game/compare.test.ts against every compare mission.

export function metricValue(iso3: string, metric: CompareMetric): number {
  const c = COUNTRY_BY_ISO3[iso3];
  if (!c) return 0;
  return metric === "population" ? c.population : c.areaKm2;
}

/** iso3 of the country with the larger metric value (the correct answer). */
export function compareWinner(aIso3: string, bIso3: string, metric: CompareMetric): string {
  return metricValue(aIso3, metric) >= metricValue(bIso3, metric) ? aIso3 : bIso3;
}

/** The "winner is ___" verb for the metric (area → bigger, population → more people). */
export function comparativeWord(metric: CompareMetric): string {
  return metric === "population" ? "has more people" : "is bigger";
}

/**
 * Display value for a compare reveal (GDD §5):
 *   population → "224 million" / "1.4 billion"
 *   areaKm2    → "about 10 million km²" / "about 2 million km²"
 */
export function formatMetric(iso3: string, metric: CompareMetric): string {
  const v = metricValue(iso3, metric);
  if (metric === "population") {
    if (v >= 1000) return `${(v / 1000).toFixed(1)} billion`;
    return `${v} million`;
  }
  // area in km², stored as a rounded count — express in "about N million km²".
  const millions = v / 1_000_000;
  if (millions >= 1) {
    const rounded = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return `about ${rounded} million km²`;
  }
  const thousands = Math.round(v / 1000);
  return `about ${thousands} thousand km²`;
}

// ── Shared-scale compare silhouettes (Fix 1) ─────────────────────────────────
// The two compare cards must show the countries at their TRUE relative size: the
// larger country is fitted to the card box, and the smaller is rendered at the
// SAME projection scale (so Canada reads decisively bigger than Mexico — never the
// other way around). A tiny country is floored to a minimum visible fraction of
// the box and flagged `notToScale` (honesty first). Pure d3-geo math, no DOM, so
// it is unit-testable (compare.test.ts).

export interface ShapeRender {
  /** SVG path string for the country, centered in a box of `boxW × boxH`. */
  path: string;
  /** Rendered bounding-box width in box units (after shared scale + any floor). */
  width: number;
  /** Rendered bounding-box height in box units. */
  height: number;
  /** True when this shape was floored up off the true scale to stay visible. */
  floored: boolean;
}

export interface SharedScaleResult {
  byIso3: Record<string, ShapeRender>;
  /** True when ANY shape engaged the minimum-size floor (show "not to scale"). */
  notToScale: boolean;
}

function featureOf(iso3: string) {
  const isoN3 = ISO3_TO_ISON3[iso3];
  return isoN3 ? FEATURE_BY_ISON3[isoN3] : undefined;
}

/**
 * Project two countries into a shared box at a SINGLE shared scale.
 * @param isoA / isoB   the two compare countries (order irrelevant)
 * @param boxW / boxH   the card box in SVG user units
 * @param pad           inner padding so the larger country never touches the edge
 * @param minFraction   floor: a shape whose larger dimension drops below this
 *                      fraction of the box's larger dimension is scaled up to it
 *                      and flagged `floored` (default ~15%)
 *
 * Geographic truth: the larger country is fitted to the padded box, and that
 * exact projection scale is reused for the smaller — so on-screen extent ratio
 * equals the real linear (√area) ratio, up to the optional floor.
 */
export function sharedScaleShapes(
  isoA: string,
  isoB: string,
  boxW: number,
  boxH: number,
  pad: number,
  minFraction = 0.15,
): SharedScaleResult {
  const fA = featureOf(isoA);
  const fB = featureOf(isoB);
  const byIso3: Record<string, ShapeRender> = {};
  if (!fA || !fB) {
    if (fA) byIso3[isoA] = soloShape(isoA, fA, boxW, boxH, pad);
    if (fB) byIso3[isoB] = soloShape(isoB, fB, boxW, boxH, pad);
    return { byIso3, notToScale: false };
  }

  const innerW = boxW - 2 * pad;
  const innerH = boxH - 2 * pad;

  // 1) Fit the projection to the country with the larger projected extent — that
  //    sets the SHARED scale. Use a unit projection to measure each country's
  //    projected size, then pick the bigger to fit.
  const larger = projectedSpan(fA) >= projectedSpan(fB) ? fA : fB;

  const fitted = geoMercator().fitExtent(
    [
      [pad, pad],
      [boxW - pad, boxH - pad],
    ],
    larger as never,
  );
  const sharedScale = fitted.scale();

  // 2) Render a feature at a given scale, re-centered into the box by its PROJECTED
  //    bounds (robust to Mercator latitude distortion — the centroid in lon/lat is
  //    not the center of the projected box, so we translate by bounds instead).
  const renderAtScale = (feature: unknown, scale: number, floored: boolean): ShapeRender => {
    const base = geoMercator().scale(scale).translate([0, 0]);
    const [[bx0, by0], [bx1, by1]] = geoPath(base).bounds(feature as never);
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const proj = geoMercator().scale(scale).translate([boxW / 2 - cx, boxH / 2 - cy]);
    const path = geoPath(proj)(feature as never) ?? "";
    return { path, width: bx1 - bx0, height: by1 - by0, floored };
  };

  // 3) Floor: render at the shared scale; if a shape's larger dimension is below
  //    minFraction of the box's larger dimension, scale that ONE shape up to the
  //    floor and flag it (honesty first — caller shows a "not to scale" note).
  const boxMax = Math.max(innerW, innerH);
  const floorPx = boxMax * minFraction;
  let notToScale = false;

  const shapeFor = (feature: unknown): ShapeRender => {
    const r = renderAtScale(feature, sharedScale, false);
    const dim = Math.max(r.width, r.height);
    if (dim > 0 && dim < floorPx) {
      notToScale = true;
      return renderAtScale(feature, sharedScale * (floorPx / dim), true);
    }
    return r;
  };

  byIso3[isoA] = shapeFor(fA);
  byIso3[isoB] = shapeFor(fB);
  return { byIso3, notToScale };
}

/**
 * The larger-dimension span the feature occupies in a unit-scale Mercator. Used to
 * decide which country projects bigger on the page, so the shared scale is set by
 * the one that genuinely renders larger (Mercator can outrank stored km² near the
 * poles — Canada vs Mexico still resolves correctly because Canada also projects
 * the larger span). Pure: no DOM.
 */
function projectedSpan(feature: unknown): number {
  const proj = geoMercator().scale(1).translate([0, 0]);
  const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(feature as never);
  return Math.max(x1 - x0, y1 - y0);
}

function soloShape(
  iso3: string,
  feature: unknown,
  boxW: number,
  boxH: number,
  pad: number,
): ShapeRender {
  const proj = geoMercator().fitExtent(
    [
      [pad, pad],
      [boxW - pad, boxH - pad],
    ],
    feature as never,
  );
  const path = geoPath(proj)(feature as never) ?? "";
  const [[x0, y0], [x1, y1]] = geoPath(proj).bounds(feature as never);
  void iso3;
  return { path, width: x1 - x0, height: y1 - y0, floored: false };
}
