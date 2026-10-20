// `storyboard` and `approve` — the operator gate before render (v1.G).
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadBrand } from "../brand/schema.js";
import { info, ok, soft, step, StampFile, VideoMillError } from "../pipeline/step.js";
import { loadProject, projectDir, projectPath } from "../project/load.js";
import { approvalHash, approvalState } from "../project/schema.js";
import { captureFiles } from "../record/site.js";
import { phrasesOf } from "../render/timeline.js";
import { writeStoryboard } from "../storyboard/build.js";
import { recordAll, type RunOpts } from "./render.js";

export const storyboardFiles = (slug: string) => {
  const out = resolve("out", slug);
  return { html: join(out, "storyboard.html"), png: join(out, "storyboard.png") };
};

/** Record (if needed) and write the storyboard for the current project content. */
export async function storyboard(slug: string, opts: Pick<RunOpts, "force">): Promise<void> {
  const p = loadProject(slug);
  const brand = loadBrand(p.brand);
  const parent = brand.parent ? loadBrand(brand.parent.brand) : undefined;
  const out = resolve("out", slug);
  const media = join(projectDir(slug), "media");
  const stamps = new StampFile(join(out, "stamps.json"));
  console.log(`videomill storyboard ${slug}`);
  await recordAll({ p, media, stamps }, p.formats, false);

  const hash = approvalHash(p);
  const status = approvalState(p);
  const captures = Object.fromEntries(p.captures.map((c) => [c.id, Object.fromEntries(p.formats.map((f) => [f, captureFiles(media, c.id, f)]))]));
  const files = storyboardFiles(slug);
  const records = p.captures.flatMap((c) => p.formats.map((f) => stamps.get(`record ${c.id} ${f}`)));
  await step(stamps, "storyboard", { hash, status, records, brand, parent, v: 1 }, [files.html, files.png],
    () => writeStoryboard({ p, brand, parent, status, hash, captures }, files.html, files.png), opts.force);
  info(`out/${slug}/storyboard.html — status ${status}`);
}

/** Approve the current content: refreshes the storyboard, prints the script, stamps the hash. */
export async function approve(slug: string): Promise<void> {
  await storyboard(slug, { force: false });
  const p = loadProject(slug);
  const lines = p.scenes.flatMap((s) => phrasesOf(s).map((ph) => `${s.id}: “${ph.say}”${ph.caption && ph.caption !== ph.say ? `  [${ph.caption}]` : ""}`));
  if (lines.every((l) => l.includes("“”"))) throw new VideoMillError("nothing to approve — scenes have no narration yet");
  console.log("script:");
  for (const l of lines) info(l);
  const hash = approvalHash(p);
  if (approvalState(p) === "approved") { ok(`already approved (hash ${hash})`); return; }

  // Edit the file as written (not the parsed project) so zod defaults don't get materialised into it.
  const raw = JSON.parse(readFileSync(projectPath(slug), "utf8"));
  raw.approval = { status: "approved", approvedAt: new Date().toISOString(), hash };
  writeFileSync(projectPath(slug), JSON.stringify(raw, null, 2) + "\n");
  ok(`approved ${slug} (hash ${hash}) — \`videomill render ${slug}\``);
}

/** Render gate: ✗ unless the current content is approved. */
export function requireApproved(slug: string): void {
  const p = loadProject(slug);
  const state = approvalState(p);
  if (state === "approved") return;
  if (state === "edited since approval") soft(`project.json changed after approval (was ${p.approval.hash}, now ${approvalHash(p)})`);
  throw new VideoMillError(`${slug} is ${state} — review \`videomill storyboard ${slug}\` (out/${slug}/storyboard.html), then \`videomill approve ${slug}\``);
}
