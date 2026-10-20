import { Composition } from "remotion";
import { FORMATS, FORMAT_IDS, FPS } from "../constants";
import { PageCamera, type PageCameraProps } from "./PageCamera";

const defaults: PageCameraProps = { image: "", imageWidth: 0, segments: [], audio: "", caption: "", durationInFrames: FPS * 5 };

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
  </>
);
