import { feature } from "topojson-client";
import type {
  Topology,
  GeometryCollection,
  GeometryObject,
} from "topojson-specification";
import type { Feature, Geometry } from "geojson";
import worldRaw from "world-atlas/countries-110m.json";

// Parse the bundled world-atlas 110m topology ONCE into GeoJSON features keyed
// by ISO numeric id (feature.id), per specs/world-explorer.md map contract.
// This module has no DOM dependency, so geo.ts (which imports it) stays unit-testable.

const topo = worldRaw as unknown as Topology<{
  countries: GeometryCollection;
  land: GeometryObject;
}>;

export type CountryFeature = Feature<Geometry, { name?: string }>;

const collection = feature(topo, topo.objects.countries) as unknown as {
  type: "FeatureCollection";
  features: CountryFeature[];
};

export const COUNTRY_FEATURES: CountryFeature[] = collection.features;

// feature.id is number | string in the GeoJSON typings; normalize to a padded
// string so it matches our isoN3 keys ("076", "036", …).
export function featureIsoN3(f: CountryFeature): string {
  const id = f.id;
  if (id === undefined || id === null) return "";
  return String(id).padStart(3, "0");
}

export const FEATURE_BY_ISON3: Record<string, CountryFeature> = Object.fromEntries(
  COUNTRY_FEATURES.map((f) => [featureIsoN3(f), f]),
);

// Set of every numeric id present in the bundled topology — the data-integrity
// test checks every authored isoN3 against this.
export const TOPO_ISON3_SET: Set<string> = new Set(
  COUNTRY_FEATURES.map((f) => featureIsoN3(f)),
);
