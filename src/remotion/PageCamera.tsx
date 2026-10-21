// Moves a virtual camera over a real full-page screenshot along planned
// segments (src/render/camera.ts), with phrase captions + narration on top.
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Segment, View } from "../render/camera";
import { captionBand, captionStyles, pageBottom } from "./caption";
import { fontStack, useFonts, type FontRef } from "./fonts";

/** One phrase on the scene timeline, in frames: [start, end). */
export type PhraseClip = { audio?: string; caption: string; start: number; end: number };

export type PageCameraProps = {
  image: string; // file in publicDir
  imageWidth: number; // px
  segments: Segment[];
  phrases: PhraseClip[]; // audio files in publicDir
  font?: FontRef; // brand text font for captions (v1.F)
  durationInFrames: number;
};

const ease = Easing.inOut(Easing.cubic);

function viewAt(frame: number, segments: Segment[]): View {
  const seg = segments.find((s) => frame >= s.start && frame < s.end) ?? segments[segments.length - 1];
  const t = ease(Math.min(1, Math.max(0, (frame - seg.start) / Math.max(1, seg.end - seg.start))));
  // Zoom interpolates in log space so the apparent speed is even.
  const w = Math.exp(Math.log(seg.from.w) + (Math.log(seg.to.w) - Math.log(seg.from.w)) * t);
  return { w, x: seg.from.x + (seg.to.x - seg.from.x) * t, y: seg.from.y + (seg.to.y - seg.from.y) * t };
}

export const PageCamera: React.FC<PageCameraProps> = ({ image, imageWidth, segments, phrases, font }) => {
  useFonts([font]);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const v = viewAt(frame, segments);
  const scale = width / v.w;
  const f = height > width ? "9x16" : "16x9";
  const bottom = pageBottom(f, width, height); // the camera frames content above this
  const fadeEnd = captionBand(f, width, height).top;

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff", overflow: "hidden" }}>
      {/* Page footage stops above the caption strip (v1.I), fading out in the gap between the camera's clear area and the captions. */}
      <div style={{ position: "absolute", top: 0, left: 0, width, height: fadeEnd, overflow: "hidden" }}>
      <Img
        src={staticFile(image)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: imageWidth * scale, // resize, not CSS scale, so the browser resamples from source pixels
          transform: `translate(${-v.x * scale}px, ${-v.y * scale}px)`,
        }}
      />
      <div style={{ position: "absolute", left: 0, width, top: bottom, height: fadeEnd - bottom, background: "linear-gradient(rgba(255,255,255,0), #ffffff)" }} />
      </div>
      {phrases.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.end - p.start} layout="none">
          {p.caption && <Caption text={p.caption} vertical={height > width} font={font} />}
          {p.audio && <Audio src={staticFile(p.audio)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Caption at the bottom of the format's safe zone (layout in caption.ts, checked by `qa`). */
const Caption: React.FC<{ text: string; vertical: boolean; font?: FontRef }> = ({ text, vertical, font }) => {
  const frame = useCurrentFrame(); // relative to the phrase's Sequence
  const { fps, width, height } = useVideoConfig();
  const s = captionStyles(vertical ? "9x16" : "16x9", width, height, fontStack(font));
  const captionIn = interpolate(frame, [0, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={s.outer}>
      <div style={{ ...s.inner, opacity: captionIn, transform: `translateY(${(1 - captionIn) * 20}px)` }}>
        {text}
      </div>
    </div>
  );
};
