// Storyboard (v1.G): the script + one still per camera move, per format, from
// the recorded screenshots — no TTS or Remotion render needed. The operator
// reviews this before `approve`. Written as HTML, then screenshotted to PNG.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative } from "node:path";
import { chromium } from "playwright";
import type { Brand } from "../brand/schema.js";
import { FORMATS, FPS, type Format } from "../constants.js";
import type { Project, Scene } from "../project/schema.js";
import type { CaptureMeta } from "../record/site.js";
import { planCamera, type View } from "../render/camera.js";
import { popupRect, frameLayout } from "../remotion/frame.js";
import { metaKey } from "../qa/captions.js";
import { phrasesOf, popupsOf, timeScene } from "../render/timeline.js";
import { pageBottom, stripBottom } from "../remotion/caption.js";

const THUMB = { "16x9": 320, "9x16": 180 } as const; // thumbnail width, px

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export type StoryboardInput = {
  p: Project;
  brand: Brand;
  parent?: Brand;
  status: string; // "draft" | "approved" | "edited since approval"
  hash: string;
  // Keyed by metaKey(capture, view): the captured page, and each extension output's view (v1.J).
  captures: Record<string, Partial<Record<Format, { png: string; meta: string }>>>;
  // Popup screenshots per capture/format (v1.J): before any click, and after each output's click.
  popups?: Record<string, Partial<Record<Format, { popup: string; after: Record<string, string> }>>>;
};

/** One storyboard row per camera segment: where it lands, per format, and the words that start there. */
type Row = { label: string; views: Partial<Record<Format, View>>; say?: string; caption?: string; still?: boolean; popup?: string | true };

const same = (a: View, b: View) => Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.w - b.w) < 1;

const area = (s: Scene, f: Format) => (s.frame ? frameLayout(f, FORMATS[f].width, FORMATS[f].height).area : undefined);

function rowsFor(scene: Scene, inp: StoryboardInput): Row[] {
  // Durations don't change framing; 1 s per phrase is enough to place them.
  const t = timeScene(scene, phrasesOf(scene).map(() => 1), FPS);
  const popups = popupsOf(t.scene, FPS);
  const rows: Row[] = [];
  for (const f of inp.p.formats) {
    const meta: CaptureMeta = JSON.parse(readFileSync(inp.captures[metaKey(scene.capture, scene.view)][f]!.meta, "utf8"));
    // Shots and timing are format-independent, so segment i is the same move in every format.
    planCamera(t.scene, f, meta, t.seconds, FPS, area(scene, f)).forEach((seg, i, segs) => {
      const cut = i > 0 && !same(segs[i - 1].to, seg.from);
      const pop = popups.find((x) => x.start === seg.start);
      const move = pop ? "popup" : same(seg.from, seg.to) ? "hold" : Math.abs(seg.from.w - seg.to.w) >= 1 ? "zoom" : "pan";
      rows[i] ??= { label: cut ? `cut → ${move}` : pop?.state ? `popup after “${pop.state}”` : move, views: {}, still: i > 0 && !cut && move === "hold", popup: pop ? pop.state ?? true : undefined };
      rows[i].views[f] = seg.to;
      const ph = t.phrases.find((x) => x.start === seg.start);
      if (ph) { rows[i].say = ph.say; rows[i].caption = ph.caption; }
    });
  }
  // A hold with no new words looks exactly like the row above it.
  return rows.filter((r) => !(r.still && !r.say && !r.caption));
}

function thumb(f: Format, view: View, imgW: number, src: string, a?: { x: number; y: number; w: number; h: number }, popup?: { src: string; w: number; h: number }, bg?: string): string {
  const w = THUMB[f];
  const { width: W, height: H } = FORMATS[f];
  const h = Math.round(w * (H / W));
  const s = w / W; // thumb px per output px
  const box = a ?? { x: 0, y: 0, w: W, h: H }; // footage area (v1.J window frame)
  const k = (box.w * s) / view.w;
  const t = Math.round(pageBottom(f, W, H) * s), b = Math.round(stripBottom(f, W, H) * s); // caption strip (v1.I)
  const pr = popup && popupRect(f, W, H, { width: popup.w, height: popup.h });
  return `<div class="thumb" style="width:${w}px;height:${h}px;${a ? `background:${bg ?? "#333"}` : ""}">`
    + `<div style="position:absolute;overflow:hidden;left:${box.x * s}px;top:${box.y * s}px;width:${box.w * s}px;height:${box.h * s}px;background:#fff">`
    + `<img src="${esc(src)}" style="width:${imgW * k}px;transform:translate(${-view.x * k}px,${-view.y * k}px)"></div>`
    + (pr ? `<img src="${esc(popup!.src)}" style="position:absolute;left:${pr.x * s}px;top:${pr.y * s}px;width:${pr.w * s}px;box-shadow:0 2px 8px rgba(0,0,0,.4)">` : "")
    + `<div class="strip" style="top:${t}px;height:${b - t}px"></div></div>`;
}

