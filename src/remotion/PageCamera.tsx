// Moves a virtual camera over a real full-page screenshot along planned
// segments (src/render/camera.ts), with a caption + narration on top.
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Segment, View } from "../render/camera";

export type PageCameraProps = {
  image: string; // file in publicDir
  imageWidth: number; // px
  segments: Segment[];
  audio: string; // file in publicDir
  caption: string;
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

export const PageCamera: React.FC<PageCameraProps> = ({ image, imageWidth, segments, audio, caption }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const v = viewAt(frame, segments);
  const scale = width / v.w;
  const captionIn = interpolate(frame, [fps * 0.15, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          // Keep clear of Shorts/Reels UI at the bottom of vertical video (sourced safe zone in v1.E).
          paddingBottom: vertical ? 360 : 90,
          paddingLeft: 60,
          paddingRight: 60,
        }}
      >
        <div
          style={{
            opacity: captionIn,
            transform: `translateY(${(1 - captionIn) * 30}px)`,
            backgroundColor: "rgba(17, 24, 39, 0.94)",
            color: "#ffffff",
            fontFamily: "'Noto Sans', 'Liberation Sans', sans-serif",
            fontWeight: 700,
            fontSize: vertical ? 58 : 50,
            lineHeight: 1.25,
            padding: "24px 36px",
            borderRadius: 20,
            textAlign: "center",
            maxWidth: vertical ? 960 : 1500,
          }}
        >
          {caption}
        </div>
      </AbsoluteFill>
      <Audio src={staticFile(audio)} />
    </AbsoluteFill>
  );
};
