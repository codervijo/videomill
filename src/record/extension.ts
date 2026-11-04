// Record a Chrome extension's real output (v1.J): its popup, and what clicking
// its buttons produces on the capture's page (a download, or a page it opens).
// Each output also gets a camera-ready view — the page it opened, or the
// downloaded file's text laid out as an editor — measured like a captured page.
// The unpacked build comes from `make ext-copy` (.cache/ext-src/<name>); a copy
// in .cache/ext/<name> is what Chromium loads (docs/architecture.md § 2).
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { CAPTURE, type Format } from "../constants.js";
import { hashOf, info, VideoMillError } from "../pipeline/step.js";
import type { Capture } from "../project/schema.js";
import { measurePage, type CaptureMeta } from "./site.js";

export const EXT_SRC = resolve(".cache/ext-src");
const EXT_RUN = resolve(".cache/ext");
const POPUP_WIDTH = 360; // CSS px; Chrome sizes a popup to its content, this is the starting width
export const EXT_META_VERSION = 3; // 2: per-output views + icon; 3: opened URL keeps chrome-extension:// origins (v1.J)

export type ExtensionOutput = {
  id: string;
  click: string;
  status: string; // the popup's status line after the click
  yields: "download" | "page";
  title: string; // window title for the view: the file name, or the opened page's title
  url?: string; // the opened page's URL, without its fragment
  file?: string; // download, relative to the media dir
  pdf?: string; // page: PDF of it (`page.pdf()`), relative to the media dir
  view: string; // camera-ready PNG + its CaptureMeta JSON (same stem), relative to the media dir
};
export type ExtensionMeta = {
  version: typeof EXT_META_VERSION;
  extension: { id: string; name: string; version: string; icon?: string };
  popup: { png: string; width: number; height: number }; // output px
  after: Record<string, { png: string; width: number; height: number }>; // the popup once that output's click finished
  outputs: Record<string, ExtensionOutput>;
};

export const extensionFiles = (mediaDir: string, captureId: string, f: Format) => ({
  meta: join(mediaDir, `${captureId}-ext-${f}.json`),
  icon: join(mediaDir, `${captureId}-ext-icon.png`),
  popup: join(mediaDir, `${captureId}-popup-${f}.png`),
  after: (out: string) => join(mediaDir, `${captureId}-popup-${out}-${f}.png`),
  download: (out: string, ext: string) => join(mediaDir, `${captureId}-${out}-${f}${ext}`),
  pdf: (out: string) => join(mediaDir, `${captureId}-${out}-${f}.pdf`),
  view: (out: string) => ({ png: join(mediaDir, `${captureId}-${out}-${f}.png`), meta: join(mediaDir, `${captureId}-${out}-${f}.json`) }),
});

/** Content hash of the copied build, so a rebuilt extension re-records. */
export function extensionBuildHash(name: string): string {
  const dir = join(EXT_SRC, name);
  if (!existsSync(join(dir, "manifest.json"))) {
    throw new VideoMillError(`extension "${name}" not copied in — on the host: \`make ext-copy SRC=<unpacked build dir> NAME=${name}\``);
  }
  const files: string[] = [];
  const walk = (d: string) => readdirSync(d).sort().forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : files.push(join(d, n))));
  walk(dir);
  return hashOf(files.map((p) => [relative(dir, p), readFileSync(p).toString("base64")]));
}

/**
 * Copy of the build Chromium loads. Its manifest adds host access to the
 * capture's origin: `activeTab` is granted only by a real toolbar click, which
 * automation can't make. The extension's UI and code are unchanged.
 */
function runCopy(name: string, url: string): string {
  const dir = join(EXT_RUN, name);
  rmSync(dir, { recursive: true, force: true });
  cpSync(join(EXT_SRC, name), dir, { recursive: true });
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  manifest.host_permissions = [...new Set([...(manifest.host_permissions ?? []), `${new URL(url).origin}/*`])];
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return dir;
}

async function screenshotPopup(popup: Page, path: string, scale: number): Promise<{ width: number; height: number }> {
  const box = await popup.evaluate(() => {
    const r = document.body.getBoundingClientRect();
    return { w: Math.ceil(Math.max(r.width, document.documentElement.scrollWidth)), h: Math.ceil(r.bottom + parseFloat(getComputedStyle(document.body).marginBottom || "0")) };
  });
  await popup.screenshot({ path, clip: { x: 0, y: 0, width: box.w, height: box.h } });
  return { width: Math.round(box.w * scale), height: Math.round(box.h * scale) };
}

const esc = (x: string) => x.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/**
 * A downloaded text file as an editor shows it: the real text, verbatim, with
 * line numbers, wrapped to the window. Anchors on it are ordinary selectors,
 * e.g. `.line:has-text("# The idealists")`.
 */
