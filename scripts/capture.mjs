import { chromium } from "playwright";
import fs from "node:fs";

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
const extra = process.env.QUERY ?? "";
await page.goto(`${BASE}?fixed&renderer=webgl&size=535x1024&${extra}`, { waitUntil: "commit", timeout: 600_000 });
await page.waitForFunction(() => window.__demo && (window.__demo.error || window.__demo.frames >= 3), null, { timeout: 600_000, polling: 500 });
const demo = await page.evaluate(() => window.__demo);
if (demo.error) { console.error("demo error", demo.error); await browser.close(); process.exit(1); }
if (process.env.MEASURE) {
  const f0 = await page.evaluate(() => window.__demo.frames), w0 = Date.now();
  await page.waitForTimeout(Number(process.env.MEASURE) * 1000);
  const f1 = await page.evaluate(() => window.__demo.frames);
  console.log(`fps ${((f1 - f0) / ((Date.now() - w0) / 1000)).toFixed(2)}`);
}
await page.waitForTimeout(300);
// WebGL canvas keeps presenting — pull pixels directly (needs preserveDrawingBuffer)
const dataUrl = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) throw new Error("no canvas");
  return c.toDataURL("image/png");
});
const buf = Buffer.from(dataUrl.split(",")[1], "base64");
fs.writeFileSync(OUT, buf);
console.log(((Date.now() - t0) / 1000).toFixed(1) + "s", JSON.stringify(await page.evaluate(() => window.__demo)), OUT, buf.length);
await browser.close();
