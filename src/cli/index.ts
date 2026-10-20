// VideoMill CLI. v1.B: `render <slug>` runs the POC pipeline for one project.
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { FORMAT_IDS, FPS, type Format } from "../constants.js";
import { fail, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import { recordSite } from "../record/site.js";
import { compositionHash, contactSheet, pngSize, probeDurationSec, renderScene } from "../render/render.js";
import { getTtsProvider } from "../tts/provider.js";

// v1.B POC project definition; superseded by project.json in v1.C.
type PocProject = { url: string; narration: string; caption: string; voice: string; minSeconds: number };

async function render(slug: string, force: boolean): Promise<void> {
  const projectDir = resolve("projects", slug);
  const defPath = join(projectDir, "poc.json");
  if (!existsSync(defPath)) throw new VideoMillError(`no project definition at ${defPath}`);
  const def: PocProject = JSON.parse(readFileSync(defPath, "utf8"));
  const media = join(projectDir, "media");
  const out = resolve("out", slug);
  const stamps = new StampFile(join(out, "stamps.json"));

  console.log(`videomill render ${slug} — ${def.url}`);

  for (const f of FORMAT_IDS) {
    await step(stamps, `record ${f}`, { url: def.url, f, v: 1 }, [join(media, `page-${f}.png`), join(media, `scroll-${f}.webm`)],
      () => recordSite(def.url, f, media), force);
  }

  const wav = join(media, "narration.wav");
  await step(stamps, "tts narration", { text: def.narration, voice: def.voice, provider: "kokoro" }, [wav], async () => {
    const tts = await getTtsProvider("kokoro");
    const r = await tts.synthesize(def.narration, def.voice, wav);
    info(`${r.durationSec.toFixed(2)}s of audio`);
  }, force);

  const audioSec = probeDurationSec(wav);
  const durationInFrames = Math.ceil(Math.max(def.minSeconds, audioSec + 1.5) * FPS);

  for (const f of FORMAT_IDS as Format[]) {
    const image = `page-${f}.png`;
    const props = {
      image,
      imageHeight: pngSize(join(media, image)).height,
      audio: "narration.wav",
      caption: def.caption,
      durationInFrames,
    };
    const mp4 = join(out, `scene-${f}.mp4`);
    const inputs = { props, img: stamps.get(`record ${f}`), wav: stamps.get("tts narration"), code: compositionHash() };
    await step(stamps, `render ${f}`, inputs, [mp4], () =>
      renderScene(f, props, media, mp4, (pct) => info(`render ${f} ${pct}%`)), force);
    await step(stamps, `contact sheet ${f}`, { mp4: stamps.get(`render ${f}`), v: 2 }, [join(out, `contact-${f}.png`)],
      async () => contactSheet(mp4, join(out, `contact-${f}.png`), f), force);
  }
  ok(`outputs in out/${slug}/ (${(durationInFrames / FPS).toFixed(1)}s per format)`);
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  const force = rest.includes("--force");
  const args = rest.filter((a) => !a.startsWith("--"));
  try {
    switch (cmd) {
      case "render":
        if (!args[0]) throw new VideoMillError("usage: videomill render <slug> [--force]");
        await render(args[0], force);
        return 0;
      default:
        console.log("usage: videomill render <slug> [--force]");
        return cmd ? 2 : 0;
    }
  } catch (e) {
    if (e instanceof VideoMillError) { fail(e.message); return 1; }
    throw e;
  }
}

process.exitCode = await main(process.argv.slice(2));
