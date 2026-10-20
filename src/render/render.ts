// Remotion bundle + render, and an ffmpeg contact sheet.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { Format } from "../constants.js";
import { hashOf } from "../pipeline/step.js";
import type { SiteScrollProps } from "../remotion/SiteScroll.js";

const ENTRY = resolve("src/remotion/index.ts");
const REMOTION_DIR = resolve("src/remotion");

/** Hash of the composition source, so render steps re-run when scene code changes. */
export function compositionHash(): string {
  return hashOf(readdirSync(REMOTION_DIR).sort().map((f) => readFileSync(join(REMOTION_DIR, f), "utf8")));
}
const bundles = new Map<string, string>();

async function serveUrlFor(publicDir: string): Promise<string> {
  let url = bundles.get(publicDir);
  if (!url) {
    url = await bundle({ entryPoint: ENTRY, publicDir });
    bundles.set(publicDir, url);
  }
  return url;
}

export async function renderScene(
  format: Format,
  props: SiteScrollProps,
  publicDir: string,
  outPath: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const serveUrl = await serveUrlFor(publicDir);
  const id = `SiteScroll-${format}`;
  const composition = await selectComposition({ serveUrl, id, inputProps: props });
  mkdirSync(dirname(outPath), { recursive: true });
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outPath,
    inputProps: props,
    concurrency: 4,
    chromiumOptions: { enableMultiProcessOnLinux: true },
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10) * 10;
      if (pct !== last) { last = pct; onProgress?.(pct); }
    },
  });
}

/** One frame per second, tiled — a quick visual check of a render. */
export function contactSheet(videoPath: string, outPath: string, format: Format): void {
  const cols = format === "9x16" ? 6 : 4;
  const rows = Math.ceil(Math.ceil(probeDurationSec(videoPath)) / cols);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", videoPath,
    "-vf", `fps=1,scale=${format === "9x16" ? 270 : 480}:-1,tile=${cols}x${rows}:padding=6:color=white`,
    "-frames:v", "1", outPath,
  ]);
}

/** Width/height from a PNG's IHDR chunk. */
export function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

export function probeDurationSec(path: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  return parseFloat(out.toString().trim());
}
