// Region hit-mapping for the 3D globe — pure (no three.js, no DOM), so it's
// unit-testable. A raycast on the globe resolves to [lon, lat]; this module
// answers "which country is that?" with the SAME resolution rules the flat
// WorldMap explore mode uses: featured countries carry canonical names,
// backdrop countries fall back to the topojson feature name (iso3 ""), and
// open ocean picks nothing.
import { geoContains } from "d3-geo";
import { COUNTRY_FEATURES, featureIsoN3 } from "../../data/atlas";
import { ISON3_TO_ISO3, COUNTRY_BY_ISO3 } from "../../data/countries";
import type { LonLat } from "../../lib/globe-math";

export interface CountryPick {
  iso3: string; // "" for backdrop countries outside the featured set
  name: string;
}

export function pickCountryAt([lon, lat]: LonLat): CountryPick | null {
  for (const f of COUNTRY_FEATURES) {
    if (!geoContains(f, [lon, lat])) continue;
    const iso3 = ISON3_TO_ISO3[featureIsoN3(f)] ?? "";
    const name = COUNTRY_BY_ISO3[iso3]?.name ?? f.properties?.name ?? "";
    if (!name) return null; // unnamed shard — treat like ocean
    return { iso3, name };
  }
  return null;
}
