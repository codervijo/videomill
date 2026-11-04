// Card scenes (v1.J) on the brand background: `title` types a headline,
// `badges` shows a row of icon + label tiles. Content stays in the clear area
// above the caption band; narration and captions play as on page scenes.
import { AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE_ZONE } from "../constants";
import type { CardBrand } from "./BrandCard";
import { pageBottom } from "./caption";
import { fontStack, useFonts } from "./fonts";
import { Caption, type PhraseClip } from "./PageCamera";

export type BadgeIcon = "shield" | "cloud-off" | "check" | "lock" | "download" | "file";

export type SceneCardProps =
  | { variant: "title"; brand: CardBrand; text: string; phrases: PhraseClip[]; durationInFrames: number }
  | { variant: "badges"; brand: CardBrand; items: { icon: BadgeIcon; label: string }[]; phrases: PhraseClip[]; durationInFrames: number };

const TYPE_SECONDS = 1.2; // a headline types out over at most this long

// 24×24 stroke icons, drawn for VideoMill.
const ICONS: Record<BadgeIcon, string[]> = {
  shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", "M9 12l2 2 4-4"],
  "cloud-off": ["M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 0 1 0 9z", "M3 3l18 18"],
  check: ["M21 12a9 9 0 1 1-9-9", "M21 5l-9 9-3-3"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
  file: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6"],
};

export const SceneCard: React.FC<SceneCardProps> = (props) => {
  const { brand } = props;
  useFonts([brand.text, brand.cta]);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const f = vertical ? "9x16" : "16x9";
  const z = SAFE_ZONE[f];
  const u = Math.min(width, height) / 1080;
  const bottom = pageBottom(f, width, height);

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background, fontFamily: fontStack(brand.text) }}>
      <div
        style={{
          position: "absolute", top: z.top, left: z.left, right: z.right, height: bottom - z.top,
          display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
        }}
      >
        {props.variant === "title" ? (
          <Typed text={props.text} color={brand.colors.text} cursor={brand.colors.primary} size={(vertical ? 84 : 92) * u} />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 32 * u, maxWidth: vertical ? 760 * u : 1600 * u }}>
            {props.items.map((b, i) => {
              const s = spring({ frame: frame - i * Math.round(fps * 0.25), fps, config: { damping: 200 } });
              return (
                <div
                  key={b.label}
                  style={{
                    opacity: s, transform: `translateY(${(1 - s) * 30 * u}px)`,
                    width: (vertical ? 340 : 360) * u, padding: `${36 * u}px ${24 * u}px`, boxSizing: "border-box",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 20 * u,
                    borderRadius: 24 * u, backgroundColor: `${brand.colors.text}12`, border: `${2 * u}px solid ${brand.colors.text}22`,
                  }}
                >
                  <svg width={84 * u} height={84 * u} viewBox="0 0 24 24" fill="none" stroke={brand.colors.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[b.icon].map((d) => <path key={d} d={d} />)}
                  </svg>
                  <div style={{ color: brand.colors.text, fontSize: 40 * u, fontWeight: 700, lineHeight: 1.2 }}>{b.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {props.phrases.map((p, i) => (
        <Sequence key={i} from={p.start} durationInFrames={p.end - p.start} layout="none">
          {p.caption && <Caption text={p.caption} vertical={vertical} font={brand.text} />}
          {p.audio && <Audio src={staticFile(p.audio)} />}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

/** The headline typing out, with a blinking cursor in the brand accent. */
const Typed: React.FC<{ text: string; color: string; cursor: string; size: number }> = ({ text, color, cursor, size }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const typeFrames = Math.min(TYPE_SECONDS * fps, durationInFrames * 0.4);
  const n = Math.min(text.length, Math.floor((frame / typeFrames) * text.length));
  const on = n < text.length || Math.floor(frame / (fps * 0.5)) % 2 === 0;
  return (
    <div style={{ color, fontSize: size, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.02 * size }}>
      {text.slice(0, n)}
      <span style={{ display: "inline-block", width: size * 0.08, height: size * 0.95, margin: `0 ${size * 0.03}px`, verticalAlign: "-0.12em", backgroundColor: on ? cursor : "transparent" }} />
      <span style={{ color: "transparent" }}>{text.slice(n)}</span>{/* untyped text keeps its place, so lines don't reflow */}
    </div>
  );
};
