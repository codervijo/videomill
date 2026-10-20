// `record` and `render` — the per-scene pipeline (docs/architecture.md § 2).
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAPTURE, FPS, LOUDNESS, type Format } from "../constants.js";
import { hashOf, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import type { PhraseClip } from "../remotion/PageCamera.js";
import { loadProject, projectDir } from "../project/load.js";
import { anchorsFor, type Project } from "../project/schema.js";
import { captureFiles, recordCapture, type CaptureMeta } from "../record/site.js";
import { planCamera } from "../render/camera.js";
import { compositionHash, concatClips, contactSheet, normalizeLoudness, probeDurationSec, renderScene, writeSrt } from "../render/render.js";
import { phrasesOf, timeScene } from "../render/timeline.js";
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
  const empty = p.scenes.filter((s) => !phrasesOf(s).some((ph) => ph.say.trim())).map((s) => s.id);
  if (empty.length) throw new VideoMillError(`scene(s) with no narration (scene \`narration\` or shot \`say\`): ${empty.join(", ")}`);
  const uncaptioned = p.scenes.filter((s) => phrasesOf(s).some((ph) => ph.say && !ph.caption.trim())).map((s) => s.id);
  if (uncaptioned.length) throw new VideoMillError(`scene(s) with narration but no caption: ${uncaptioned.join(", ")}`);

  console.log(`videomill render ${slug} — ${p.scenes.length} scene(s) × ${formats.join(", ")}`);
  await recordAll(c, formats, opts.force && !opts.scene);

  // Narration per phrase, cached by text + voice so editing one phrase re-voices only that phrase.
  let tts: TtsProvider | undefined;
  const audio: Record<string, { file?: string; sec: number }[]> = {};
  for (const s of p.scenes) {
    audio[s.id] = [];
    for (const [i, ph] of phrasesOf(s).entries()) {
      if (!ph.say) { audio[s.id].push({ sec: 0 }); continue; }
      const key = hashOf({ text: ph.say, voice: p.voice, provider: "kokoro" });
      const file = `tts/${key}.wav`;
      await step(stamps, `tts ${s.id}#${i + 1}`, key, [join(media, file)], async () => {
        tts ??= await getTtsProvider("kokoro");
        const t0 = performance.now();
        const r = await tts.synthesize(ph.say, p.voice, join(media, file));
        info(`${r.durationSec.toFixed(2)}s audio in ${((performance.now() - t0) / 1000).toFixed(2)}s — "${ph.say}"`);
      }, opts.force && (!opts.scene || opts.scene === s.id));
      audio[s.id].push({ file, sec: probeDurationSec(join(media, file)) });
    }
  }

  const code = compositionHash();
  for (const f of formats) {
    const clips: string[] = [];
    const renders: unknown[] = [];
    const cues: { start: number; end: number; text: string }[] = [];
    let offset = 0; // seconds into the assembled video
    for (const s of p.scenes) {
      const files = captureFiles(media, s.capture, f);
      const meta: CaptureMeta = JSON.parse(readFileSync(files.meta, "utf8"));
      if (meta.version !== 2) throw new VideoMillError(`capture ${s.capture} @${f} predates anchor boxes — run \`videomill record ${slug} --force\``);
      const t = timeScene(s, audio[s.id].map((a) => a.sec), FPS);
      const durationInFrames = Math.ceil(t.seconds * FPS);
      const phrases: PhraseClip[] = t.phrases.map((ph, i) => ({ audio: audio[s.id][i].file, caption: ph.caption, start: ph.start, end: ph.end }));
      const props = {
        image: `${s.capture}-${f}.png`,
        imageWidth: meta.width,
        segments: planCamera(t.scene, f, meta, t.seconds, FPS),
        phrases,
        durationInFrames,
      };
      const clip = join(out, "scenes", `${s.id}-${f}.mp4`);
      const inputs = { props, img: stamps.get(`record ${s.capture} ${f}`), code };
      await step(stamps, `render ${s.id} ${f}`, inputs, [clip],
        () => renderScene(f, props, media, clip, (pct) => info(`${s.id} ${f} ${pct}%`)),
        opts.force && (!opts.scene || opts.scene === s.id));
      clips.push(clip);
      renders.push(stamps.get(`render ${s.id} ${f}`));
      for (const ph of phrases) if (ph.caption) cues.push({ start: offset + ph.start / FPS, end: offset + ph.end / FPS, text: ph.caption });
      offset += durationInFrames / FPS;
    }

    const joined = join(out, "scenes", `joined-${f}.mp4`);
    const video = join(out, `${slug}-${f}.mp4`);
    const srt = join(out, `${slug}-${f}.srt`);
    const sheet = join(out, `${slug}-${f}-contact.png`);
    await step(stamps, `assemble ${f}`, renders, [joined], async () => concatClips(clips, joined), opts.force);
    await step(stamps, `loudness ${f}`, { joined: stamps.get(`assemble ${f}`), target: LOUDNESS }, [video], async () => {
      const l = normalizeLoudness(joined, video);
      info(`${l.before.toFixed(1)} → ${l.after.toFixed(1)} LUFS (target ${LOUDNESS.I})`);
    }, opts.force);
    await step(stamps, `captions ${f}`, cues, [srt], async () => writeSrt(cues, srt), opts.force);
    await step(stamps, `contact sheet ${f}`, stamps.get(`loudness ${f}`), [sheet],
      async () => contactSheet(video, sheet, f), opts.force);
    if (existsSync(video)) info(`${slug}-${f}.mp4 — ${probeDurationSec(video).toFixed(1)}s, ${cues.length} caption(s)`);
  }
  ok(`outputs in out/${slug}/`);
}
