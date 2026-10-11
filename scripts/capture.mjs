// Headed Chrome + SwiftShader WebGL capture. Run under Xvfb (headless gives a black canvas):
//   bun run build && (bun run preview &) && xvfb-run -a -s "-screen 0 1400x2200x24" node scripts/capture.mjs
// env: BASE_URL, OUT (png path), QUERY (extra url params), MEASURE (seconds of fps sampling)
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4173/";
const OUT = process.env.OUT ?? "screenshots/render.png";
const browser = await chromium.launch({
  headless: false,
  executablePath: process.env.CHROME ?? "/usr/bin/google-chrome",
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--disable-gpu-watchdog", "--no-first-run"],
});
const page = await browser.newPage({ viewport: { width: 535, height: 1024 }, deviceScaleFactor: Number(process.env.DPR ?? 1) });
page.on("console", (m) => console.log(`console.${m.type()}: ${m.text()}`));
page.on("pageerror", (e) => console.log(`pageerror: ${e.message}`));
const t0 = Date.now();
await page.goto(`${BASE}?fixed&size=535x1024&${process.env.QUERY ?? ""}`, { waitUntil: "commit", timeout: 600_000 });
await page.waitForFunction(() => window.__demo && (window.__demo.error || window.__demo.frames >= 2), null, { timeout: 600_000, polling: 500 });
if (process.env.MEASURE) {
  await page.evaluate(() => { const u = new URL(location.href); });
  const f0 = await page.evaluate(() => window.__demo.frames), w0 = Date.now();
  await page.waitForTimeout(Number(process.env.MEASURE) * 1000);
  const f1 = await page.evaluate(() => window.__demo.frames);
  console.log(`fps ${((f1 - f0) / ((Date.now() - w0) / 1000)).toFixed(2)}`);
}
console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", JSON.stringify(await page.evaluate(() => window.__demo)));
await page.locator("canvas").screenshot({ path: OUT });
await browser.close();
