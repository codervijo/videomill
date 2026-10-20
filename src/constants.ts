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
  "16x9": { viewport: { width: 1280, height: 720 }, scale: 1.5, mobile: false },
  "9x16": { viewport: { width: 540, height: 960 }, scale: 2, mobile: true },
};

// Area kept clear of platform UI, in output px (top, right, bottom, left).
// 9x16: Google's YouTube vertical-video safe zone — template + diagram on
// https://support.google.com/google-ads/answer/13547298 (verified 2026-10-20).
// No organic-Shorts or X spec exists; we apply Google's to both.
// 16x9: no platform overlay spec; zero insets.
export const SAFE_ZONE: Record<Format, { top: number; right: number; bottom: number; left: number }> = {
  "16x9": { top: 0, right: 0, bottom: 0, left: 0 },
  "9x16": { top: 288, right: 192, bottom: 672, left: 48 },
};

// Loudness target for the assembled track (operator-set in prd.md v1.E); two-pass loudnorm.
export const LOUDNESS = { I: -14, TP: -1.5, LRA: 11 } as const;
