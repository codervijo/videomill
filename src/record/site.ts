// Record a live page with Playwright: a scroll video + a full-page screenshot per format.
import { mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { CAPTURE, type Format } from "../constants.js";
import { info } from "../pipeline/step.js";

export async function recordSite(url: string, format: Format, outDir: string): Promise<void> {
  const { viewport, scale, mobile } = CAPTURE[format];
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: scale,
      isMobile: mobile,
      hasTouch: mobile,
      recordVideo: { dir: outDir, size: { width: viewport.width * scale, height: viewport.height * scale } },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // Scroll the whole page once so lazy images load (also what the video shows).
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += Math.round(viewport.height / 3)) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await page.screenshot({ path: join(outDir, `page-${format}.png`), fullPage: true });
    info(`page height ${height}px @${scale}x`);

    const video = page.video();
    await context.close(); // flushes the video file
    if (video) renameSync(await video.path(), join(outDir, `scroll-${format}.webm`));
  } finally {
    await browser.close();
  }
}
