import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { VideoMillError } from "../pipeline/step.js";
import { Project } from "./schema.js";

export const projectDir = (slug: string) => resolve("projects", slug);
export const projectPath = (slug: string) => join(projectDir(slug), "project.json");

export function loadProject(slug: string): Project {
  const path = projectPath(slug);
  if (!existsSync(path)) throw new VideoMillError(`no project at projects/${slug}/project.json — create it with \`videomill new ${slug} …\``);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new VideoMillError(`projects/${slug}/project.json is not valid JSON: ${(e as Error).message}`);
  }
  const r = Project.safeParse(raw);
  if (!r.success) {
    const lines = r.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new VideoMillError(`projects/${slug}/project.json is invalid:\n${lines.join("\n")}`);
  }
  if (r.data.slug !== slug) throw new VideoMillError(`project.json slug "${r.data.slug}" ≠ folder "${slug}"`);
  return r.data;
}

export function writeProject(p: Project): void {
  mkdirSync(projectDir(p.slug), { recursive: true });
  writeFileSync(projectPath(p.slug), JSON.stringify(p, null, 2) + "\n");
}
