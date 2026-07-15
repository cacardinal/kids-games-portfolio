// Pure globe math — NO three.js import (unit-tested in node; the 3D layer wraps
// these tuples in three types at the component edge).
//
// Coordinate convention (chosen to line up with three.js SphereGeometry UVs so
// an equirectangular canvas texture matches raycast picking exactly):
//   x = r·cos(lat)·cos(lon)
//   y = r·sin(lat)
//   z = -r·cos(lat)·sin(lon)
// With that convention, SphereGeometry's u=0 seam (position (-r,0,0) at the
// equator) is lon ±180° — exactly the left/right edge of an equirectangular
// texture spanning lon -180…180. No texture offset needed.

export type Vec3 = [number, number, number];
export type LonLat = [number, number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/** [lon, lat] degrees → point on a sphere of radius r. */
export function lonLatToVec3([lon, lat]: LonLat, r: number): Vec3 {
  const lonR = lon * D2R;
  const latR = lat * D2R;
  const c = Math.cos(latR);
  return [r * c * Math.cos(lonR), r * Math.sin(latR), -r * c * Math.sin(lonR)];
}

/** Point (any radius) → [lon, lat] degrees. Inverse of lonLatToVec3. */
export function vec3ToLonLat([x, y, z]: Vec3): LonLat {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(Math.min(1, Math.max(-1, y / r))) * R2D;
  const lon = Math.atan2(-z, x) * R2D;
  return [lon, lat];
}

/**
 * Rig angles that bring a lon/lat to face a +z camera, for a rig where the
 * yaw group (rotation.y) nests INSIDE the pitch group (rotation.x):
 * world = Rx(pitch) · Ry(yaw) · local.
 */
export function focusAnglesFor(lonDeg: number, latDeg: number): { yaw: number; pitch: number } {
  return { yaw: -(lonDeg + 90) * D2R, pitch: latDeg * D2R };
}

/**
 * Screen-space quadratic arc path (SVG `d`) from (x1,y1) to (x2,y2), lifted
 * perpendicular-ish "up" (negative y) by `lift` × chord length. Pure — used by
 * the expedition-complete arc flourish.
 */
export function arcPathD(x1: number, y1: number, x2: number, y2: number, lift: number): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const chord = Math.hypot(x2 - x1, y2 - y1);
  const cx = mx;
  const cy = my - chord * lift;
  return `M ${fmt(x1)} ${fmt(y1)} Q ${fmt(cx)} ${fmt(cy)}, ${fmt(x2)} ${fmt(y2)}`;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

/**
 * Static assertion companion for the UV-alignment test: true means the module
 * convention documented above holds (lon -180 sits on -x, the sphere UV seam).
 */
export const GLOBE_UV_LON_OFFSET_OK: boolean = (() => {
  const [x] = lonLatToVec3([-180, 0], 1);
  return Math.abs(x + 1) < 1e-9;
})();
