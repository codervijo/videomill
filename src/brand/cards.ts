// Brand → what the Remotion cards and captions need (v1.F). Brand folders are
// staged into the project's media dir, which Remotion serves as publicDir.
import { cpSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hashOf } from "../pipeline/step.js";
import type { CardBrand } from "../remotion/BrandCard.js";
import type { FontRef } from "../remotion/fonts.js";
import { brandDir, isDark, type Brand } from "./schema.js";

/** Hash of every file in the brand folder, so edits re-stage and re-render. */
export function brandHash(brandId: string): string {
  const dir = brandDir(brandId);
  const files = readdirSync(dir, { recursive: true, withFileTypes: true }).filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name)).sort();
  return hashOf(files.map((f) => [f.slice(dir.length), readFileSync(f).toString("base64")]));
}

/** Copy brands/<id>/ to <media>/brand/<id>/. */
export function stageBrand(brandId: string, mediaDir: string): void {
  cpSync(brandDir(brandId), join(mediaDir, "brand", brandId), { recursive: true });
}

const pub = (b: Brand, file: string) => `brand/${b.id}/${file}`;
const font = (b: Brand, f?: Brand["fonts"]["text"]): FontRef | undefined =>
  f && { family: f.family, file: f.file && pub(b, f.file), uppercase: f.uppercase };

export const textFont = (b: Brand) => font(b, b.fonts.text)!;

/** The brand as a card on `background` (default: its own); picks the logo variant. */
export function cardBrand(b: Brand, background = b.colors.background): CardBrand {
  const logo = isDark(background) && b.logo.dark ? b.logo.dark : b.logo.light;
  return { name: b.name, logo: pub(b, logo), withName: b.logo.withName, colors: b.colors, text: textFont(b), cta: font(b, b.fonts.cta) };
}
