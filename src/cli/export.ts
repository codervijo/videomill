// `export` — the RankMill hand-off folder (ADR-0005): exports/<slug>/<UTC-ts>/
// with per-format MP4s, the SRT and manifest.json. Refuses unless approved and
// `qa` passed on exactly these outputs.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildManifest, CAPTIONS_FILE, videoFile } from "../export/manifest.js";
import { hashOf, info, ok, soft, step, StampFile, VideoMillError } from "../pipeline/step.js";
import { loadProject } from "../project/load.js";
import { probeDurationSec } from "../render/render.js";
import { requireApproved } from "./approve.js";
import { qaFiles, qaInputs, requireRendered } from "./qa.js";

export const EXPORTS_DIR = resolve("exports");

function git(...args: string[]): string {
  // The repo is bind-mounted into the container under another owner; trust it for this call only.
  return execFileSync("git", ["-c", `safe.directory=${process.cwd()}`, ...args], { encoding: "utf8" }).trim();
}

export async function exportProject(slug: string, opts: { force: boolean }): Promise<void> {
  requireApproved(slug);
  const p = loadProject(slug);
  const stamps = new StampFile(resolve("out", slug, "stamps.json"));
  console.log(`videomill export ${slug}`);
  if (!p.publish) throw new VideoMillError(`${slug} has no \`publish\` block (title, description, hashtags, channels, utm) — add it, re-approve, re-render`);
  const publish = p.publish;
  for (const f of p.formats) {
    requireRendered(p, stamps, f);
    if (stamps.get(`qa ${f}`) !== hashOf(qaInputs(p, stamps, f))) throw new VideoMillError(`qa hasn't passed on the current ${f} outputs — run \`videomill qa ${slug}\``);
  }
  ok(`approved, qa passed (${p.formats.join(", ")})`);

  // One SRT for all formats: cue timings come from the phrase timeline, which doesn't depend on format.
  const srts = p.formats.map((f) => readFileSync(qaFiles(slug, f).srt, "utf8"));
  if (srts.some((x) => x !== srts[0])) throw new VideoMillError(`captions differ between formats (${p.formats.join(", ")}) — a manifest carries one SRT; re-render`);

  const commit = git("rev-parse", "HEAD");
  if (git("status", "--porcelain")) soft(`working tree has uncommitted changes — manifest records ${commit.slice(0, 7)}, which isn't exactly what rendered`);

  const dir = join(EXPORTS_DIR, slug);
  const latest = join(dir, "latest");
  const inputs = { qa: p.formats.map((f) => stamps.get(`qa ${f}`)), publish, source: p.source }; // not the commit: a docs-only commit isn't a new export
  await step(stamps, "export", inputs, [join(latest, "manifest.json")], async () => {
    const ts = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z"); // 20261020T153000Z
    const tmp = join(dir, `.tmp-${ts}`);
    if (existsSync(join(dir, ts))) throw new VideoMillError(`exports/${slug}/${ts} already exists — retry in a second`);
    mkdirSync(tmp, { recursive: true });
    const durations: Record<string, number> = {};
    let manifest;
    try {
      for (const f of p.formats) {
        copyFileSync(qaFiles(slug, f).video, join(tmp, videoFile(f)));
        durations[f] = probeDurationSec(join(tmp, videoFile(f)));
      }
      copyFileSync(qaFiles(slug, p.formats[0]).srt, join(tmp, CAPTIONS_FILE));
      manifest = buildManifest({ ...p, publish }, { createdAt: new Date().toISOString(), commit, durations });
      writeFileSync(join(tmp, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
      renameSync(tmp, join(dir, ts)); // atomic: consumers never see a half-written folder
    } catch (e) {
      rmSync(tmp, { recursive: true, force: true });
      throw e;
    }
    rmSync(latest, { force: true });
    symlinkSync(ts, latest); // relative, so the exports folder can move
    info(`exports/${slug}/${ts}/ — ${manifest.videos.map((v) => `${v.path} ${v.durationSec}s`).join(", ")}, ${CAPTIONS_FILE}`);
  }, opts.force);
  ok(`exports/${slug}/latest → ${readlinkSync(latest)} (manifest.json, ${p.formats.map(videoFile).join(", ")}, ${CAPTIONS_FILE})`);
}
