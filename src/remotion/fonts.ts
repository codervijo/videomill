// Brand font loading inside the Remotion page: register a FontFace from a
// file in publicDir and hold the frame until it's ready.
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

/** A font as the compositions see it: family + optional file in publicDir. */
export type FontRef = { family: string; file?: string; uppercase?: boolean };

const FALLBACK = "'Noto Sans', 'Liberation Sans', sans-serif";
export const fontStack = (f?: FontRef) => (f ? `'${f.family}', ${FALLBACK}` : FALLBACK);

export function useFonts(fonts: (FontRef | undefined)[]): void {
  const files = fonts.filter((f): f is FontRef & { file: string } => !!f?.file);
  const key = files.map((f) => `${f.family}|${f.file}`).join(",");
  const [handle] = useState(() => (files.length ? delayRender(`fonts ${key}`) : null));
  useEffect(() => {
    if (handle === null) return;
    Promise.all(files.map(async (f) => {
      const face = new FontFace(f.family, `url('${staticFile(f.file)}')`, { weight: "100 900" });
      document.fonts.add(await face.load());
    })).then(() => continueRender(handle), cancelRender);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
