// Render the app icon SVG to the PNGs the manifest + apple-touch-icon need.
// Run: npm run icons  (sharp is a devDependency).
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(here, "icon.svg"));
const outDir = join(here, "..", "public");

const sizes = [
  { file: "icon-512.png", size: 512 },
  { file: "icon-180.png", size: 180 },
  { file: "favicon.svg", size: null }, // also drop the svg as the favicon
];

for (const { file, size } of sizes) {
  if (size === null) continue;
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, file));
  console.log(`wrote public/${file} (${size}x${size})`);
}
