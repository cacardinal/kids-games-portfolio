// Verification driver for the Code Quest 3D upgrade.
// Drives the REAL app in an isolated Playwright context (empty localStorage, so it
// boots to the profile picker). Uses ONLY the Guest profile. Captures four shots:
// idle, mid-drive, win, and a collision (shake + existing diagnostic copy).
//
// SELECTOR NOTE: the palette command button and the program-rail chip BOTH render the
// visible text "MOVE". A bare text= selector is ambiguous once the first chip lands
// (it matches the palette button AND every rail chip) — that was the false-positive that
// made an earlier driver land only one chip. We target the palette by its unique
// accessible name ("Add MOVE"/"Add LEFT"), so every tap hits the palette, never a rail
// chip. The DOM already disambiguates: palette = aria-label "Add MOVE" / class
// .palette-chip; rail chip = aria-label "MOVE, chip N" / class .chip. No app change.
import { chromium } from "playwright";

const OUT = process.argv[2] || "../verification/code-quest-3d";
const BASE = "http://localhost:5187";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));

async function bootToPicker() {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  // The kids-games dev server pre-optimizes the heavy three.js stack; wait for React
  // to actually mount the picker rather than racing a blank first paint.
  for (let i = 0; i < 25 && (await page.locator("button").count()) === 0; i++) {
    await page.waitForTimeout(500);
  }
}

async function enterM01() {
  await page.getByRole("button", { name: /operate as guest/i }).first().click();
  await page.waitForTimeout(500);
  await page.getByRole("button", { name: "Mission 1: First Contact" }).first().click();
  await page.waitForSelector('[data-testid="terrain-3d"], .grid-viewport', { timeout: 8000 });
  await page.waitForTimeout(1300); // 3D chunk + first frames settle
}

await bootToPicker();
await enterM01();

// --- Shot 1: idle terrain + rover + rail ---
await page.screenshot({ path: `${OUT}/mission-3d.png` });

// --- Build a 3-MOVE program (reaches the goal 3 tiles east) ---
const addMove = page.getByRole("button", { name: "Add MOVE" });
for (let i = 0; i < 3; i++) {
  await addMove.click();
  await page.waitForTimeout(180);
}
const chips = await page.locator(".rail-list .chip-label").count();
console.log(`rail chips after 3 taps: ${chips} (expect 3)`);

// --- Shot 2: mid-drive action shot ---
await page.getByRole("button", { name: "RUN" }).first().click();
await page.waitForTimeout(650);
await page.screenshot({ path: `${OUT}/mission-3d-running.png` });

// --- Shot 3: win overlay (DOM set piece) ---
await page.waitForSelector(".win-overlay, [class*='win']", { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(1600);
await page.screenshot({ path: `${OUT}/mission-3d-win.png` });

// --- Shot 4: collision (drive off the north boundary): LEFT + MOVE x3 ---
// Fresh context so we start clean at the picker (never touches real kids' saves).
const ctx2 = await browser.newContext({ viewport: { width: 1024, height: 768 } });
const page2 = ctx2.pages()[0] ?? (await ctx2.newPage());
{
  await page2.goto(BASE, { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 25 && (await page2.locator("button").count()) === 0; i++) await page2.waitForTimeout(500);
  await page2.getByRole("button", { name: /operate as guest/i }).first().click();
  await page2.waitForTimeout(500);
  await page2.getByRole("button", { name: "Mission 1: First Contact" }).first().click();
  await page2.waitForSelector('[data-testid="terrain-3d"], .grid-viewport', { timeout: 8000 });
  await page2.waitForTimeout(1300);
  await page2.getByRole("button", { name: "Add LEFT" }).click();
  await page2.waitForTimeout(150);
  for (let i = 0; i < 3; i++) { await page2.getByRole("button", { name: "Add MOVE" }).click(); await page2.waitForTimeout(150); }
  await page2.getByRole("button", { name: "RUN" }).first().click();
  await page2.waitForSelector(".diag-alert, .diagnostic", { timeout: 6000 }).catch(() => {});
  await page2.waitForTimeout(250); // catch the shake frame
  await page2.screenshot({ path: `${OUT}/mission-3d-collision.png` });
  const diag = await page2.locator(".diag-main").first().innerText().catch(() => "(none)");
  console.log("collision diagnostic:", diag);
}

console.log("done; screenshots ->", OUT);
await browser.close();
