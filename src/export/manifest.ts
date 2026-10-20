// `manifest.json` — videomill-export-v1 (ADR-0005; fields in docs/architecture.md § 3).
// Additive-only within v1: never rename, remove or retype a field here.
import { CAPTION_LANG, FORMATS, FPS, type Format } from "../constants.js";
import type { Project } from "../project/schema.js";

export const EXPORT_SCHEMA = "videomill-export-v1";

export const videoFile = (f: Format) => `video-${f}.mp4`;
export const CAPTIONS_FILE = "captions.srt";

export type Manifest = ReturnType<typeof buildManifest>;

export function buildManifest(p: Project & { publish: NonNullable<Project["publish"]> }, o: { createdAt: string; commit: string; durations: Partial<Record<Format, number>> }) {
  return {
    schema: EXPORT_SCHEMA,
    complete: true,
    project: p.slug,
    type: p.type,
    brand: p.brand,
    createdAt: o.createdAt,
    videomillCommit: o.commit,
    source: p.source,
    title: p.publish.title,
    description: p.publish.description,
    hashtags: p.publish.hashtags,
    channels: p.publish.channels,
    utm: p.publish.utm,
    videos: p.formats.map((f) => ({ format: f, ...FORMATS[f], fps: FPS, durationSec: Math.round(o.durations[f]! * 1000) / 1000, path: videoFile(f) })),
    captions: [{ lang: CAPTION_LANG, path: CAPTIONS_FILE }],
  };
}
