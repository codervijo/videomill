// Capture a live page with Playwright: a full-page screenshot per format plus
// the device-pixel bounding box of every anchor the project's scenes reference.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { CAPTURE, type Format } from "../constants.js";
import { info, VideoMillError } from "../pipeline/step.js";

export type Box = { x: number; y: number; w: number; h: number };
// Anchor boxes in device pixels of the full-page screenshot (v1.D: full box, was y only).
export type CaptureMeta = { version: 2; width: number; height: number; anchors: Record<string, Box> };

export const captureFiles = (mediaDir: string, captureId: string, f: Format) => ({
  png: join(mediaDir, `${captureId}-${f}.png`),
  meta: join(mediaDir, `${captureId}-${f}.json`),
});

export async function recordCapture(url: string, format: Format, anchors: string[], mediaDir: string, captureId: string): Promise<void> {
  const { viewport, scale, mobile } = CAPTURE[format];
  mkdirSync(mediaDir, { recursive: true });
  const files = captureFiles(mediaDir, captureId, format);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });

    // Scroll the whole page once so lazy images load, then return to the top.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += Math.round(viewport.height / 3)) {
      await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" as ScrollBehavior }), y);
      await page.waitForTimeout(120);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const meta: CaptureMeta = { version: 2, width: viewport.width * scale, height: 0, anchors: {} };
    for (const sel of anchors) {
      const box = await page.locator(sel).first().boundingBox({ timeout: 5000 }).catch(() => null);
      if (!box) throw new VideoMillError(`anchor not found on ${url} @${format}: ${sel}`);
      // page is at scrollY 0, so viewport coords == page coords
      meta.anchors[sel] = { x: Math.round(box.x * scale), y: Math.round(box.y * scale), w: Math.round(box.width * scale), h: Math.round(box.height * scale) };
    }

    await page.screenshot({ path: files.png, fullPage: true });
    meta.height = Math.round((await page.evaluate(() => document.documentElement.scrollHeight)) * scale);
    writeFileSync(files.meta, JSON.stringify(meta, null, 2) + "\n");
    info(`${captureId} @${format}: ${meta.height}px, ${anchors.length} anchor(s)`);
    await context.close();
  } finally {
    await browser.close();
  }
}