export function storyboardHtml(inp: StoryboardInput, htmlPath: string): string {
  const { p, brand, parent } = inp;
  const rel = (path: string) => relative(dirname(htmlPath), path);
  const cap = (key: string, f: Format) => {
    const c = inp.captures[key][f]!;
    return { src: rel(c.png), width: (JSON.parse(readFileSync(c.meta, "utf8")) as CaptureMeta).width };
  };
  const popupImg = (capture: string, f: Format, state: string | true) => {
    const pp = inp.popups?.[capture]?.[f];
    const file = pp && (state === true ? pp.popup : pp.after[state]);
    if (!file) return undefined;
    const png = readFileSync(file); // PNG IHDR: width at byte 16, height at byte 20
    return { src: rel(file), w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
  };
  const scenes = p.scenes.map((s) => {
    if (s.kind !== "page-scroll") {
      const what = s.kind === "title" ? `types “${esc(s.text)}”` : s.items.map((b) => `[${b.icon}] ${esc(b.label)}`).join(" · ");
      const say = s.narration ? `<div class="say">“${esc(s.narration)}”</div>` : "";
      const caption = s.caption && s.caption !== s.narration ? `<div class="cap">caption: ${esc(s.caption)}</div>` : "";
      return `<h2>${esc(s.id)}</h2><table><tr><td class="lbl">${s.kind}</td><td class="card" style="background:${brand.colors.background};color:${brand.colors.text}">${what}</td><td class="txt">${say}${caption}</td></tr></table>`;
    }
    const rows = rowsFor(s, inp).map((r) => {
      const thumbs = p.formats.map((f) => {
        const v = r.views[f];
        const c = cap(metaKey(s.capture, s.view), f);
        return `<td>${v ? thumb(f, v, c.width, c.src, area(s, f), r.popup ? popupImg(s.capture, f, r.popup) : undefined, brand.colors.background) : ""}</td>`;
      }).join("");
      const say = r.say ? `<div class="say">“${esc(r.say)}”</div>` : "";
      const caption = r.caption && r.caption !== r.say ? `<div class="cap">caption: ${esc(r.caption)}</div>` : "";
      return `<tr><td class="lbl">${r.label}</td>${thumbs}<td class="txt">${say}${caption}</td></tr>`;
    }).join("");
    return `<h2>${esc(s.id)}</h2><table>${rows}</table>`;
  }).join("");

  const end = p.endCard ?? brand.endCard;
  const cards = [
    brand.parent?.opener && parent ? `<li><b>@intro</b> (${brand.parent.introSeconds}s, silent): ${esc(parent.name)} logo · ${esc(brand.parent.intro)} · ${esc(brand.name)}</li>` : "",
    end ? `<li><b>@end-card</b>${p.endCard ? " (this project's)" : ""}: ${esc(brand.name)}${end.tagline ? ` · ${esc(end.tagline)}` : ""} · <b>${esc(end.headline)}</b> · ${esc(end.url)}${brand.parent && parent ? ` · ${esc(brand.parent.signoff)} ${esc(parent.name)}` : ""}${end.say ? ` · says “${esc(end.say)}”` : ""}</li>` : "",
  ].join("");
  const pub = p.publish ? `<h2>publish</h2><ul><li><b>title</b>: ${esc(p.publish.title)}</li><li><b>description</b>: ${esc(p.publish.description)}</li><li><b>hashtags</b>: ${esc(p.publish.hashtags.join(" "))}</li><li><b>channels</b>: ${esc(p.publish.channels.join(", "))}</li></ul>` : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slug)} — storyboard</title><style>
body{font-family:'Noto Sans',system-ui,sans-serif;margin:24px;color:#111827;background:#fff;width:1100px}
h1{margin:0 0 4px}h2{margin:28px 0 8px;border-bottom:1px solid #e5e7eb}
.meta{color:#6b7280}.status{font-weight:700;color:${inp.status === "approved" ? "#15803d" : "#b45309"}}
table{border-collapse:collapse}td{vertical-align:top;padding:6px 10px 6px 0}
.lbl{color:#6b7280;font-size:13px;width:60px}.thumb{overflow:hidden;position:relative;border:1px solid #d1d5db;background:#f3f4f6}
.thumb img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none}.strip{position:absolute;left:0;right:0;background:#fff}
.txt{width:360px}.card{width:500px;padding:16px;font-weight:700;border-radius:6px}.say{font-size:18px}.cap{color:#6b7280;font-size:14px;margin-top:4px}
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
