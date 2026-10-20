// A scene that pans down a real full-page screenshot with a caption + narration.
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type SiteScrollProps = {
  image: string; // file in publicDir
  imageHeight: number; // px; image width == frame width
  audio: string; // file in publicDir
  caption: string;
  durationInFrames: number;
};

export const SiteScroll: React.FC<SiteScrollProps> = ({ image, imageHeight, audio, caption }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;

  // Hold 1 s, pan up to two screens, hold the last second.
  const travel = Math.max(0, Math.min(imageHeight - height, height * 2));
  const y = interpolate(frame, [fps, durationInFrames - fps], [0, -travel], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const captionIn = interpolate(frame, [fps * 0.3, fps * 0.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      <Img src={staticFile(image)} style={{ position: "absolute", top: 0, left: 0, width, transform: `translateY(${y}px)` }} />
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          // Keep clear of Shorts/Reels UI at the bottom of vertical video.
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
