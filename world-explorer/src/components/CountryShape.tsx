import { useMemo } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { ISO3_TO_ISON3 } from "../data/countries";
import { FEATURE_BY_ISON3 } from "../data/atlas";
import { sharedScaleShapes } from "../game/compare";

// A compare card's real country silhouette. Reuses the bundled topojson geometry
// (same source as the map), so each card shows its TRUE shape.
//
// Fix 1 — TRUE relative scale: in a compare pair, pass the OTHER country as
// `peerIso3`. Both countries are then projected at ONE shared scale (the larger
// fits the box; the smaller renders at the same scale) so on-screen size is
// geographically true — Canada renders decisively larger than Mexico, never the
// reverse. A tiny country is floored to a minimum visible size and, when that
// floor engages, the card shows a small "not to scale" note (honesty first).
//
// Without `peerIso3` (e.g. a lone silhouette) the country fits its own box as before.
const BOX_W = 100;
const BOX_H = 76;
const PAD = 6;

export function CountryShape({
  iso3,
  peerIso3,
  title,
}: {
  iso3: string;
  peerIso3?: string;
  title?: string;
}) {
  const { d, notToScale } = useMemo(() => {
    if (peerIso3) {
      // Shared-scale path so the two cards read at true relative size.
      const res = sharedScaleShapes(iso3, peerIso3, BOX_W, BOX_H, PAD);
      const shape = res.byIso3[iso3];
      return { d: shape?.path ?? "", notToScale: !!shape?.floored };
    }
    // Solo: fit this country to its own box.
    const isoN3 = ISO3_TO_ISON3[iso3];
    const feature = isoN3 ? FEATURE_BY_ISON3[isoN3] : undefined;
    if (!feature) return { d: "", notToScale: false };
    const projection = geoMercator().fitExtent(
      [
        [PAD, PAD],
        [BOX_W - PAD, BOX_H - PAD],
      ],
      feature as never,
    );
    return { d: geoPath(projection)(feature as never) ?? "", notToScale: false };
  }, [iso3, peerIso3]);

  return (
    <span className="ccard__shape-wrap">
      <svg
        viewBox={`0 0 ${BOX_W} ${BOX_H}`}
        className="ccard__shape"
        role={title ? "img" : "presentation"}
        aria-label={title}
        fill="currentColor"
      >
        {d ? <path d={d} /> : null}
      </svg>
      {notToScale && (
        <span className="ccard__scale-note" aria-label="not drawn to scale">
          not to scale
        </span>
      )}
    </span>
  );
}
