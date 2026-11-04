// Moves a virtual camera over a real full-page screenshot along planned
// segments (src/render/camera.ts), with phrase captions + narration on top.
// v1.J: the footage may sit in a browser/editor window (frame.ts), with the
// recorded extension popup shown over it during popup shots.
import { AbsoluteFill, Audio, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Segment, View } from "../render/camera";
import { captionBand, captionStyles, pageBottom, stripBottom } from "./caption";
import { fontStack, useFonts, type FontRef } from "./fonts";
import { frameLayout, popupRect, type FrameKind } from "./frame";

/** One phrase on the scene timeline, in frames: [start, end). */
export type PhraseClip = { audio?: string; caption: string; start: number; end: number };
/** A recorded popup screenshot shown over the footage, in frames: [start, end). Size in output px. */
export type PopupClip = { image: string; width: number; height: number; start: number; end: number; enter: boolean }; // enter=false: follows another popup, so it doesn't re-animate
/** Window chrome around the footage: the address bar's URL, or the editor's file name. */
export type Chrome = { kind: FrameKind; label: string; icon?: string };

export type PageCameraProps = {
  image: string; // file in publicDir
  imageWidth: number; // px
  segments: Segment[];
  phrases: PhraseClip[]; // audio files in publicDir
  font?: FontRef; // brand text font for captions (v1.F)
  chrome?: Chrome; // v1.J
  background?: string; // brand background around the window (v1.J)
  popups?: PopupClip[]; // v1.J
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

export const PageCamera: React.FC<PageCameraProps> = ({ image, imageWidth, segments, phrases, font, chrome, background, popups }) => {
  useFonts([font]);
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const f = height > width ? "9x16" : "16x9";
  const layout = chrome ? frameLayout(f, width, height) : undefined;
  const area = layout?.area ?? { x: 0, y: 0, w: width, h: height };
  const v = viewAt(frame, segments);
  const scale = area.w / v.w;

  return (
    <AbsoluteFill style={{ backgroundColor: chrome ? background ?? "#ffffff" : "#ffffff", overflow: "hidden" }}>
      {layout && chrome && <Window layout={layout} chrome={chrome} font={font} />}
      <div style={{ position: "absolute", left: area.x, top: area.y, width: area.w, height: area.h, overflow: "hidden" }}>
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
      </div>
      {(popups ?? []).map((p, i) => (
        <Sequence key={`popup-${i}`} from={p.start} durationInFrames={p.end - p.start} layout="none">
          <Popup clip={p} />
        </Sequence>
      ))}
      <CaptionStrip />
      {phrases.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.end - p.start} layout="none">
          {p.caption && <Caption text={p.caption} vertical={height > width} font={font} />}
          {p.audio && <Audio src={staticFile(p.audio)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** Caption strip (v1.I): fades in below the camera's clear area; on 9:16 it's a band with footage below it. */
export const CaptionStrip: React.FC = () => {
  const { width, height } = useVideoConfig();
  const f = height > width ? "9x16" : "16x9";
  const band = captionBand(f, width, height);
  const top = pageBottom(f, width, height);
  const end = stripBottom(f, width, height);
  const strip = `linear-gradient(rgba(255,255,255,0) 0px, #ffffff ${band.top - top}px, #ffffff ${end < height ? band.bottom - top : end - top}px, rgba(255,255,255,${end < height ? 0 : 1}) 100%)`;
  return <div style={{ position: "absolute", left: 0, width, top, height: end - top, background: strip }} />;
};

/** Browser or editor chrome: rounded window, title bar with the URL (or file name). Drawn, not captured. */
const Window: React.FC<{ layout: ReturnType<typeof frameLayout>; chrome: Chrome; font?: FontRef }> = ({ layout, chrome, font }) => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const { window: w, bar } = layout;
  const dark = chrome.kind === "editor";
  const ink = dark ? "#c9d1d9" : "#3c4043";
  const icon = (d: string) => (
    <svg width={30 * u} height={30 * u} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
  return (
    <>
      <div style={{ position: "absolute", left: w.x, top: w.y, width: w.w, height: w.h, borderRadius: 18 * u, backgroundColor: dark ? "#1e1e1e" : "#ffffff", boxShadow: `0 ${12 * u}px ${48 * u}px rgba(0,0,0,0.35)` }} />
      <div
        style={{
          position: "absolute", left: bar.x, top: bar.y, width: bar.w, height: bar.h, boxSizing: "border-box",
          display: "flex", alignItems: "center", gap: 18 * u, padding: `0 ${22 * u}px`,
          backgroundColor: dark ? "#252526" : "#f1f3f4", borderRadius: `${18 * u}px ${18 * u}px 0 0`,
          borderBottom: `1px solid ${dark ? "#333333" : "#dadce0"}`, fontFamily: fontStack(font), color: ink,
        }}
      >
        {dark ? (
          <>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 16 * u, height: 16 * u, borderRadius: "50%", backgroundColor: c }} />)}
            <div style={{ marginLeft: 12 * u, padding: `${8 * u}px ${18 * u}px`, borderRadius: 8 * u, backgroundColor: "#1e1e1e", fontSize: 26 * u, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chrome.label}</div>
          </>
        ) : (
          <>
            {icon("M19 12H5M12 19l-7-7 7-7")}
            {icon("M5 12h14M12 5l7 7-7 7")}
            {icon("M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5")}
            <div style={{ flex: 1, minWidth: 0, padding: `${10 * u}px ${22 * u}px`, borderRadius: 999, backgroundColor: "#ffffff", border: "1px solid #dadce0", fontSize: 26 * u, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {chrome.label}
            </div>
            {chrome.icon && <Img src={staticFile(chrome.icon)} style={{ width: 34 * u, height: 34 * u }} />}
          </>
        )}
      </div>
    </>
  );
};

/** The extension popup as recorded, dropping in under the toolbar like Chrome's. */
const Popup: React.FC<{ clip: PopupClip }> = ({ clip }) => {
  const frame = useCurrentFrame(); // relative to the popup's Sequence
  const { fps, width, height } = useVideoConfig();
  const r = popupRect(height > width ? "9x16" : "16x9", width, height, clip);
  const u = Math.min(width, height) / 1080;
  const s = clip.enter ? spring({ frame, fps, config: { damping: 200 }, durationInFrames: Math.round(fps * 0.25) }) : 1;
  return (
    <Img
      src={staticFile(clip.image)}
      style={{
        position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h,
        borderRadius: 10 * u, boxShadow: `0 ${8 * u}px ${32 * u}px rgba(0,0,0,0.35)`, border: "1px solid #dadce0",
        opacity: s, transform: `translateY(${(1 - s) * -12 * u}px)`,
      }}
    />
  );
};

/** Caption at the bottom of the format's safe zone (layout in caption.ts, checked by `qa`). */
export const Caption: React.FC<{ text: string; vertical: boolean; font?: FontRef }> = ({ text, vertical, font }) => {
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
