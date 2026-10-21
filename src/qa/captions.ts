// Caption QA: every caption box sits inside the format's safe zone (v1.H) and
// intersects no visible recorded anchor box (v1.I). Caption boxes are measured
// in Chromium with the render's own styles (remotion/caption.ts); anchors' on-
// screen boxes come from the recorded boxes through the camera view.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { FORMATS, SAFE_ZONE, type Format } from "../constants.js";
import type { CaptureMeta } from "../record/site.js";
import type { Segment, View } from "../render/camera.js";
import { captionStyles } from "../remotion/caption.js";
import { fontStack, type FontRef } from "../remotion/fonts.js";

/** What `render` laid out for one format — written to out/<slug>/timeline-<f>.json. */
export type Timeline = {
  format: Format;
  fps: number;
  font?: FontRef; // file relative to the project's media dir
  scenes: { id: string; capture: string; offset: number; segments: Segment[]; phrases: { caption: string; start: number; end: number }[] }[];
};

export type Rect = { x: number; y: number; w: number; h: number };
export type CaptionIssue = { scene: string; caption: string; at: number; problem: string };

const area = (r: Rect) => Math.max(0, r.w) * Math.max(0, r.h);
export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  return { x, y, w: Math.min(a.x + a.w, b.x + b.w) - x, h: Math.min(a.y + a.h, b.y + b.h) - y };
}

/** An image-pixel box as it appears on screen through `view`, in output px. */
export function onScreen(box: Rect, view: View, f: Format): Rect {
  const k = FORMATS[f].width / view.w;
  return { x: (box.x - view.x) * k, y: (box.y - view.y) * k, w: box.w * k, h: box.h * k };
}

export function safeRect(f: Format): Rect {
  const { width, height } = FORMATS[f];
  const z = SAFE_ZONE[f];
  return { x: z.left, y: z.top, w: width - z.left - z.right, h: height - z.top - z.bottom };
}

/** Where the caption overlaps the anchor's visible box through `view`, or null. */
export function overlapOf(caption: Rect, box: Rect, view: View, f: Format): Rect | null {
  const frame = { x: 0, y: 0, w: FORMATS[f].width, h: FORMATS[f].height };
  const o = intersect(caption, intersect(onScreen(box, view, f), frame));
  return o.w >= 1 && o.h >= 1 ? o : null; // sub-pixel touches are rounding, not overlap
}

/** Pure check over a laid-out timeline, given measured caption boxes per text. */
export function captionIssues(t: Timeline, metas: Record<string, CaptureMeta>, boxes: Record<string, Rect>): CaptionIssue[] {
  const issues: CaptionIssue[] = [];
  const zone = safeRect(t.format);
  for (const s of t.scenes) {
    const meta = metas[s.capture];
    for (const ph of s.phrases) {
      if (!ph.caption) continue;
      const box = boxes[ph.caption];
      const at = (s.offset + ph.start) / t.fps;
      const issue = (problem: string) => issues.push({ scene: s.id, caption: ph.caption, at, problem });
      const outside = area(box) - area(intersect(box, zone));
      if (outside > 1) issue(`outside the ${t.format} safe zone (box y ${Math.round(box.y)}–${Math.round(box.y + box.h)}, zone ${zone.y}–${zone.y + zone.h})`);
      // Every view the phrase is shown over: each overlapping segment's start and end.
      const views = s.segments.filter((g) => g.start < ph.end && g.end > ph.start).flatMap((g) => [g.from, g.to]);
      for (const [name, anchor] of Object.entries(meta.anchors)) {
        const worst = views.map((v) => overlapOf(box, anchor, v, t.format)).filter((o) => o !== null)
          .sort((a, b) => area(b) - area(a))[0];
        if (worst) issue(`overlaps ${name} (${Math.round(worst.w)}×${Math.round(worst.h)} px)`);
      }
    }
  }
  return issues;
}

const css = (o: Record<string, string | number>) =>
  Object.entries(o).map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`).join(";");

/** Lay each caption out in Chromium with the render's styles; returns its box in output px. */
export async function measureCaptions(f: Format, texts: string[], font: FontRef | undefined, fontPath?: string): Promise<Record<string, Rect>> {
  const { width, height } = FORMATS[f];
  const s = captionStyles(f, width, height, fontStack(font));
  const face = font?.file && fontPath
    ? `@font-face{font-family:'${font.family}';src:url(data:font/ttf;base64,${readFileSync(fontPath).toString("base64")});font-weight:100 900}`
    : "";
  const esc = (x: string) => x.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const html = `<!doctype html><html><head><style>${face}body{margin:0}</style></head><body>${texts
    .map((t, i) => `<div style="${css(s.outer)}"><div id="c${i}" style="${css(s.inner)}">${esc(t)}</div></div>`).join("")}</body></html>`;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const rects = await page.evaluate((n) => Array.from({ length: n }, (_, i) => {
      const r = document.getElementById(`c${i}`)!.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    }), texts.length);
    return Object.fromEntries(texts.map((t, i) => [t, rects[i]]));
  } finally {
    await browser.close();
  }
}
