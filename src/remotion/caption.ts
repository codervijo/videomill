// Caption box layout, shared by PageCamera (render) and `qa` (measured in a
// browser with the same styles), so the QA geometry is the rendered geometry.
import { SAFE_ZONE, type Format } from "../constants";

type Style = Record<string, string | number>;

const GAP = { vertical: 24, wide: 90 }; // design breathing room inside the zone
const FONT = { vertical: 54, wide: 50 };
const LINE = 1.25;
const PAD_Y = 20;

/**
 * Screen band a two-line caption occupies, in output px from the top. The
 * camera keeps zoom subjects above it (render/camera.ts).
 */
export function captionBand(f: Format, width: number, height: number): { top: number; bottom: number } {
  const v = height > width ? "vertical" : "wide";
  const bottom = height - SAFE_ZONE[f].bottom - GAP[v];
  return { top: bottom - (2 * FONT[v] * LINE + 2 * PAD_Y), bottom };
}

/** Outer = positioned strip inside the safe zone; inner = the visible box. Lengths in px strings. */
export function captionStyles(f: Format, width: number, height: number, fontFamily: string): { outer: Style; inner: Style } {
  const vertical = height > width;
  const v = vertical ? "vertical" : "wide";
  const z = SAFE_ZONE[f];
  return {
    outer: {
      position: "absolute",
      left: `${z.left}px`,
      width: `${width - z.left - z.right}px`,
      bottom: `${z.bottom + GAP[v]}px`,
      display: "flex",
      justifyContent: "center",
      maxHeight: `${height - z.top - z.bottom}px`,
    },
    inner: {
      backgroundColor: "rgba(17, 24, 39, 0.94)",
      color: "#ffffff",
      fontFamily,
      fontWeight: 700,
      fontSize: `${FONT[v]}px`,
      lineHeight: LINE,
      padding: `${PAD_Y}px 32px`,
      borderRadius: "20px",
      textAlign: "center",
      maxWidth: `${vertical ? width - z.left - z.right - 40 : 1500}px`,
    },
  };
}
