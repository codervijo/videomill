// `record` and `render` — the per-scene pipeline (docs/architecture.md § 2).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { CAPTURE, DEFAULT_VOICE, FORMATS, FPS, LOUDNESS, QA, type Format } from "../constants.js";
import { brandHash, cardBrand, stageBrand, textFont } from "../brand/cards.js";
import { loadBrand } from "../brand/schema.js";
import { requireApproved } from "./approve.js";
import { hashOf, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import type { BrandCardProps } from "../remotion/BrandCard.js";
import type { PhraseClip } from "../remotion/PageCamera.js";
import { loadProject, projectDir } from "../project/load.js";
import { anchorsFor, approvalHash, type Project } from "../project/schema.js";
import type { Timeline } from "../qa/captions.js";
import { pageBottom } from "../remotion/caption.js";
import { captureFiles, META_VERSION, recordCapture, type CaptureMeta } from "../record/site.js";
import { planCamera } from "../render/camera.js";
import { compositionHash, concatClips, contactSheet, normalizeLoudness, probeDurationSec, renderClip, trimSilence, writeSrt, type Clip } from "../render/render.js";
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

export async function recordAll(c: Pick<ReturnType<typeof ctx>, "p" | "media" | "stamps">, formats: Format[], force: boolean): Promise<void> {
  for (const cap of c.p.captures) {
    const anchors = anchorsFor(c.p, cap.id);
    for (const f of formats) {
      const files = captureFiles(c.media, cap.id, f);
      await step(c.stamps, `record ${cap.id} ${f}`, { url: cap.url, f, anchors, capture: CAPTURE[f], meta: META_VERSION }, [files.png, files.meta],
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
  requireApproved(slug);
  const c = ctx(slug);
  const { p, media, out, stamps } = c;
  const formats = formatsOf(p, opts);
  if (opts.scene && !p.scenes.some((s) => s.id === opts.scene)) throw new VideoMillError(`no scene "${opts.scene}" in ${slug}`);
  const empty = p.scenes.filter((s) => !phrasesOf(s).some((ph) => ph.say.trim())).map((s) => s.id);
  if (empty.length) throw new VideoMillError(`scene(s) with no narration (scene \`narration\` or shot \`say\`): ${empty.join(", ")}`);
  const uncaptioned = p.scenes.filter((s) => phrasesOf(s).some((ph) => ph.say && !ph.caption.trim())).map((s) => s.id);
  if (uncaptioned.length) throw new VideoMillError(`scene(s) with narration but no caption: ${uncaptioned.join(", ")}`);

  const brand = loadBrand(p.brand);
  const parent = brand.parent ? loadBrand(brand.parent.brand) : undefined;
  const voice = p.voice ?? brand.voice ?? DEFAULT_VOICE;

  console.log(`videomill render ${slug} — ${p.scenes.length} scene(s) × ${formats.join(", ")}, brand ${brand.id}${parent ? ` (part of ${parent.id})` : ""}`);
  await recordAll(c, formats, opts.force && !opts.scene);
  const brandStamp: Record<string, string> = {};
  for (const b of [brand, parent].filter((x) => x !== undefined)) {
    brandStamp[b.id] = brandHash(b.id);
    await step(stamps, `brand ${b.id}`, brandStamp[b.id], [join(media, "brand", b.id, "brand.json")], async () => stageBrand(b.id, media), opts.force);
  }

  // Narration per phrase, cached by text + voice so editing one phrase re-voices only that phrase.
  let tts: TtsProvider | undefined;
  const voiced = async (name: string, text: string, force: boolean) => {
    const key = hashOf({ text, voice, provider: "kokoro", trim: QA.silenceFloorDb });
    const file = `tts/${key}.wav`;
    await step(stamps, name, key, [join(media, file)], async () => {
      tts ??= await getTtsProvider("kokoro");
      const t0 = performance.now();
      const r = await tts.synthesize(text, voice, join(media, file));
      trimSilence(join(media, file), QA.silenceFloorDb);
      info(`${r.durationSec.toFixed(2)}s audio in ${((performance.now() - t0) / 1000).toFixed(2)}s — "${text}"`);
    }, force);
    return { file, sec: probeDurationSec(join(media, file)) };
  };
  const audio: Record<string, { file?: string; sec: number }[]> = {};
  for (const s of p.scenes) {
    audio[s.id] = [];
    for (const [i, ph] of phrasesOf(s).entries()) {
      audio[s.id].push(ph.say ? await voiced(`tts ${s.id}#${i + 1}`, ph.say, opts.force && (!opts.scene || opts.scene === s.id)) : { sec: 0 });
    }
  }
  const endSay = brand.endCard?.say ? await voiced("tts end-card", brand.endCard.say, opts.force && !opts.scene) : undefined;

  const code = compositionHash();
  for (const f of formats) {
    const clips: string[] = [];
    const renders: unknown[] = [];
    const cues: { start: number; end: number; text: string }[] = [];
    let offset = 0; // seconds into the assembled video
    let frames = 0; // same, in frames (timeline for `qa`)
    const laid: Timeline["scenes"] = [];
    const card = async (name: string, props: BrandCardProps) => {
      const clip = join(out, "scenes", `${name}-${f}.mp4`);
      await step(stamps, `render ${name} ${f}`, { props, brands: brandStamp, code }, [clip],
        () => renderClip(f, { comp: "BrandCard", props }, media, clip, (pct) => info(`${name} ${f} ${pct}%`)), opts.force && !opts.scene);
      clips.push(clip);
      renders.push(stamps.get(`render ${name} ${f}`));
      offset += props.durationInFrames / FPS;
      frames += props.durationInFrames;
    };
    if (brand.parent?.opener && parent) {
      await card("@intro", {
        variant: "intro", brand: cardBrand(parent), intro: brand.parent.intro, subject: brand.name,
        durationInFrames: Math.round(brand.parent.introSeconds * FPS),
      });
    }
    for (const s of p.scenes) {
      const files = captureFiles(media, s.capture, f);
      const meta: CaptureMeta = JSON.parse(readFileSync(files.meta, "utf8"));
      if (meta.version !== META_VERSION) throw new VideoMillError(`capture ${s.capture} @${f} predates meta v${META_VERSION} (text runs) — run \`videomill record ${slug} --force\``);
      const t = timeScene(s, audio[s.id].map((a) => a.sec), FPS);
      const durationInFrames = Math.ceil(t.seconds * FPS);
      const phrases: PhraseClip[] = t.phrases.map((ph, i) => ({ audio: audio[s.id][i].file, caption: ph.caption, start: ph.start, end: ph.end }));
      const props = {
        image: `${s.capture}-${f}.png`,
        imageWidth: meta.width,
        segments: planCamera(t.scene, f, meta, t.seconds, FPS),
        phrases,
        font: textFont(brand),
        durationInFrames,
      };
      const clip = join(out, "scenes", `${s.id}-${f}.mp4`);
      const inputs = { props, img: stamps.get(`record ${s.capture} ${f}`), brand: brandStamp[brand.id], code };
      await step(stamps, `render ${s.id} ${f}`, inputs, [clip],
        () => renderClip(f, { comp: "PageCamera", props } satisfies Clip, media, clip, (pct) => info(`${s.id} ${f} ${pct}%`)),
        opts.force && (!opts.scene || opts.scene === s.id));
      clips.push(clip);
      renders.push(stamps.get(`render ${s.id} ${f}`));
      for (const ph of phrases) if (ph.caption) cues.push({ start: offset + ph.start / FPS, end: offset + ph.end / FPS, text: ph.caption });
      laid.push({ id: s.id, capture: s.capture, offset: frames, segments: props.segments, phrases: t.phrases.map(({ caption, start, end }) => ({ caption, start, end })) });
      offset += durationInFrames / FPS;
      frames += durationInFrames;
    }
    if (brand.endCard) {
      const e = brand.endCard;
      await card("@end-card", {
        variant: "end", brand: cardBrand(brand), headline: e.headline, url: e.url, audio: endSay?.file,
        signoff: brand.parent && parent ? { text: brand.parent.signoff, parent: cardBrand(parent, brand.colors.background) } : undefined,
        durationInFrames: Math.ceil(Math.max(e.seconds, endSay ? endSay.sec + 0.6 : 0) * FPS),
      });
    }

    const joined = join(out, "scenes", `joined-${f}.mp4`);
    const video = join(out, `${slug}-${f}.mp4`);
    const srt = join(out, `${slug}-${f}.srt`);
    const sheet = join(out, `${slug}-${f}-contact.png`);
    const tlPath = join(out, `timeline-${f}.json`);
    const timeline: Timeline = { format: f, fps: FPS, pageBottom: pageBottom(f, FORMATS[f].width, FORMATS[f].height), font: textFont(brand), scenes: laid };
    await step(stamps, `assemble ${f}`, renders, [joined], async () => concatClips(clips, joined), opts.force);
    await step(stamps, `loudness ${f}`, { joined: stamps.get(`assemble ${f}`), target: LOUDNESS }, [video], async () => {
      const l = normalizeLoudness(joined, video);
      info(`${l.before.toFixed(1)} → ${l.after.toFixed(1)} LUFS (target ${LOUDNESS.I})`);
    }, opts.force);
    await step(stamps, `captions ${f}`, cues, [srt], async () => writeSrt(cues, srt), opts.force);
    await step(stamps, `timeline ${f}`, timeline, [tlPath], async () => {
      mkdirSync(out, { recursive: true });
      writeFileSync(tlPath, JSON.stringify(timeline, null, 2) + "\n");
    }, opts.force);
    await step(stamps, `contact sheet ${f}`, stamps.get(`loudness ${f}`), [sheet],
      async () => contactSheet(video, sheet, f), opts.force);
    stamps.set(`rendered ${f}`, approvalHash(p)); // which approved content these outputs are (`qa`/`export` check it)
    if (existsSync(video)) info(`${slug}-${f}.mp4 — ${probeDurationSec(video).toFixed(1)}s, ${cues.length} caption(s)`);
  }
  ok(`outputs in out/${slug}/`);
}
