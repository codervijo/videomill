// Camera planning (v1.D): compile a scene's shots into keyframed segments over
// the full-page screenshot. Pure function of (scene, format, capture meta,
// duration) so it is cache-stable and unit-testable.
import { FORMATS, type Format } from "../constants.js";
import { VideoMillError } from "../pipeline/step.js";
import type { Scene, Shot } from "../project/schema.js";
import type { CaptureMeta } from "../record/site.js";

/** Visible window into the image, in image pixels. Height follows the frame aspect. */
export type View = { x: number; y: number; w: number };
/** One camera segment in frames: [start, end), moving from → to (equal = static). */
export type Segment = { start: number; end: number; from: View; to: View };

const ANCHOR_MARGIN = 0.04; // of frame height, so a heading isn't flush with the top edge
const MAX_ZOOM = 2.5; // screenshot is captured at 1:1 output pixels; beyond this it gets soft
const LEGACY_HOLD_IN = 0.4;
const LEGACY_HOLD_OUT = 0.6;

export function planCamera(scene: Scene, f: Format, meta: CaptureMeta, durationSec: number, fps: number): Segment[] {
  const frame = FORMATS[f];
  const aspect = frame.height / frame.width;
  const imgW = meta.width;

  const clamp = (v: View): View => {
    const w = Math.min(imgW, Math.max(imgW / MAX_ZOOM, v.w));
    const h = w * aspect;
    return {
      w,
      x: Math.min(Math.max(0, imgW - w), Math.max(0, v.x)),
      y: Math.min(Math.max(0, meta.height - h), Math.max(0, v.y)),
    };
  };
  const box = (a: string) => {
    const b = meta.anchors[a];
    if (!b) throw new VideoMillError(`scene ${scene.id}: anchor not recorded (${a}) — run \`videomill record\``);
    return b;
  };
  /** Full-width view with the anchor near the top of the frame. */
  const at = (a: string): View => (a === "top" ? clamp({ x: 0, y: 0, w: imgW }) : clamp({ x: 0, y: box(a).y - frame.height * ANCHOR_MARGIN, w: imgW }));
  /** View that fits the element at `fill` of the frame, centred on it. */
  const zoomTo = (a: string, fill: number): View => {
    const b = box(a);
    const w = Math.max(b.w / fill, (b.h / fill) / aspect);
    const cw = Math.min(imgW, Math.max(imgW / MAX_ZOOM, w));
    return clamp({ w: cw, x: b.x + b.w / 2 - cw / 2, y: b.y + b.h / 2 - (cw * aspect) / 2 });
  };

  const fr = f; // framing overrides apply to the scene start (and legacy end)
  const start = at(scene.framing?.[fr]?.from ?? scene.from);
  const shots: Shot[] = scene.shots ?? legacyShots(scene, f, durationSec);

  const segs: Segment[] = [];
  let cur = start;
  let t = 0; // frames
  for (const sh of shots) {
    if (sh.kind === "cut") { cur = at(sh.to); continue; }
    if (sh.kind === "hold" && sh.at) cur = at(sh.at);
    const target = sh.kind === "hold" ? cur : sh.kind === "pan" ? (sh.to.startsWith("+") ? clamp({ ...cur, y: cur.y + Number(sh.to.slice(1)) * frame.height }) : at(sh.to)) : zoomTo(sh.target, sh.fill);
    const n = Math.max(1, Math.round(sh.seconds * fps));
    segs.push({ start: t, end: t + n, from: cur, to: target });
    cur = target;
    t += n;
  }
  // Narration longer than the shots: hold the last framing to the end.
  const total = Math.ceil(durationSec * fps);
  if (t < total) segs.push({ start: t, end: total, from: cur, to: cur });
  if (segs.length === 0) segs.push({ start: 0, end: total, from: cur, to: cur });
  return segs;
}

/** Shot length in seconds (cuts are instant). */
export const shotsSeconds = (shots: Shot[]) => shots.reduce((s, sh) => s + (sh.kind === "cut" ? 0 : sh.seconds), 0);

/** v1.C behaviour as shots: short hold, pan to `to` (or `screens` down), short hold. */
function legacyShots(scene: Scene, f: Format, durationSec: number): Shot[] {
  const pan = Math.max(0.1, durationSec - LEGACY_HOLD_IN - LEGACY_HOLD_OUT);
  const to = scene.framing?.[f]?.to ?? scene.to ?? `+${scene.screens}`;
  return [
    { kind: "hold", seconds: LEGACY_HOLD_IN },
    { kind: "pan", seconds: pan, to },
    { kind: "hold", seconds: LEGACY_HOLD_OUT },
  ];
}
