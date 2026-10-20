// `record` and `render` — the per-scene pipeline (docs/architecture.md § 2).
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAPTURE, FPS, type Format } from "../constants.js";
import { hashOf, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import { loadProject, projectDir } from "../project/load.js";
import { anchorsFor, type Project } from "../project/schema.js";
import { captureFiles, recordCapture, type CaptureMeta } from "../record/site.js";
import { planCamera, shotsSeconds } from "../render/camera.js";
import { compositionHash, concatClips, contactSheet, probeDurationSec, renderScene } from "../render/render.js";
import { getTtsProvider, type TtsProvider } from "../tts/provider.js";

export type RunOpts = { force: boolean; scene?: string; format?: Format };

function ctx(slug: string) {
  const p = loadProject(slug);
  const media = join(projectDir(slug), "media");
  const out = resolve("out", slug);
  return { p, media, out, stamps: new StampFile(join(out, "stamps.json")) };
}

function formatsOf(p: Project, opts: RunOpts): Format[] {
  if (opts.format && !p.formats.includes(opts.format)) throw new VideoMillError(`format ${opts.format} is not in this project's formats`);
  return opts.format ? [opts.format] : p.formats;
}

async function recordAll(c: ReturnType<typeof ctx>, formats: Format[], force: boolean): Promise<void> {
  for (const cap of c.p.captures) {
    const anchors = anchorsFor(c.p, cap.id);
    for (const f of formats) {
      const files = captureFiles(c.media, cap.id, f);
      await step(c.stamps, `record ${cap.id} ${f}`, { url: cap.url, f, anchors, capture: CAPTURE[f], meta: 2 }, [files.png, files.meta],
        () => recordCapture(cap.url, f, anchors, c.media, cap.id), force);
    }
  }
}

export async function record(slug: string, opts: RunOpts): Promise<void> {
  const c = ctx(slug);
  console.log(`videomill record ${slug}`);
  await recordAll(c, formatsOf(c.p, opts), opts.force);
}

export async function render(slug: string, opts: RunOpts): Promise<void> {
  const c = ctx(slug);
  const { p, media, out, stamps } = c;
  const formats = formatsOf(p, opts);
  if (opts.scene && !p.scenes.some((s) => s.id === opts.scene)) throw new VideoMillError(`no scene "${opts.scene}" in ${slug}`);
  const empty = p.scenes.filter((s) => !s.narration.trim() || !s.caption.trim()).map((s) => s.id);
  if (empty.length) throw new VideoMillError(`scene(s) missing narration or caption: ${empty.join(", ")}`);

  console.log(`videomill render ${slug} — ${p.scenes.length} scene(s) × ${formats.join(", ")}`);
  await recordAll(c, formats, opts.force && !opts.scene);

  // Narration per scene, cached by text + voice so editing one scene re-voices only that scene.
  let tts: TtsProvider | undefined;
  const audio: Record<string, { file: string; sec: number }> = {};
  for (const s of p.scenes) {
    const key = hashOf({ text: s.narration, voice: p.voice, provider: "kokoro" });
    const file = `tts/${key}.wav`;
    await step(stamps, `tts ${s.id}`, key, [join(media, file)], async () => {
      tts ??= await getTtsProvider("kokoro");
      const r = await tts.synthesize(s.narration, p.voice, join(media, file));
      info(`${r.durationSec.toFixed(2)}s`);
    }, opts.force && (!opts.scene || opts.scene === s.id));
    audio[s.id] = { file, sec: probeDurationSec(join(media, file)) };
  }

  const code = compositionHash();
  for (const f of formats) {
    const clips: string[] = [];
    const renders: unknown[] = [];
    for (const s of p.scenes) {
      const files = captureFiles(media, s.capture, f);
      const meta: CaptureMeta = JSON.parse(readFileSync(files.meta, "utf8"));
      if (meta.version !== 2) throw new VideoMillError(`capture ${s.capture} @${f} predates anchor boxes — run \`videomill record ${slug} --force\``);
      const seconds = Math.max(s.minSeconds, audio[s.id].sec + 0.6, s.shots ? shotsSeconds(s.shots) : 0);
      const props = {
        image: `${s.capture}-${f}.png`,
        imageWidth: meta.width,
        segments: planCamera(s, f, meta, seconds, FPS),
        audio: audio[s.id].file,
        caption: s.caption,
        durationInFrames: Math.ceil(seconds * FPS),
      };
      const clip = join(out, "scenes", `${s.id}-${f}.mp4`);
      const inputs = { props, img: stamps.get(`record ${s.capture} ${f}`), code };
      await step(stamps, `render ${s.id} ${f}`, inputs, [clip],
        () => renderScene(f, props, media, clip, (pct) => info(`${s.id} ${f} ${pct}%`)),
        opts.force && (!opts.scene || opts.scene === s.id));
      clips.push(clip);
      renders.push(stamps.get(`render ${s.id} ${f}`));
    }

    const video = join(out, `${slug}-${f}.mp4`);
    const sheet = join(out, `${slug}-${f}-contact.png`);
    await step(stamps, `assemble ${f}`, renders, [video], async () => concatClips(clips, video), opts.force);
    await step(stamps, `contact sheet ${f}`, stamps.get(`assemble ${f}`), [sheet],
      async () => contactSheet(video, sheet, f), opts.force);
    if (existsSync(video)) info(`${slug}-${f}.mp4 — ${probeDurationSec(video).toFixed(1)}s`);
  }
  ok(`outputs in out/${slug}/`);
}
