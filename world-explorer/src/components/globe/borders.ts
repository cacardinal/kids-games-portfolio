// Country border geometry for the 3D globe — pure lon/lat → sphere-surface
// segment math (no three.js import; the scene wraps the Float32Array in a
// BufferGeometry). Borders come from the same world-atlas topology the flat
// map renders, via topojson mesh().
import { mesh } from "topojson-client";
import type { Topology, GeometryCollection, GeometryObject } from "topojson-specification";
import worldRaw from "world-atlas/countries-110m.json";
import { lonLatToVec3 } from "../../lib/globe-math";

const topo = worldRaw as unknown as Topology<{
  countries: GeometryCollection;
  land: GeometryObject;
}>;

type Line = [number, number][];

/** Ordered polylines → flat segment-soup positions (x,y,z pairs) on radius r. */
export function buildBorderSegments(lines: Line[], r: number): Float32Array {
  let segs = 0;
  for (const line of lines) segs += Math.max(0, line.length - 1);
  const out = new Float32Array(segs * 6);
  let o = 0;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = lonLatToVec3(line[i], r);
      const b = lonLatToVec3(line[i + 1], r);
      out[o++] = a[0];
      out[o++] = a[1];
      out[o++] = a[2];
      out[o++] = b[0];
      out[o++] = b[1];
      out[o++] = b[2];
    }
  }
  return out;
}

const cache = new Map<number, Float32Array>();

/** All world-atlas country borders as sphere-surface segments at radius r. */
export function borderSegmentPositions(r: number): Float32Array {
  const hit = cache.get(r);
  if (hit) return hit;
  const borders = mesh(topo, topo.objects.countries);
  const built = buildBorderSegments(borders.coordinates as Line[], r);
  cache.set(r, built);
  return built;
}
