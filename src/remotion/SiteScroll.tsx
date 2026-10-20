// A scene that pans across a real full-page screenshot with a caption + narration.
import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

export type SiteScrollProps = {
  image: string; // file in publicDir; image width == frame width
  fromY: number; // px offset into the image at the start of the scene
  toY: number; // px offset at the end
  audio: string; // file in publicDir
  caption: string;
  durationInFrames: number;
};

export const SiteScroll: React.FC<SiteScrollProps> = ({ image, fromY, toY, audio, caption }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const vertical = height > width;

  // Short hold, eased pan, short hold.
  const holdIn = Math.min(fps * 0.4, durationInFrames * 0.1);
  const holdOut = Math.min(fps * 0.6, durationInFrames * 0.15);
  const y = interpolate(frame, [holdIn, durationInFrames - holdOut], [fromY, toY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const captionIn = interpolate(frame, [fps * 0.15, fps * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#ffffff" }}>
      <Img src={staticFile(image)} style={{ position: "absolute", top: 0, left: 0, width, transform: `translateY(${-y}px)` }} />
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
