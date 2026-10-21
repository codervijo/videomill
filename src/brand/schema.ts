// `brands/<id>/brand.json` — videomill-brand-v1 (docs/architecture.md § 3).
// Asset paths are relative to the brand folder.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { z } from "zod";
import { VideoMillError } from "../pipeline/step.js";

export const BRAND_SCHEMA = "videomill-brand-v1";
export const BRANDS_DIR = resolve("brands");

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "#rrggbb");
const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and dashes");

// No `file` = rely on the renderer's system sans (Noto Sans in the container).
const Font = z.object({ family: z.string().min(1), file: z.string().optional(), uppercase: z.boolean().default(false) }).strict();

export const Brand = z.object({
  schema: z.literal(BRAND_SCHEMA),
  id,
  name: z.string().min(1),
  // Logo for light / dark backgrounds. `withName` = the file is an icon; render `name` beside it.
  logo: z.object({ light: z.string(), dark: z.string().optional(), withName: z.boolean().default(false) }).strict(),
  colors: z.object({
    primary: hex, // CTA / accent
    onPrimary: hex, // text on primary
    background: hex,
    text: hex,
    muted: hex,
  }).strict(),
  fonts: z.object({ text: Font, cta: Font.optional() }).strict(),
  voice: z.string().optional(), // TTS voice when the project sets none
  endCard: z.object({
    headline: z.string().min(1), // the CTA, in the site's own words
    url: z.string().min(1), // shown as-is, e.g. "lamillrentals.com"
    seconds: z.number().positive().default(2), // ~2 s (operator, v1.I; was 3)
    say: z.string().min(1).optional(), // spoken over the card
  }).strict().optional(),
  // Parent brand that presents this one: `signoff` + parent logo under this
  // brand's end-card CTA, and — only with `opener: true` (v1.I; off by default)
  // — a silent opener in the parent's look (parent logo + `intro`, then the site).
  parent: z.object({
    brand: id,
    opener: z.boolean().default(false),
    intro: z.string().min(1).default("Introducing"),
    introSeconds: z.number().positive().default(1.5),
    signoff: z.string().min(1).default("Part of"),
  }).strict().optional(),
}).strict();

export type Brand = z.infer<typeof Brand>;

export const brandDir = (brandId: string) => join(BRANDS_DIR, brandId);

export function loadBrand(brandId: string): Brand {
  const path = join(brandDir(brandId), "brand.json");
  if (!existsSync(path)) throw new VideoMillError(`brand "${brandId}" not found — create ${path}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    throw new VideoMillError(`${path}: invalid JSON (${(e as Error).message})`);
  }
  const r = Brand.safeParse(raw);
  if (!r.success) throw new VideoMillError(`${path}:\n${r.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n")}`);
  if (r.data.id !== brandId) throw new VideoMillError(`${path}: id "${r.data.id}" must equal the folder name "${brandId}"`);
  const b = r.data;
  for (const f of [b.logo.light, b.logo.dark, b.fonts.text.file, b.fonts.cta?.file]) {
    if (f && !existsSync(join(brandDir(brandId), f))) throw new VideoMillError(`${path}: asset not found: ${f}`);
  }
  return b;
}

/** Relative luminance check, to pick the logo variant for a background. */
export function isDark(color: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
