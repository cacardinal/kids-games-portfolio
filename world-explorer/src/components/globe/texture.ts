// Equirectangular globe texture painter. Draws the SAME world-atlas countries
// the flat map renders onto a canvas that wraps the sphere: ocean, graticule,
// land, visited tint, selected (gold) highlight. Re-painted only when state
// changes; the scene marks the CanvasTexture dirty afterwards.
//
// No three.js import — this module owns 2D canvas drawing only.
import { geoEquirectangular, geoPath, geoGraticule10 } from "d3-geo";
import { COUNTRY_FEATURES, featureIsoN3 } from "../../data/atlas";
import { ISON3_TO_ISO3 } from "../../data/countries";

export const TEX_W = 2048;
export const TEX_H = 1024;

// Palette mirrors styles.css tokens (canvas can't read CSS custom properties
// cheaply; keep in sync with :root). Visited reads clearly at globe scale —
// a lit teal wash over the slate land, selected is the atlas gold.
const OCEAN_TOP = "#0a0f16";
const OCEAN_MID = "#101a26";
const OCEAN_BOTTOM = "#0a0f16";
const LAND = "#26343f";
const LAND_EDGE = "rgba(230, 227, 220, 0.20)";
const VISITED = "#2e574f";
const VISITED_EDGE = "rgba(59, 169, 159, 0.65)";
const SELECTED = "#d4a843";
const SELECTED_EDGE = "rgba(244, 239, 230, 0.9)";
const GRATICULE = "rgba(230, 227, 220, 0.05)";

export interface GlobeTextureState {
  visited: Set<string>; // iso3
  selectedIso3?: string | null;
}

export function createGlobeCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = TEX_W;
  c.height = TEX_H;
  return c;
}

/**
 * Repaint a CanvasTexture-shaped object (structurally typed — this module
 * stays three-free) and mark it dirty for the next GPU upload.
 */
export function repaintGlobeTexture(
  texture: { image: unknown; needsUpdate: boolean },
  state: GlobeTextureState,
): void {
  drawGlobeTexture(texture.image as HTMLCanvasElement, state);
  texture.needsUpdate = true;
}

export function drawGlobeTexture(canvas: HTMLCanvasElement, state: GlobeTextureState): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Full-world equirectangular fit: lon -180..180 → x 0..W, lat 90..-90 → y 0..H.
  const projection = geoEquirectangular()
    .scale(TEX_W / (2 * Math.PI))
    .translate([TEX_W / 2, TEX_H / 2]);
  const path = geoPath(projection, ctx);

  // Ocean — subtle latitude gradient (deep at the poles, a touch lighter mid).
  const grad = ctx.createLinearGradient(0, 0, 0, TEX_H);
  grad.addColorStop(0, OCEAN_TOP);
  grad.addColorStop(0.5, OCEAN_MID);
  grad.addColorStop(1, OCEAN_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Faint graticule — premium-atlas chart lines.
  ctx.beginPath();
  path(geoGraticule10());
  ctx.strokeStyle = GRATICULE;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Countries. Selected drawn last so its edge rides on top.
  let selectedFeature: (typeof COUNTRY_FEATURES)[number] | null = null;
  for (const f of COUNTRY_FEATURES) {
    const iso3 = ISON3_TO_ISO3[featureIsoN3(f)] ?? "";
    if (state.selectedIso3 && iso3 === state.selectedIso3) {
      selectedFeature = f;
      continue;
    }
    const isVisited = !!iso3 && state.visited.has(iso3);
    ctx.beginPath();
    path(f);
    ctx.fillStyle = isVisited ? VISITED : LAND;
    ctx.fill();
    ctx.strokeStyle = isVisited ? VISITED_EDGE : LAND_EDGE;
    ctx.lineWidth = isVisited ? 1.6 : 1;
    ctx.stroke();
  }
  if (selectedFeature) {
    ctx.beginPath();
    path(selectedFeature);
    ctx.fillStyle = SELECTED;
    ctx.fill();
    ctx.strokeStyle = SELECTED_EDGE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
