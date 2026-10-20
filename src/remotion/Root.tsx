import { Composition } from "remotion";
import { FORMATS, FORMAT_IDS, FPS } from "../constants";
import { SiteScroll, type SiteScrollProps } from "./SiteScroll";

const defaults: SiteScrollProps = { image: "", imageHeight: 0, audio: "", caption: "", durationInFrames: FPS * 10 };

export const Root: React.FC = () => (
  <>
    {FORMAT_IDS.map((f) => (
      <Composition
        key={f}
        id={`SiteScroll-${f}`}
        component={SiteScroll}
        width={FORMATS[f].width}
        height={FORMATS[f].height}
        fps={FPS}
        durationInFrames={defaults.durationInFrames}
        defaultProps={defaults}
        calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames })}
      />
    ))}
  </>
);
