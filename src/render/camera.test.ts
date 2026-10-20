import assert from "node:assert/strict";
import { test } from "node:test";
import { Scene } from "../project/schema.js";
import type { CaptureMeta } from "../record/site.js";
import { planCamera, shotsSeconds } from "./camera.js";

// 9x16 frame is 1080×1920; a 1080-wide, 8000-tall page with two anchors.
const meta: CaptureMeta = {
  version: 2,
  width: 1080,
  height: 8000,
  anchors: {
    "h2#a": { x: 40, y: 2000, w: 1000, h: 80 },
    "#card": { x: 100, y: 3000, w: 400, h: 300 },
  },
};
const scene = (extra: object) => Scene.parse({ id: "s", kind: "page-scroll", capture: "page", narration: "x", caption: "x", ...extra });
const FPS = 30;

test("legacy scene (no shots) = hold, pan `screens` down, hold — v1.C behaviour", () => {
  const segs = planCamera(scene({ screens: 1 }), "9x16", meta, 5, FPS);
  assert.equal(segs.length, 3);
  assert.deepEqual(segs[0].from, segs[0].to); // hold
  assert.equal(segs[1].from.y, 0);
  assert.equal(segs[1].to.y, 1920); // one frame-height down
  assert.equal(segs.at(-1)!.end, 5 * FPS);
});

test("hold has an explicit duration; cut is instant and jumps the view", () => {
  const s = scene({ shots: [{ kind: "hold", seconds: 1 }, { kind: "cut", to: "h2#a" }, { kind: "hold", seconds: 2 }] });
  const segs = planCamera(s, "9x16", meta, shotsSeconds(s.shots!), FPS);
  assert.equal(segs.length, 2);
  assert.deepEqual([segs[0].start, segs[0].end, segs[1].start, segs[1].end], [0, 30, 30, 90]);
  assert.equal(segs[0].to.y, 0);
  assert.equal(segs[1].from.y, 2000 - 1920 * 0.04); // cut landed on the anchor with top margin
  assert.deepEqual(segs[1].from, segs[1].to);
});

test("zoom fits the element at `fill`, centred, and narrows the view", () => {
  const s = scene({ shots: [{ kind: "zoom", seconds: 1, target: "#card", fill: 0.8 }] });
  const [z] = planCamera(s, "9x16", meta, 1, FPS);
  assert.equal(z.from.w, 1080);
  assert.ok(z.to.w < 1080, "zoomed in");
  assert.ok(z.to.w >= 1080 / 2.5, "capped at MAX_ZOOM");
  const cx = z.to.x + z.to.w / 2;
  assert.ok(Math.abs(cx - 300) < 1, `centred on card x (got ${cx})`);
});

test("narration longer than shots holds the last framing to the end", () => {
  const s = scene({ shots: [{ kind: "pan", seconds: 1, to: "h2#a" }] });
  const segs = planCamera(s, "9x16", meta, 3, FPS);
  assert.equal(segs.length, 2);
  assert.deepEqual(segs[1].from, segs[1].to);
  assert.equal(segs[1].end, 90);
});

test("views are clamped inside the image", () => {
  const s = scene({ shots: [{ kind: "pan", seconds: 1, to: "+10" }] });
  const [p] = planCamera(s, "9x16", meta, 1, FPS);
  assert.equal(p.to.y, 8000 - 1920);
});

test("`to` alongside `shots` is rejected", () => {
  assert.throws(() => scene({ to: "h2#a", shots: [{ kind: "hold", seconds: 1 }] }), /ignored when `shots` is set/);
});
