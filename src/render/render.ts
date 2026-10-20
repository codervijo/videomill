// Remotion bundle + render; ffmpeg concat, loudness, SRT and contact sheet.
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { LOUDNESS, type Format } from "../constants.js";
import { hashOf, VideoMillError } from "../pipeline/step.js";
import type { BrandCardProps } from "../remotion/BrandCard.js";
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

/** Composition id → its props. */
export type Clip = { comp: "PageCamera"; props: PageCameraProps } | { comp: "BrandCard"; props: BrandCardProps };

export async function renderClip(
  format: Format,
  clip: Clip,
  publicDir: string,
  outPath: string,
  onProgress?: (pct: number) => void,
): Promise<void> {
  const serveUrl = await serveUrlFor(publicDir);
  const id = `${clip.comp}-${format}`;
  const props = clip.props;
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
    enforceAudioTrack: true, // silent cards still need an audio stream for concat
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

/**
 * Two-pass EBU R128 normalisation to LOUDNESS (ffmpeg loudnorm). Video is
 * stream-copied. Returns integrated loudness before and after, in LUFS.
 */
export function normalizeLoudness(inPath: string, outPath: string): { before: number; after: number } {
  const target = `I=${LOUDNESS.I}:TP=${LOUDNESS.TP}:LRA=${LOUDNESS.LRA}`;
  const m = measure(inPath, `loudnorm=${target}:print_format=json`);
  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error", "-i", inPath,
    "-af", `loudnorm=${target}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", outPath,
  ]);
  return { before: parseFloat(m.input_i), after: measureLufs(outPath) };
}

/** Integrated loudness of a file's audio, in LUFS. */
export function measureLufs(path: string): number {
  return parseFloat(measure(path, `loudnorm=I=${LOUDNESS.I}:print_format=json`).input_i);
}

function measure(path: string, filter: string): Record<string, string> {
  // loudnorm prints its JSON report on stderr after the run.
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", path, "-af", filter, "-vn", "-f", "null", "-"], { encoding: "utf8" });
  const json = r.stderr.slice(r.stderr.lastIndexOf("{"), r.stderr.lastIndexOf("}") + 1);
  if (r.status !== 0 || !json) throw new VideoMillError(`loudness measure failed on ${path}: ${r.stderr.trim().split("\n").at(-1)}`);
  return JSON.parse(json);
}

/** SubRip captions from cues in seconds. */
export function writeSrt(cues: { start: number; end: number; text: string }[], outPath: string): void {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000);
    const p = (n: number, w = 2) => String(n).padStart(w, "0");
    return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join("\n"));
}

export function probeDurationSec(path: string): number {
  const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]);
  return parseFloat(out.toString().trim());
}
