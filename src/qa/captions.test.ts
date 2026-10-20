import assert from "node:assert/strict";
import { test } from "node:test";
import type { CaptureMeta } from "../record/site.js";
import { captionIssues, coverOf, onScreen, safeRect, type Timeline } from "./captions.js";

const meta: CaptureMeta = { version: 2, width: 1080, height: 6000, anchors: { "#card": { x: 0, y: 1000, w: 1080, h: 1000 } } };
const full = { x: 0, y: 0, w: 1080 }; // 9x16 view: 1080×1920 of the image at 1:1

test("anchor boxes map through the camera view into output px", () => {
  assert.deepEqual(onScreen({ x: 100, y: 1000, w: 200, h: 100 }, { x: 0, y: 900, w: 540 }, "9x16"), { x: 200, y: 200, w: 400, h: 200 });
  assert.deepEqual(safeRect("9x16"), { x: 48, y: 288, w: 840, h: 960 });
});

test("cover = share of the element's visible area under the caption", () => {
  // Card on screen y 1000–1920 (clipped by the frame), caption y 1000–1100 full width.
  const c = coverOf({ x: 0, y: 1000, w: 1080, h: 100 }, meta.anchors["#card"], full, "9x16");
  assert.equal(c, 100 / 920);
  assert.equal(coverOf({ x: 0, y: 0, w: 1080, h: 100 }, meta.anchors["#card"], full, "9x16"), 0);
});

const tl = (caption: string, focus?: string): Timeline => ({
  format: "9x16", fps: 30,
  scenes: [{ id: "s", capture: "page", offset: 45, segments: [{ start: 0, end: 60, from: full, to: full, focus }], phrases: [{ caption, start: 15, end: 60 }] }],
});

test("captions over the shot's subject or outside the safe zone are issues", () => {
  const inside = { x: 48, y: 1000, w: 840, h: 240 }; // 20% of the card's visible 1080×920
  assert.deepEqual(captionIssues(tl("ok"), { page: meta }, { ok: inside }), []); // no focus → only the zone check
  const [over] = captionIssues(tl("over", "#card"), { page: meta }, { over: inside });
  assert.equal(over.at, 2); // (45 + 15) / 30
  assert.equal(over.problem, "covers 20% of #card (max 10%)");
  const [out] = captionIssues(tl("tall"), { page: meta }, { tall: { x: 100, y: 200, w: 700, h: 400 } });
  assert.match(out.problem, /outside the 9x16 safe zone/);
});
