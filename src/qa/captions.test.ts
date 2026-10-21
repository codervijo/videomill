import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { CaptureMeta } from "../record/site.js";
import { captionIssues, onScreen, overlapOf, safeRect, type Rect, type Timeline } from "./captions.js";

const meta: CaptureMeta = { version: 2, width: 1080, height: 6000, anchors: { "#card": { x: 0, y: 1000, w: 1080, h: 1000 } } };
const full = { x: 0, y: 0, w: 1080 }; // 9x16 view: 1080×1920 of the image at 1:1

test("anchor boxes map through the camera view into output px", () => {
  assert.deepEqual(onScreen({ x: 100, y: 1000, w: 200, h: 100 }, { x: 0, y: 900, w: 540 }, "9x16"), { x: 200, y: 200, w: 400, h: 200 });
  assert.deepEqual(safeRect("9x16"), { x: 48, y: 288, w: 840, h: 960 });
});

test("overlap = caption ∩ the anchor's visible box; sub-pixel touches don't count", () => {
  assert.deepEqual(overlapOf({ x: 48, y: 1900, w: 840, h: 100 }, meta.anchors["#card"], full, "9x16"), { x: 48, y: 1900, w: 840, h: 20 }); // clipped at the frame
  assert.equal(overlapOf({ x: 0, y: 0, w: 1080, h: 100 }, meta.anchors["#card"], full, "9x16"), null);
  assert.equal(overlapOf({ x: 0, y: 999.5, w: 1080, h: 0.5 }, meta.anchors["#card"], full, "9x16"), null);
});

const tl = (caption: string): Timeline => ({
  format: "9x16", fps: 30,
  scenes: [{ id: "s", capture: "page", offset: 45, segments: [{ start: 0, end: 60, from: full, to: full }], phrases: [{ caption, start: 15, end: 60 }] }],
});

test("any visible anchor under a caption is an issue, focus or not; so is leaving the safe zone", () => {
  const [over] = captionIssues(tl("over"), { page: meta }, { over: { x: 48, y: 1100, w: 840, h: 130 } });
  assert.equal(over.at, 2); // (45 + 15) / 30
  assert.equal(over.problem, "overlaps #card (840×130 px)");
  const clear = { page: { ...meta, anchors: { "#card": { x: 0, y: 100, w: 1080, h: 300 } } } };
  assert.deepEqual(captionIssues(tl("ok"), clear, { ok: { x: 48, y: 1100, w: 840, h: 130 } }), []);
  const [out] = captionIssues(tl("tall"), clear, { tall: { x: 100, y: 200, w: 700, h: 400 } });
  assert.match(out.problem, /outside the 9x16 safe zone/);
});

test("page text under a caption is an issue, even outside every anchor", () => {
  const page: CaptureMeta = { ...meta, version: 3, anchors: {}, text: [{ text: "Tables", box: { x: 400, y: 1120, w: 200, h: 50 } }, { text: "Chairs", box: { x: 400, y: 600, w: 200, h: 50 } }] };
  const [hit, ...rest] = captionIssues(tl("over"), { page }, { over: { x: 48, y: 1100, w: 840, h: 130 } });
  assert.equal(hit.problem, "covers page text “Tables”");
  assert.deepEqual(rest, []);
});

test("only page footage counts: a box under the caption strip is hidden", () => {
  const card = { x: 0, y: 1000, w: 1080, h: 1000 };
  assert.deepEqual(overlapOf({ x: 48, y: 1049, w: 840, h: 175 }, card, full, "9x16"), { x: 48, y: 1049, w: 840, h: 175 });
  assert.equal(overlapOf({ x: 48, y: 1049, w: 840, h: 175 }, card, full, "9x16", 1025), null);
  assert.deepEqual(overlapOf({ x: 48, y: 980, w: 840, h: 175 }, card, full, "9x16", 1025), { x: 48, y: 1000, w: 840, h: 25 }); // a caption grown above the strip
});

test("regression: export 20261020T233815Z (9:16) fails — “No minimum order.” sat on the Folding Chair card", () => {
  const fx: { timeline: Timeline; metas: Record<string, CaptureMeta>; boxes: Record<string, Rect> } =
    JSON.parse(readFileSync(new URL("./fixtures/export-20261020T233815Z-9x16.json", import.meta.url), "utf8"));
  const issues = captionIssues(fx.timeline, fx.metas, fx.boxes);
  const hit = issues.find((i) => i.caption === "No minimum order." && i.problem.includes("Folding Chair - White"));
  assert.ok(hit, `expected the Folding Chair overlap, got ${JSON.stringify(issues)}`);
});
