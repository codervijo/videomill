import assert from "node:assert/strict";
import { test } from "node:test";
import { Project } from "../project/schema.js";
import { buildManifest, EXPORT_SCHEMA } from "./manifest.js";

test("manifest carries the videomill-export-v1 fields, paths relative to the export folder", () => {
  const p = Project.parse({
    schema: "videomill-project-v1", slug: "demo", type: "site-promo", brand: "b", source: { url: "https://example.com/" },
    formats: ["16x9", "9x16"], captures: [{ id: "page", url: "https://example.com/" }],
    scenes: [{ id: "s", kind: "page-scroll", capture: "page", narration: "Hi.", caption: "Hi" }],
    publish: { title: "T", description: "D", hashtags: ["#a"], channels: ["youtube", "x"], utm: { medium: "social", campaign: "c", content: "demo" } },
  });
  const m = buildManifest({ ...p, publish: p.publish! }, { createdAt: "2026-10-20T00:00:00.000Z", commit: "abc", durations: { "16x9": 23.4567, "9x16": 23.4 } });
  assert.equal(m.schema, EXPORT_SCHEMA);
  assert.deepEqual(Object.keys(m), ["schema", "complete", "project", "type", "brand", "createdAt", "videomillCommit", "source", "title", "description", "hashtags", "channels", "utm", "videos", "captions"]);
  assert.deepEqual(m.videos[0], { format: "16x9", width: 1920, height: 1080, fps: 30, durationSec: 23.457, path: "video-16x9.mp4" });
  assert.deepEqual(m.captions, [{ lang: "en", path: "captions.srt" }]);
  assert.equal("source" in m.utm, false); // consumer sets utm.source per channel
});
