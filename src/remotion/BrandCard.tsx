// Brand cards (v1.F; clips named @intro / @end-card so they never collide with scene ids): the parent-brand opener ("<parent logo> Introducing
// <site>") and the end-card (site logo, CTA, URL, "Part of <parent logo>").
// Laid out inside the format's safe zone.
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { SAFE_ZONE } from "../constants";
import { fontStack, useFonts, type FontRef } from "./fonts";

/** A brand as the cards see it; file paths are in publicDir. */
export type CardBrand = {
  name: string;
  logo: string; // variant already chosen for the card's background
  withName: boolean; // logo is an icon; render `name` beside it
  colors: { primary: string; onPrimary: string; background: string; text: string; muted: string };
  text: FontRef;
  cta?: FontRef;
};

export type BrandCardProps =
  | { variant: "intro"; brand: CardBrand; intro: string; subject: string; durationInFrames: number }
  | {
      variant: "end";
      brand: CardBrand;
      headline: string;
      url: string;
      signoff?: { text: string; parent: CardBrand };
      audio?: string;
      durationInFrames: number;
    };

export const BrandCard: React.FC<BrandCardProps> = (props) => {
  const { brand } = props;
  const parent = props.variant === "end" ? props.signoff?.parent : undefined;
  useFonts([brand.text, brand.cta, parent?.text]);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const z = SAFE_ZONE[height > width ? "9x16" : "16x9"];
  const u = Math.min(width, height) / 1080; // 1 at 1080 px on the short side
  const enter = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const fadeOut = interpolate(frame, [props.durationInFrames - fps * 0.25, props.durationInFrames], [1, 0], { extrapolateLeft: "clamp" });
  const rise = (delay: number) => ({ opacity: enter(delay), transform: `translateY(${(1 - enter(delay)) * 24 * u}px)` });

  return (
    <AbsoluteFill style={{ backgroundColor: brand.colors.background, fontFamily: fontStack(brand.text) }}>
      <div
        style={{
          position: "absolute", top: z.top, right: z.right, bottom: z.bottom, left: z.left,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 40 * u, opacity: props.variant === "intro" ? fadeOut : 1, textAlign: "center",
        }}
      >
        <div style={rise(0)}><Logo brand={brand} height={(props.variant === "intro" ? 120 : 110) * u} /></div>
        {props.variant === "intro" ? (
          <div style={{ ...rise(8), display: "flex", flexDirection: "column", gap: 12 * u }}>
            <div style={{ color: brand.colors.muted, fontSize: 34 * u, fontFamily: fontStack(brand.cta ?? brand.text), letterSpacing: 4 * u, textTransform: "uppercase" }}>
              {props.intro}
            </div>
            <div style={{ color: brand.colors.text, fontSize: 64 * u, fontWeight: 700 }}>{props.subject}</div>
          </div>
        ) : (
          <>
            <div
              style={{
                ...rise(6), backgroundColor: brand.colors.primary, color: brand.colors.onPrimary,
                fontFamily: fontStack(brand.cta ?? brand.text), textTransform: brand.cta?.uppercase ? "uppercase" : "none",
                fontSize: 60 * u, fontWeight: 700, padding: `${22 * u}px ${56 * u}px`, borderRadius: 16 * u,
              }}
            >
              {props.headline}
            </div>
            <div style={{ ...rise(12), color: brand.colors.text, fontSize: 52 * u, fontWeight: 600 }}>{props.url}</div>
            {props.signoff && (
              <div style={{ ...rise(20), display: "flex", alignItems: "center", gap: 18 * u, marginTop: 30 * u, paddingTop: 30 * u, borderTop: `${2 * u}px solid ${brand.colors.muted}55` }}>
                <span style={{ color: brand.colors.muted, fontSize: 32 * u }}>{props.signoff.text}</span>
                <Logo brand={props.signoff.parent} height={48 * u} />
              </div>
            )}
            {props.audio && <Audio src={staticFile(props.audio)} />}
          </>
        )}
      </div>
    </AbsoluteFill>
  );
};

const Logo: React.FC<{ brand: CardBrand; height: number }> = ({ brand, height }) => (
  <div style={{ display: "flex", alignItems: "center", gap: height * 0.25 }}>
    <Img src={staticFile(brand.logo)} style={{ height }} />
    {brand.withName && (
      <span style={{ color: brand.colors.text, fontFamily: fontStack(brand.text), fontWeight: 700, fontSize: height * 0.62, lineHeight: 1 }}>
        {brand.name}
      </span>
    )}
  </div>
);
