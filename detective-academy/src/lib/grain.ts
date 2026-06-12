// Paper-grain texture as a runtime-generated SVG data URL (feTurbulence).
// Sets the CSS var --paper-grain-url once so .grain overlays render real noise.
// Pure CSS/SVG, zero asset files (contract: no images).
let injected = false;

export function ensurePaperGrain() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>\
<filter id='n'>\
<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>\
<feColorMatrix type='saturate' values='0'/>\
<feComponentTransfer><feFuncA type='linear' slope='0.18'/></feComponentTransfer>\
</filter>\
<rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/>\
</svg>`;
  const url = `url("data:image/svg+xml,${svg.replace(/#/g, "%23").replace(/"/g, "'")}")`;
  document.documentElement.style.setProperty("--paper-grain-url", url);
}
