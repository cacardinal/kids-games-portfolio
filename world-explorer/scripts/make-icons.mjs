// One-off icon renderer. Builds the app SVG (compass rose + gold ring on ink,
// the World Explorer mark) and rasterizes to icon-512.png + icon-180.png via
// sharp (devDependency). Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, "..", "public");

const ink = "#0f1419";
const ink2 = "#16202a";
const gold = "#d4a843";
const goldSoft = "#e7c876";
const teal = "#3ba99f";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="${ink2}"/>
      <stop offset="70%" stop-color="${ink}"/>
      <stop offset="100%" stop-color="#0a0e12"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${goldSoft}"/>
      <stop offset="100%" stop-color="${gold}"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <!-- outer stamp ring -->
  <circle cx="256" cy="256" r="168" fill="none" stroke="url(#gold)" stroke-width="10"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="url(#gold)" stroke-width="3" opacity="0.7"/>
  <!-- compass star -->
  <path d="M256 96 L286 256 L256 416 L226 256 Z" fill="url(#gold)"/>
  <path d="M96 256 L256 226 L416 256 L256 286 Z" fill="${teal}" opacity="0.92"/>
  <path d="M148 148 L256 240 L364 148 L272 256 L364 364 L256 272 L148 364 L240 256 Z" fill="url(#gold)" opacity="0.55"/>
  <circle cx="256" cy="256" r="20" fill="${ink}"/>
  <circle cx="256" cy="256" r="20" fill="none" stroke="url(#gold)" stroke-width="5"/>
</svg>`;

writeFileSync(join(pub, "icon.svg"), svg);

await sharp(Buffer.from(svg)).resize(512, 512).png().toFile(join(pub, "icon-512.png"));
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile(join(pub, "icon-180.png"));

console.log("Wrote public/icon.svg, icon-512.png, icon-180.png");
