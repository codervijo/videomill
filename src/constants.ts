// Canonical enums shared across modules (docs/CLAUDE.md § Canonical enums).

export const FORMATS = {
  "16x9": { width: 1920, height: 1080 },
  "9x16": { width: 1080, height: 1920 },
} as const;
export type Format = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as Format[];

export const VIDEO_TYPES = ["site-promo", "build-in-public"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];

// v1: YouTube + X only (prd.md § 5); tiktok is v2+.
export const CHANNELS = ["youtube", "x"] as const;
export type Channel = (typeof CHANNELS)[number];

export const FPS = 30;

// Browser capture per format. Viewport × deviceScaleFactor = frame width,
// so full-page screenshots map 1:1 onto output pixels.
export const CAPTURE: Record<Format, { viewport: { width: number; height: number }; scale: number; mobile: boolean }> = {
  "16x9": { viewport: { width: 1920, height: 1080 }, scale: 1, mobile: false },
  "9x16": { viewport: { width: 540, height: 960 }, scale: 2, mobile: true },
};
