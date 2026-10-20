// `projects/<slug>/project.json` — videomill-project-v1 (docs/architecture.md § 3).
import { createHash } from "node:crypto";
import { z } from "zod";
import { CHANNELS, FORMAT_IDS, VIDEO_TYPES } from "../constants.js";

export const PROJECT_SCHEMA = "videomill-project-v1";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes");

// "top" or a Playwright selector on the captured page, e.g. 'h2:has-text("Rental Categories")'.
const anchor = z.string().min(1);

const framing = z.object({ from: anchor.optional(), to: anchor.optional() }).strict();

export const Capture = z.object({
  id,
  url: z.string().url(),
}).strict();

// Shot primitives (v1.D). A scene's camera starts at `from`; each shot moves it.
// hold/pan/zoom take time; cut is instant. `at` on hold also cuts first.
export const Shot = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("hold"), seconds: z.number().positive(), at: anchor.optional() }).strict(),
  // pan `to` is an anchor, or "+N" = N frame-heights down from the current view
  z.object({ kind: z.literal("pan"), seconds: z.number().positive(), to: anchor }).strict(),
  z.object({ kind: z.literal("zoom"), seconds: z.number().positive(), target: anchor, fill: z.number().min(0.2).max(1).default(0.85) }).strict(),
  z.object({ kind: z.literal("cut"), to: anchor }).strict(),
]);

export const Scene = z.object({
  id,
  kind: z.literal("page-scroll"),
  capture: id,
  from: anchor.default("top"),
  to: anchor.optional(), // else pan `screens` screen-heights from `from`
  screens: z.number().min(0).max(4).default(1),
  narration: z.string(),
  caption: z.string(),
  minSeconds: z.number().positive().default(3),
  framing: z.partialRecord(z.enum(FORMAT_IDS), framing).optional(),
  shots: z.array(Shot).min(1).optional(),
}).strict().refine((s) => !(s.shots && s.to), { message: "`to` is ignored when `shots` is set — use a pan/cut shot", path: ["to"] });

export const Project = z.object({
  schema: z.literal(PROJECT_SCHEMA),
  slug: id,
  type: z.enum(VIDEO_TYPES),
  brand: id,
  source: z.object({ url: z.string().url().optional(), file: z.string().optional() }).strict()
    .refine((s) => s.url || s.file, "source needs url or file"),
  formats: z.array(z.enum(FORMAT_IDS)).min(1),
  voice: z.string().default("af_heart"),
  approval: z.object({
    status: z.enum(["draft", "approved"]),
    approvedAt: z.string().optional(),
    hash: z.string().optional(),
  }).strict().default({ status: "draft" }),
  captures: z.array(Capture).min(1),
  scenes: z.array(Scene).min(1),
  publish: z.object({
    title: z.string(),
    description: z.string(),
    hashtags: z.array(z.string()),
    channels: z.array(z.enum(CHANNELS)),
    utm: z.object({ medium: z.string(), campaign: z.string(), content: z.string() }).strict(),
  }).strict().optional(),
}).strict().superRefine((p, ctx) => {
  const dup = (ids: string[]) => ids.find((x, i) => ids.indexOf(x) !== i);
  const d1 = dup(p.captures.map((c) => c.id));
  if (d1) ctx.addIssue({ code: "custom", path: ["captures"], message: `duplicate capture id "${d1}"` });
  const d2 = dup(p.scenes.map((s) => s.id));
  if (d2) ctx.addIssue({ code: "custom", path: ["scenes"], message: `duplicate scene id "${d2}"` });
  const caps = new Set(p.captures.map((c) => c.id));
  p.scenes.forEach((s, i) => {
    if (!caps.has(s.capture)) ctx.addIssue({ code: "custom", path: ["scenes", i, "capture"], message: `unknown capture "${s.capture}"` });
  });
});

export type Project = z.infer<typeof Project>;
export type Scene = z.infer<typeof Scene>;
export type Capture = z.infer<typeof Capture>;
export type Shot = z.infer<typeof Shot>;

/** Hash of the scene content, used for approval (v1.G). */
export function scenesHash(p: Project): string {
  return createHash("sha256").update(JSON.stringify({ captures: p.captures, scenes: p.scenes, voice: p.voice })).digest("hex").slice(0, 16);
}

/** All anchors a capture must resolve, across scenes and per-format framing. */
export function anchorsFor(p: Project, captureId: string): string[] {
  const set = new Set<string>();
  for (const s of p.scenes.filter((s) => s.capture === captureId)) {
    const shotAnchors = (s.shots ?? []).map((sh) => (sh.kind === "zoom" ? sh.target : sh.kind === "hold" ? sh.at : sh.to));
    for (const a of [s.from, s.to, ...shotAnchors, ...Object.values(s.framing ?? {}).flatMap((f) => [f?.from, f?.to])]) {
      if (a && a !== "top" && !a.startsWith("+")) set.add(a);
    }
  }
  return [...set].sort();
}
