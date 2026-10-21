// Capture a live page with Playwright: a full-page screenshot per format plus
// the device-pixel bounding box of every anchor the project's scenes reference,
// and of every visible text run on the page (v1.I: `qa` keeps captions off them).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { CAPTURE, type Format } from "../constants.js";
import { info, VideoMillError } from "../pipeline/step.js";

export type Box = { x: number; y: number; w: number; h: number };
// Anchor boxes in device pixels of the full-page screenshot (v1.D: full box, was y only).
// `text` (v1.I, meta version 3): one box per visible non-empty text node.
export type CaptureMeta = { version: 2 | 3; width: number; height: number; anchors: Record<string, Box>; text?: { text: string; box: Box }[] };
export const META_VERSION = 3;

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

    const meta: CaptureMeta = { version: META_VERSION, width: viewport.width * scale, height: 0, anchors: {}, text: [] };
    for (const sel of anchors) {
      const box = await page.locator(sel).first().boundingBox({ timeout: 5000 }).catch(() => null);
      if (!box) throw new VideoMillError(`anchor not found on ${url} @${format}: ${sel}`);
      // page is at scrollY 0, so viewport coords == page coords
      meta.anchors[sel] = { x: Math.round(box.x * scale), y: Math.round(box.y * scale), w: Math.round(box.width * scale), h: Math.round(box.height * scale) };
    }

    const runs = await page.evaluate(() => {
      const out: { text: string; x: number; y: number; w: number; h: number }[] = [];
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const text = n.textContent!.replace(/\s+/g, " ").trim();
        const el = n.parentElement;
        if (!text || !el || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        const r = range.getBoundingClientRect();
        if (r.width >= 1 && r.height >= 1) out.push({ text, x: r.x, y: r.y, w: r.width, h: r.height });
      }
      return out;
    });
    meta.text = runs.map((r) => ({ text: r.text, box: { x: Math.round(r.x * scale), y: Math.round(r.y * scale), w: Math.round(r.w * scale), h: Math.round(r.h * scale) } }));

    await page.screenshot({ path: files.png, fullPage: true });
    meta.height = Math.round((await page.evaluate(() => document.documentElement.scrollHeight)) * scale);
    writeFileSync(files.meta, JSON.stringify(meta, null, 2) + "\n");
    info(`${captureId} @${format}: ${meta.height}px, ${anchors.length} anchor(s), ${meta.text.length} text run(s)`);
    await context.close();
  } finally {
    await browser.close();
  }
}
