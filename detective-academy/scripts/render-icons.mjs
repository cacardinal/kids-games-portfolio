// Render the app icon SVG to icon-512.png + icon-180.png using sharp (devDependency).
// No image assets are committed — the PNGs are generated from scripts/icon.svg.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, "icon.svg"));
const outDir = join(here, "..", "public");

async function render(size, name) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, name));
  console.log(`wrote public/${name} (${size}x${size})`);
}

await render(512, "icon-512.png");
await render(180, "icon-180.png");
// also a favicon (svg already present, but provide a png-based one for safety)
await render(32, "favicon-32.png");
