// `qa` — checks the rendered outputs before `export` (v1.H): captions in the
// safe zone and off the shot's subject, loudness on target, contact sheet current.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { LOUDNESS, QA, type Format } from "../constants.js";
import { fail, hashOf, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import { loadProject, projectDir } from "../project/load.js";
import { approvalHash, type Project } from "../project/schema.js";
import { captionIssues, measureCaptions, type Timeline } from "../qa/captions.js";
import { captureFiles, type CaptureMeta } from "../record/site.js";
import { measureLoudness } from "../render/render.js";
import { requireApproved } from "./approve.js";

const QA_VERSION = 1; // bump when a check changes, so passed results re-run

export const qaFiles = (slug: string, f: Format) => {
  const out = resolve("out", slug);
  return { video: join(out, `${slug}-${f}.mp4`), srt: join(out, `${slug}-${f}.srt`), sheet: join(out, `${slug}-${f}-contact.png`), timeline: join(out, `timeline-${f}.json`), report: join(out, `qa-${f}.json`) };
};

/** Everything a `qa <f>` pass depends on. `export` compares it to the stored stamp. */
export const qaInputs = (p: Project, stamps: StampFile, f: Format) => ({
  approval: approvalHash(p),
  rendered: stamps.get(`rendered ${f}`),
  video: stamps.get(`loudness ${f}`),
  srt: stamps.get(`captions ${f}`),
  sheet: stamps.get(`contact sheet ${f}`),
  timeline: stamps.get(`timeline ${f}`),
  thresholds: { QA, LOUDNESS },
  v: QA_VERSION,
});

/** ✗ unless `render` produced this format's outputs from the current approved content. */
export function requireRendered(p: Project, stamps: StampFile, f: Format): void {
  if (stamps.get(`rendered ${f}`) !== approvalHash(p)) throw new VideoMillError(`${f} outputs aren't from the current approved content — run \`videomill render ${p.slug}\``);
}

type Check = { name: string; ok: boolean; detail: string };

async function checkFormat(p: Project, f: Format): Promise<Check[]> {
  const files = qaFiles(p.slug, f);
  const media = join(projectDir(p.slug), "media");
  const t: Timeline = JSON.parse(readFileSync(files.timeline, "utf8"));
  const metas = Object.fromEntries(p.captures.map((c) => [c.id, JSON.parse(readFileSync(captureFiles(media, c.id, f).meta, "utf8")) as CaptureMeta]));
  const texts = [...new Set(t.scenes.flatMap((s) => s.phrases.map((ph) => ph.caption).filter(Boolean)))];
  const boxes = await measureCaptions(f, texts, t.font, t.font?.file && join(media, t.font.file));
  const issues = captionIssues(t, metas, boxes);
  const loud = measureLoudness(files.video);
  return [
    {
      name: "captions",
      ok: issues.length === 0,
      detail: issues.length === 0 ? `${texts.length} caption(s) inside the safe zone, none over the shot's subject`
        : issues.map((x) => `${x.scene} @${x.at.toFixed(1)}s “${x.caption}”: ${x.problem}`).join("\n"),
    },
    {
      name: "loudness",
      ok: Math.abs(loud.i - LOUDNESS.I) <= QA.lufsTolerance && loud.tp <= QA.maxTruePeak,
      detail: `${loud.i.toFixed(1)} LUFS (target ${LOUDNESS.I} ±${QA.lufsTolerance}), true peak ${loud.tp.toFixed(1)} dBTP (max ${QA.maxTruePeak})`,
    },
    { name: "contact sheet", ok: existsSync(files.sheet), detail: `out/${p.slug}/${p.slug}-${f}-contact.png` },
  ];
}

export async function qa(slug: string, opts: { force: boolean; format?: Format }): Promise<void> {
  requireApproved(slug);
  const p = loadProject(slug);
  const stamps = new StampFile(resolve("out", slug, "stamps.json"));
  const formats = opts.format ? [opts.format] : p.formats;
  console.log(`videomill qa ${slug} — ${formats.join(", ")}`);
  const failed: string[] = [];
  for (const f of formats) {
    const files = qaFiles(slug, f);
    try {
      requireRendered(p, stamps, f);
    } catch (e) {
      fail((e as Error).message);
      failed.push(f);
      continue;
    }
    try {
      await step(stamps, `qa ${f}`, qaInputs(p, stamps, f), [files.report], async () => {
        const checks = await checkFormat(p, f);
        writeFileSync(files.report, JSON.stringify({ format: f, passed: checks.every((c) => c.ok), checkedAt: new Date().toISOString(), inputs: hashOf(qaInputs(p, stamps, f)), checks }, null, 2) + "\n");
        for (const c of checks) {
          const [first, ...rest] = c.detail.split("\n");
          (c.ok ? ok : fail)(`${f} ${c.name} — ${first}`);
          for (const line of rest) info(line);
        }
        const bad = checks.filter((c) => !c.ok).map((c) => c.name);
        if (bad.length) throw new VideoMillError(`${bad.join(", ")} failed — details in out/${slug}/qa-${f}.json`);
      }, opts.force);
    } catch (e) {
      if (!(e instanceof VideoMillError)) throw e;
      failed.push(f); // step() already printed the ✗
    }
  }
  if (failed.length) throw new VideoMillError(`qa failed for ${failed.join(", ")} — fix what's listed above, then re-run qa`);
  ok(`qa passed — \`videomill export ${slug}\``);
}
