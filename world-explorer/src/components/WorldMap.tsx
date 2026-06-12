import { useMemo, useCallback } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { COUNTRY_FEATURES, featureIsoN3, type CountryFeature } from "../data/atlas";
import { ISON3_TO_ISO3, COUNTRY_BY_ISO3 } from "../data/countries";
import type { Continent } from "../data/types";

// Internal projection canvas. The SVG scales responsively; this is the
// coordinate space the projection + zoom math live in.
const W = 960;
const H = 500;

export interface ZoomTarget {
  // Either a set of continents (region/continent zoom) or null (world view).
  continents: Continent[] | null;
  // Optional explicit iso3 set to fit (e.g. a route's waypoints) — takes
  // precedence over `continents` when provided.
  isoFit?: string[];
  padding?: number; // fraction, default 0.12
}

export interface CountryVisualState {
  visited?: boolean;
  correct?: boolean;
  wrong?: boolean;
  bounce?: boolean;
  revealing?: boolean;
  routeOn?: boolean;
  explored?: boolean; // Atlas exploration: currently-selected country highlight
}

export interface RoutePin {
  iso3: string;
}

export function WorldMap({
  zoom,
  states,
  interactive,
  onCountryTap,
  explore,
  onExplore,
  routePins,
  routePath,
}: {
  zoom: ZoomTarget;
  states: Record<string, CountryVisualState>; // keyed by iso3
  interactive: boolean;
  onCountryTap?: (iso3: string) => void;
  // Fix 1: Atlas exploration mode — EVERY country (featured + backdrop) is
  // tappable to surface its name; onExplore carries the resolved display name.
  explore?: boolean;
  onExplore?: (iso3: string, name: string) => void;
  routePins?: RoutePin[];
  routePath?: string[]; // ordered iso3 already-drawn segment endpoints
}) {
  const projection = useMemo(() => {
    return geoNaturalEarth1().fitExtent(
      [
        [0, 0],
        [W, H],
      ],
      { type: "FeatureCollection", features: COUNTRY_FEATURES } as never,
    );
  }, []);

  const path = useMemo(() => geoPath(projection), [projection]);

  // Precompute each country's "d" once.
  const paths = useMemo(() => {
    const out: { iso3: string; isoN3: string; d: string; name: string }[] = [];
    for (const f of COUNTRY_FEATURES) {
      const isoN3 = featureIsoN3(f);
      const iso3 = ISON3_TO_ISO3[isoN3];
      const d = path(f);
      if (!d) continue;
      // Featured countries use our canonical name; backdrop countries fall back
      // to the topojson feature's own name (Fix 1: every country can be labeled).
      const name = COUNTRY_BY_ISO3[iso3]?.name ?? f.properties?.name ?? "";
      out.push({ iso3: iso3 ?? "", isoN3, d, name });
    }
    return out;
  }, [path]);

  // Centroid (projected) per iso3, precomputed once — for route pins/lines.
  const centroidMap = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const f of COUNTRY_FEATURES) {
      const iso3 = ISON3_TO_ISO3[featureIsoN3(f)];
      if (!iso3) continue;
      const c = path.centroid(f as CountryFeature);
      if (Number.isNaN(c[0]) || Number.isNaN(c[1])) continue;
      m.set(iso3, [c[0], c[1]]);
    }
    return m;
  }, [path]);

  const projCentroid = useCallback(
    (iso3: string): [number, number] | null => centroidMap.get(iso3) ?? null,
    [centroidMap],
  );

  // ── Zoom transform (fitExtent-equivalent on the projected bbox) ───────────
  const transform = useMemo(() => {
    const pad = zoom.padding ?? 0.12;
    let fc: { type: "FeatureCollection"; features: CountryFeature[] } | null = null;

    if (zoom.isoFit && zoom.isoFit.length) {
      const wanted = new Set(zoom.isoFit);
      fc = {
        type: "FeatureCollection",
        features: COUNTRY_FEATURES.filter((f) => wanted.has(ISON3_TO_ISO3[featureIsoN3(f)])),
      };
    } else if (zoom.continents && zoom.continents.length) {
      const wantedCont = new Set(zoom.continents);
      fc = {
        type: "FeatureCollection",
        features: COUNTRY_FEATURES.filter((f) => {
          const iso3 = ISON3_TO_ISO3[featureIsoN3(f)];
          const cont = COUNTRY_BY_ISO3[iso3]?.continent;
          return cont ? wantedCont.has(cont) : false;
        }),
      };
    }

    if (!fc || !fc.features.length) return "translate(0px,0px) scale(1)";

    const [[x0, y0], [x1, y1]] = path.bounds(fc as never);
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return "translate(0px,0px) scale(1)";

    const scale = Math.min(W / (bw * (1 + pad)), H / (bh * (1 + pad)));
    const clamped = Math.max(1, Math.min(scale, 6)); // never zoom OUT below world; cap zoom-in
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const tx = W / 2 - clamped * cx;
    const ty = H / 2 - clamped * cy;
    return `translate(${tx.toFixed(2)}px,${ty.toFixed(2)}px) scale(${clamped.toFixed(3)})`;
  }, [zoom, path]);

  // Route polyline path "d" from ordered waypoints (those already drawn).
  const routeLineD = useMemo(() => {
    if (!routePath || routePath.length < 2) return "";
    const pts = routePath.map((iso) => projCentroid(iso)).filter(Boolean) as [number, number][];
    if (pts.length < 2) return "";
    return "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L ");
  }, [routePath, projCentroid]);

  const handleTap = (iso3: string) => {
    if (!interactive || !iso3 || !onCountryTap) return;
    onCountryTap(iso3);
  };

  return (
    <svg
      className="worldmap"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      aria-label="World map"
    >
      <rect x={0} y={0} width={W} height={H} fill="var(--water)" />
      <g className="map-group" style={{ transform }}>
        {paths.map((p, i) => {
          const st = states[p.iso3];
          const inSet = !!COUNTRY_BY_ISO3[p.iso3]; // only our 45 are featured
          // Mission mode: only the 45-set respond. Explore mode (Atlas): everything
          // with a resolvable name responds, so backdrop countries are tappable too.
          const tappable = explore ? !!p.name : inSet && interactive;
          const cls = [
            "country",
            (inSet && interactive) || (explore && p.name) ? "is-interactive" : "",
            st?.visited ? "is-visited" : "",
            st?.explored ? "is-explored" : "",
            st?.correct ? "is-correct" : "",
            st?.wrong ? "is-wrong" : "",
            st?.bounce ? "is-bounce" : "",
            st?.revealing ? "is-revealing" : "",
            st?.routeOn ? "is-route-on" : "",
          ]
            .filter(Boolean)
            .join(" ");
          const onTap = explore
            ? () => onExplore?.(p.iso3, p.name)
            : inSet
              ? () => handleTap(p.iso3)
              : undefined;
          return (
            <g key={p.isoN3 || `bg-${i}`}>
              <path
                className={cls}
                d={p.d}
                data-iso3={p.iso3}
                onPointerUp={onTap}
                role={tappable ? "button" : undefined}
                aria-label={tappable ? p.name : undefined}
              />
              {/* Fix 4: invisible fat-stroke hit-path so thin countries (e.g. Chile)
                  stay tappable without altering the visible map. Non-scaling stroke
                  keeps the hit band a constant ~10px regardless of zoom. */}
              {tappable && (
                <path
                  className="country-hit"
                  d={p.d}
                  data-iso3={p.iso3}
                  onPointerUp={onTap}
                  aria-hidden="true"
                />
              )}
            </g>
          );
        })}

        {/* drawn route segments */}
        {routeLineD && <path className="route-line" d={routeLineD} />}

        {/* route waypoint pins */}
        {routePins?.map((pin) => {
          const c = projCentroid(pin.iso3);
          if (!c) return null;
          return <circle key={pin.iso3} className="route-pin" cx={c[0]} cy={c[1]} r={3.4} />;
        })}
      </g>
    </svg>
  );
}
