// `new` — scaffold projects/<slug>/project.json. Narration/captions are left
// empty for the drafting step (Claude Code + operator); render refuses until filled.
import { existsSync } from "node:fs";
import { FORMAT_IDS, VIDEO_TYPES, type VideoType } from "../constants.js";
import { ok, VideoMillError } from "../pipeline/step.js";
import { projectPath, writeProject } from "../project/load.js";
import { Project, PROJECT_SCHEMA } from "../project/schema.js";

export function newProject(slug: string, opts: { type?: string; brand?: string; url?: string }): void {
  if (existsSync(projectPath(slug))) throw new VideoMillError(`projects/${slug}/project.json already exists`);
  if (!opts.type || !VIDEO_TYPES.includes(opts.type as VideoType)) throw new VideoMillError(`--type must be one of: ${VIDEO_TYPES.join(", ")}`);
  if (!opts.brand) throw new VideoMillError("--brand <id> is required");
  if (!opts.url) throw new VideoMillError("--url <page> is required (markdown sources arrive later)");

  const parsed = Project.safeParse({
    schema: PROJECT_SCHEMA,
    slug,
    type: opts.type,
    brand: opts.brand,
    source: { url: opts.url },
    formats: [...FORMAT_IDS],
    captures: [{ id: "page", url: opts.url }],
    scenes: [{ id: "intro", kind: "page-scroll", capture: "page", from: "top", narration: "", caption: "" }],
  });
  if (!parsed.success) throw new VideoMillError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  writeProject(parsed.data);
  ok(`created projects/${slug}/project.json — fill in scenes (narration, caption, anchors), then \`videomill render ${slug}\``);
}
