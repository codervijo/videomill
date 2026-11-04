// Where a capture's page comes from (v1.L): a live `url`, or a `file` in this
// repo — an HTML page (e.g. a storyboard) or an image (e.g. a contact sheet),
// which is wrapped in a page that shows it full width.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { VideoMillError } from "../pipeline/step.js";
import type { Capture } from "../project/schema.js";

const IMAGE = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

/**
 * `href` = what the recorder opens; `label` = what a browser frame's address
 * bar shows; `key` changes when the content does (a file's hash), so a
 * regenerated file re-records.
 */
export function captureSource(cap: Capture, mediaDir: string): { href: string; label: string; key: string } {
  if (cap.url) return { href: cap.url, label: cap.url.replace(/^https?:\/\/(www\.)?/, ""), key: cap.url };
  const path = resolve(cap.file!);
  if (!existsSync(path)) throw new VideoMillError(`capture ${cap.id}: ${cap.file} doesn't exist — generate it first (e.g. \`videomill storyboard <slug>\`)`);
  const key = `file:${cap.file}:${createHash("sha256").update(readFileSync(path)).digest("hex").slice(0, 16)}`;
  if (!IMAGE.has(extname(path).toLowerCase())) return { href: pathToFileURL(path).href, label: cap.file!, key };
  mkdirSync(mediaDir, { recursive: true });
  const wrapper = join(mediaDir, `${cap.id}-src.html`);
  writeFileSync(wrapper, `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#fff}img{display:block;width:100%}</style></head><body><img src="${pathToFileURL(path).href}"></body></html>`);
  return { href: pathToFileURL(wrapper).href, label: cap.file!, key };
}
