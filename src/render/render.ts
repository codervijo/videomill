// Remotion bundle + render, and an ffmpeg contact sheet.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { Format } from "../constants.js";
import { hashOf } from "../pipeline/step.js";
import type { PageCameraProps } from "../remotion/PageCamera.js";

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
  props: PageCameraProps,
  publicDir: string,
  outPath: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const serveUrl = await serveUrlFor(publicDir);
  const id = `PageCamera-${format}`;
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

/**
 * Join per-scene clips into one video. Video is stream-copied (all clips come
 * from the same composition settings); audio is re-encoded to avoid AAC
 * priming clicks at the joins.
 */
export function concatClips(clips: string[], outPath: string): void {
  mkdirSync(dirname(outPath), { recursive: true });
  const list = `${outPath}.txt`;
  writeFileSync(list, clips.map((c) => `file '${resolve(c).replace(/'/g, "'\\''")}'`).join("\n") + "\n");
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list,
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", outPath,
  ]);
}

export function probeDurationSec(path: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  return parseFloat(out.toString().trim());
}