export function editorHtml(text: string): string {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#1e1e1e;color:#d4d4d4}
body{font:15px/1.6 'DejaVu Sans Mono','Noto Sans Mono',monospace;padding:16px 0}
.line{display:flex;padding-right:24px}
.n{flex:0 0 56px;text-align:right;padding-right:20px;color:#6e7681;user-select:none}
.t{white-space:pre-wrap;overflow-wrap:anywhere;flex:1}
.h{color:#569cd6;font-weight:700}.q{color:#6a9955}
</style></head><body>${lines.map((l, i) => {
    const cls = /^#{1,6} /.test(l) ? "t h" : /^> /.test(l) ? "t q" : "t";
    return `<div class="line"><span class="n">${i + 1}</span><span class="${cls}">${esc(l) || " "}</span></div>`;
  }).join("")}</body></html>`;
}

export async function recordExtension(cap: Capture, format: Format, mediaDir: string, viewAnchors: Record<string, string[]>): Promise<void> {
  const ext = cap.extension!;
  const { viewport, scale, mobile } = CAPTURE[format];
  const files = extensionFiles(mediaDir, cap.id, format);
  mkdirSync(mediaDir, { recursive: true });
  const dir = runCopy(ext.name, cap.url);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const popupPath = manifest.action?.default_popup ?? "popup.html";
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium", // bundled Chromium in new headless mode loads extensions; branded Chrome won't
    args: [`--disable-extensions-except=${dir}`, `--load-extension=${dir}`],
    viewport, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile, acceptDownloads: true,
  });
  try {
    // Popup-only extensions have no service worker; read the ID from chrome://extensions.
    const list = await context.newPage();
    await list.goto("chrome://extensions");
    const id: string = await list.evaluate(() =>
      (document.querySelector("extensions-manager") as any)?.shadowRoot?.querySelector("extensions-item-list")?.shadowRoot?.querySelector("extensions-item")?.id ?? "");
    await list.close();
    if (!id) throw new VideoMillError(`extension "${ext.name}" didn't load in Chromium — check the build in .cache/ext-src/${ext.name}`);

    // The toolbar icon the browser frame shows: the build's largest icon.
    const icons: Record<string, string> = manifest.icons ?? manifest.action?.default_icon ?? {};
    const iconFile = Object.entries(icons).sort((a, b) => Number(b[0]) - Number(a[0]))[0]?.[1];
    if (iconFile) copyFileSync(join(dir, iconFile), files.icon);

    const page = await context.newPage();
    await page.goto(cap.url, { waitUntil: "networkidle" });
    // window.print would block on the native dialog, which can't be recorded (prd.md § 5 v1.J).
    await context.addInitScript(() => { window.print = () => {}; });

    const popup = await context.newPage();
    await popup.setViewportSize({ width: POPUP_WIDTH, height: 600 });
    await popup.goto(`chrome-extension://${id}/${popupPath}`);
    const tabId = await popup.evaluate(async (u) => (await (globalThis as any).chrome.tabs.query({ url: u }))[0]?.id, page.url());
    if (tabId === undefined) throw new VideoMillError(`couldn't find the tab for ${cap.url}`);
    // `?tabId=` points the popup at the page instead of itself (tabmill popup template, for tests).
    await popup.goto(`chrome-extension://${id}/${popupPath}?tabId=${tabId}`);
    const meta: ExtensionMeta = {
      version: EXT_META_VERSION,
      extension: { id, name: manifest.name, version: manifest.version, icon: iconFile ? relative(mediaDir, files.icon) : undefined },
      popup: { png: relative(mediaDir, files.popup), ...(await screenshotPopup(popup, files.popup, scale)) },
      after: {},
      outputs: {},
    };

    const status = popup.getByRole("status");
    const statusText = async () => ((await status.count()) ? (await status.first().textContent())?.trim() ?? "" : "");
    for (const out of ext.outputs) {
      const button = popup.getByRole("button", { name: out.click, exact: true });
      if (!(await button.count())) throw new VideoMillError(`popup has no "${out.click}" button (output ${out.id})`);
      const view = files.view(out.id);
      const anchors = viewAnchors[out.id] ?? [];
      let o: ExtensionOutput;
      if (out.yields === "download") {
        const [dl] = await Promise.all([popup.waitForEvent("download"), button.click()]);
        const path = files.download(out.id, extname(dl.suggestedFilename()));
        await dl.saveAs(path);
        const editor = await context.newPage();
        await editor.setContent(editorHtml(readFileSync(path, "utf8")), { waitUntil: "load" });
        writeFileSync(view.meta, JSON.stringify(await measurePage(editor, anchors, scale, `${out.id} view @${format}`, view.png), null, 2) + "\n");
        await editor.close();
        o = { id: out.id, click: out.click, yields: "download", status: await statusText(), title: dl.suggestedFilename(), file: relative(mediaDir, path), view: relative(mediaDir, view.png) };
      } else {
        const [opened] = await Promise.all([context.waitForEvent("page"), button.click()]);
        await opened.waitForLoadState("networkidle");
        await opened.setViewportSize(viewport);
        const vm: CaptureMeta = await measurePage(opened, anchors, scale, `${out.id} view @${format}`, view.png);
        writeFileSync(view.meta, JSON.stringify(vm, null, 2) + "\n");
        await opened.pdf({ path: files.pdf(out.id) });
        const url = opened.url().split("#")[0]; // not URL.origin: it's "null" for chrome-extension:// pages
        o = { id: out.id, click: out.click, yields: "page", status: await statusText(), title: await opened.title(), url, pdf: relative(mediaDir, files.pdf(out.id)), view: relative(mediaDir, view.png) };
        await opened.close();
      }
      meta.outputs[out.id] = o;
      meta.after[out.id] = { png: relative(mediaDir, files.after(out.id)), ...(await screenshotPopup(popup, files.after(out.id), scale)) };
    }
    writeFileSync(files.meta, JSON.stringify(meta, null, 2) + "\n");
    info(`${cap.id} @${format}: ${meta.extension.name} ${meta.extension.version} — popup ${meta.popup.width}×${meta.popup.height}${ext.outputs.map((o) => `, ${o.id} → ${meta.outputs[o.id].title}`).join("")}`);
  } finally {
    await context.close();
  }
}
