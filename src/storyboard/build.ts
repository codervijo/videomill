// Storyboard (v1.G): the script + one still per camera move, per format, from
// the recorded screenshots — no TTS or Remotion render needed. The operator
// reviews this before `approve`. Written as HTML, then screenshotted to PNG.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { chromium } from "playwright";
import type { Brand } from "../brand/schema.js";
import { FORMATS, FPS, type Format } from "../constants.js";
import type { Project } from "../project/schema.js";
import type { CaptureMeta } from "../record/site.js";
import { planCamera, type View } from "../render/camera.js";
import { phrasesOf, timeScene } from "../render/timeline.js";
import { pageBottom } from "../remotion/caption.js";

const THUMB = { "16x9": 320, "9x16": 180 } as const; // thumbnail width, px

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type StoryboardInput = {
  p: Project;
  brand: Brand;
  parent?: Brand;
  status: string; // "draft" | "approved" | "edited since approval"
  hash: string;
  captures: Record<string, Partial<Record<Format, { png: string; meta: string }>>>;
};

/** One storyboard row per camera segment: where it lands, per format, and the words that start there. */
type Row = { label: string; views: Partial<Record<Format, View>>; say?: string; caption?: string; still?: boolean };

const same = (a: View, b: View) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1;

function rowsFor(scene: Project["scenes"][number], inp: StoryboardInput): Row[] {
  // Durations don't change framing; 1 s per phrase is enough to place them.
  const t = timeScene(scene, phrasesOf(scene).map(() => 1), FPS);
  const rows: Row[] = [];
  for (const f of inp.p.formats) {
    const meta: CaptureMeta = JSON.parse(readFileSync(inp.captures[scene.capture][f]!.meta, "utf8"));
    // Shots and timing are format-independent, so segment i is the same move in every format.
    planCamera(t.scene, f, meta, t.seconds, FPS).forEach((seg, i, segs) => {
      const cut = i > 0 && !same(segs[i - 1].to, seg.from);
      const move = same(seg.from, seg.to) ? "hold" : Math.abs(seg.from.w - seg.to.w) >= 1 ? "zoom" : "pan";
      rows[i] ??= { label: cut ? `cut → ${move}` : move, views: {}, still: i > 0 && !cut && move === "hold" };
      rows[i].views[f] = seg.to;
      const ph = t.phrases.find((x) => x.start === seg.start);
      if (ph) { rows[i].say = ph.say; rows[i].caption = ph.caption; }
    });
  }
  // A hold with no new words looks exactly like the row above it.
  return rows.filter((r) => !(r.still && !r.say && !r.caption));
}

function thumb(f: Format, view: View, imgW: number, src: string): string {
  const w = THUMB[f];
  const h = Math.round(w * (FORMATS[f].height / FORMATS[f].width));
  const k = w / view.w;
  const strip = Math.round(pageBottom(f, FORMATS[f].width, FORMATS[f].height) * (w / FORMATS[f].width)); // caption strip hides the page below (v1.I)
  return `<div class="thumb" style="width:${w}px;height:${h}px"><img src="${esc(src)}" style="width:${imgW * k}px;transform:translate(${-view.x * k}px,${-view.y * k}px)"><div class="strip" style="top:${strip}px"></div></div>`;
}

export function storyboardHtml(inp: StoryboardInput, htmlPath: string): string {
  const { p, brand, parent } = inp;
  const cap = (id: string, f: Format) => {
    const c = inp.captures[id][f]!;
    return { src: relative(dirname(htmlPath), c.png), width: (JSON.parse(readFileSync(c.meta, "utf8")) as CaptureMeta).width };
  };
  const scenes = p.scenes.map((s) => {
    const rows = rowsFor(s, inp).map((r) => {
      const thumbs = p.formats.map((f) => { const v = r.views[f]; const c = cap(s.capture, f); return `<td>${v ? thumb(f, v, c.width, c.src) : ""}</td>`; }).join("");
      const say = r.say ? `<div class="say">“${esc(r.say)}”</div>` : "";
      const caption = r.caption && r.caption !== r.say ? `<div class="cap">caption: ${esc(r.caption)}</div>` : "";
      return `<tr><td class="lbl">${r.label}</td>${thumbs}<td class="txt">${say}${caption}</td></tr>`;
    }).join("");
    return `<h2>${esc(s.id)}</h2><table>${rows}</table>`;
  }).join("");

  const cards = [
    brand.parent?.opener && parent ? `<li><b>@intro</b> (${brand.parent.introSeconds}s, silent): ${esc(parent.name)} logo · ${esc(brand.parent.intro)} · ${esc(brand.name)}</li>` : "",
    brand.endCard ? `<li><b>@end-card</b>: ${esc(brand.name)} · <b>${esc(brand.endCard.headline)}</b> · ${esc(brand.endCard.url)}${brand.parent && parent ? ` · ${esc(brand.parent.signoff)} ${esc(parent.name)}` : ""}${brand.endCard.say ? ` · says “${esc(brand.endCard.say)}”` : ""}</li>` : "",
  ].join("");
  const pub = p.publish ? `<h2>publish</h2><ul><li><b>title</b>: ${esc(p.publish.title)}</li><li><b>description</b>: ${esc(p.publish.description)}</li><li><b>hashtags</b>: ${esc(p.publish.hashtags.join(" "))}</li><li><b>channels</b>: ${esc(p.publish.channels.join(", "))}</li></ul>` : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slug)} — storyboard</title><style>
body{font-family:'Noto Sans',system-ui,sans-serif;margin:24px;color:#111827;background:#fff;width:1100px}
h1{margin:0 0 4px}h2{margin:28px 0 8px;border-bottom:1px solid #e5e7eb}
.meta{color:#6b7280}.status{font-weight:700;color:${inp.status === "approved" ? "#15803d" : "#b45309"}}
table{border-collapse:collapse}td{vertical-align:top;padding:6px 10px 6px 0}
.lbl{color:#6b7280;font-size:13px;width:60px}.thumb{overflow:hidden;position:relative;border:1px solid #d1d5db;background:#f3f4f6}
.thumb img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none}.strip{position:absolute;left:0;right:0;bottom:0;background:#fff}
.txt{width:360px}.say{font-size:18px}.cap{color:#6b7280;font-size:14px;margin-top:4px}
</style></head><body>
<h1>${esc(p.slug)}</h1>
<div class="meta">${esc(p.type)} · brand ${esc(brand.id)} · voice ${esc(p.voice ?? brand.voice ?? "default")} · formats ${p.formats.join(", ")}</div>
<div class="meta">status <span class="status">${esc(inp.status)}</span> · hash ${inp.hash}</div>
${cards ? `<h2>brand cards</h2><ul>${cards}</ul>` : ""}${scenes}${pub}
</body></html>`;
}

export async function writeStoryboard(inp: StoryboardInput, htmlPath: string, pngPath: string): Promise<void> {
  mkdirSync(dirname(htmlPath), { recursive: true });
  writeFileSync(htmlPath, storyboardHtml(inp, htmlPath));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1150, height: 800 } });
    await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
    await page.screenshot({ path: pngPath, fullPage: true });
  } finally {
    await browser.close();
  }
}
