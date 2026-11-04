// Window frame geometry (v1.J), shared by PageCamera (render), the camera
// planner, the storyboard and `qa`: a browser or editor window on the brand
// background, its title bar inside the safe zone, footage below the bar.
import { SAFE_ZONE, type Format } from "../constants";

export type Rect = { x: number; y: number; w: number; h: number };
export type FrameKind = "browser" | "editor";

const MARGIN = { vertical: 24, wide: 40 }; // brand background around the window
const BAR = { vertical: 76, wide: 64 }; // title / address bar height

/** Window, its bar, and the footage area, in output px. The window runs off the bottom edge. */
export function frameLayout(f: Format, width: number, height: number): { window: Rect; bar: Rect; area: Rect } {
  const v = height > width ? "vertical" : "wide";
  const m = MARGIN[v];
  const top = Math.max(m, SAFE_ZONE[f].top); // bar stays visible under platform UI
  const window = { x: m, y: top, w: width - 2 * m, h: height - top };
  const bar = { x: m, y: top, w: width - 2 * m, h: BAR[v] };
  return { window, bar, area: { x: m, y: top + BAR[v], w: width - 2 * m, h: height - top - BAR[v] } };
}

/** Where a popup screenshot sits: under the bar, against the window's right edge, as Chrome opens it. */
export function popupRect(f: Format, width: number, height: number, popup: { width: number; height: number }): Rect {
  const { area } = frameLayout(f, width, height);
  const u = Math.min(width, height) / 1080;
  return { x: area.x + area.w - popup.width - 16 * u, y: area.y + 8 * u, w: popup.width, h: popup.height };
}
