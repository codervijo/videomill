// Moves a virtual camera over a real full-page screenshot along planned
// segments (src/render/camera.ts), with phrase captions + narration on top.
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE_ZONE } from "../constants";
import type { Segment, View } from "../render/camera";

/** One phrase on the scene timeline, in frames: [start, end). */
export type PhraseClip = { audio?: string; caption: string; start: number; end: number };

export type PageCameraProps = {
  image: string; // file in publicDir
  imageWidth: number; // px
  segments: Segment[];
  phrases: PhraseClip[]; // audio files in publicDir
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

export const PageCamera: React.FC<PageCameraProps> = ({ image, imageWidth, segments, phrases }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const v = viewAt(frame, segments);
  const scale = width / v.w;

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff", overflow: "hidden" }}>
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
      {phrases.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.end - p.start} layout="none">
          {p.caption && <Caption text={p.caption} vertical={height > width} />}
          {p.audio && <Audio src={staticFile(p.audio)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Caption at the bottom of the format's safe zone (constants.ts SAFE_ZONE). */
const Caption: React.FC<{ text: string; vertical: boolean }> = ({ text, vertical }) => {
  const frame = useCurrentFrame(); // relative to the phrase's Sequence
  const { fps, width, height } = useVideoConfig();
  const z = SAFE_ZONE[vertical ? "9x16" : "16x9"];
  const captionIn = interpolate(frame, [0, fps * 0.2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: z.left,
        width: width - z.left - z.right,
        bottom: z.bottom + (vertical ? 24 : 90), // design breathing room inside the zone
        display: "flex",
        justifyContent: "center",
        maxHeight: height - z.top - z.bottom,
      }}
    >
      <div
        style={{
          opacity: captionIn,
          transform: `translateY(${(1 - captionIn) * 20}px)`,
          backgroundColor: "rgba(17, 24, 39, 0.94)",
          color: "#ffffff",
          fontFamily: "'Noto Sans', 'Liberation Sans', sans-serif",
          fontWeight: 700,
          fontSize: vertical ? 54 : 50,
          lineHeight: 1.25,
          padding: "20px 32px",
          borderRadius: 20,
          textAlign: "center",
          maxWidth: vertical ? width - z.left - z.right - 40 : 1500,
        }}
      >
        {text}
      </div>
    </div>
  );
};
