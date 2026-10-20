import { Composition } from "remotion";
import { FORMATS, FORMAT_IDS, FPS } from "../constants";
import { BrandCard, type BrandCardProps } from "./BrandCard";
import { PageCamera, type PageCameraProps } from "./PageCamera";

const cardDefaults: BrandCardProps = {
  variant: "intro", intro: "", subject: "", durationInFrames: FPS * 2,
  brand: { name: "", logo: "", withName: false, text: { family: "sans-serif" }, colors: { primary: "#000000", onPrimary: "#ffffff", background: "#ffffff", text: "#000000", muted: "#666666" } },
};
const defaults: PageCameraProps = { image: "", imageWidth: 0, segments: [], phrases: [], durationInFrames: FPS * 5 };

export const Root: React.FC = () => (
  <>
    {FORMAT_IDS.map((f) => (
      <Composition
        key={f}
        id={`PageCamera-${f}`}
        component={PageCamera}
        width={FORMATS[f].width}
        height={FORMATS[f].height}
        fps={FPS}
        durationInFrames={defaults.durationInFrames}
        defaultProps={defaults}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
    ))}
    {FORMAT_IDS.map((f) => (
      <Composition
        key={`card-${f}`}
        id={`BrandCard-${f}`}
        component={BrandCard}
        width={FORMATS[f].width}
        height={FORMATS[f].height}
        fps={FPS}
        durationInFrames={cardDefaults.durationInFrames}
        defaultProps={cardDefaults}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
    ))}
  </>
);
