// `record` and `render` — the per-scene pipeline (docs/architecture.md § 2).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { CAPTURE, DEFAULT_VOICE, FORMATS, FPS, LOUDNESS, QA, type Format } from "../constants.js";
import { brandHash, cardBrand, stageBrand, textFont } from "../brand/cards.js";
import { loadBrand } from "../brand/schema.js";
import { requireApproved } from "./approve.js";
import { hashOf, info, ok, step, StampFile, VideoMillError } from "../pipeline/step.js";
import type { BrandCardProps } from "../remotion/BrandCard.js";
import type { Chrome, PageCameraProps, PhraseClip, PopupClip } from "../remotion/PageCamera.js";
import type { SceneCardProps } from "../remotion/SceneCard.js";
import { frameLayout } from "../remotion/frame.js";
import { loadProject, projectDir } from "../project/load.js";
import { anchorsFor, approvalHash, type AnyScene, type Project, type Scene } from "../project/schema.js";
import { videoFile } from "../export/manifest.js";
import { EXPORTS_DIR } from "./export.js";
import type { Timeline } from "../qa/captions.js";
import { pageBottom } from "../remotion/caption.js";
import { captureFiles, META_VERSION, recordCapture, type CaptureMeta } from "../record/site.js";
import { captureSource } from "../record/source.js";
import { EXT_META_VERSION, extensionBuildHash, extensionFiles, recordExtension, type ExtensionMeta } from "../record/extension.js";
import { planCamera } from "../render/camera.js";
import { compositionHash, concatClips, contactSheet, cutClip, normalizeLoudness, probeDurationSec, renderClip, trimSilence, writeSrt, type Clip } from "../render/render.js";
import { phrasesOf, popupsOf, timeScene } from "../render/timeline.js";
import { getTtsProvider, type TtsProvider } from "../tts/provider.js";
import { speakable } from "../tts/speakable.js";

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
      const src = captureSource(cap, c.media);
      // A url capture keeps its v1.J key, so recorded pages don't re-record.
      await step(c.stamps, `record ${cap.id} ${f}`, { url: cap.url ? cap.url : src.key, f, anchors, capture: CAPTURE[f], meta: META_VERSION }, [files.png, files.meta],
        () => recordCapture(src.href, f, anchors, c.media, cap.id), force);
      if (cap.extension) {
        const ef = extensionFiles(c.media, cap.id, f);
        const views = Object.fromEntries(cap.extension.outputs.map((o) => [o.id, anchorsFor(c.p, cap.id, o.id)]));
        await step(c.stamps, `record ${cap.id} extension ${f}`, { url: cap.url, f, extension: cap.extension, views, build: extensionBuildHash(cap.extension.name), capture: CAPTURE[f], v: EXT_META_VERSION },
          [ef.meta, ef.popup, ...cap.extension.outputs.flatMap((o) => [ef.view(o.id).png, ef.view(o.id).meta])],
          () => recordExtension(cap, f, c.media, views), force);
      }
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
    const spoken = speakable(text); // "lamill.io" → "lamill dot io" for the voice only (v1.K)
    const key = hashOf({ text: spoken, voice, provider: "kokoro", trim: QA.silenceFloorDb });
    const file = `tts/${key}.wav`;
    await step(stamps, name, key, [join(media, file)], async () => {
      tts ??= await getTtsProvider("kokoro");
      const t0 = performance.now();
      const r = await tts.synthesize(spoken, voice, join(media, file));
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
  const endCard = p.endCard ?? brand.endCard; // a project's own end card wins (v1.K)
  const endSay = endCard?.say ? await voiced("tts end-card", endCard.say, opts.force && !opts.scene) : undefined;

  /** The image a page scene's camera moves over (the page, or an extension output's view), its window and popups (v1.J). */
  const pageScene = (s: Scene, f: Format) => {
    const cap = p.captures.find((c) => c.id === s.capture)!;
    const ext: ExtensionMeta | undefined = cap.extension ? JSON.parse(readFileSync(extensionFiles(media, cap.id, f).meta, "utf8")) : undefined;
    const out = s.view ? ext?.outputs[s.view] : undefined;
    const metaPath = out ? join(media, out.view.replace(/\.png$/, ".json")) : captureFiles(media, s.capture, f).meta;
    const meta: CaptureMeta = JSON.parse(readFileSync(metaPath, "utf8"));
    if (meta.version !== META_VERSION) throw new VideoMillError(`capture ${s.capture}${s.view ? ` view ${s.view}` : ""} @${f} predates meta v${META_VERSION} (text runs) — run \`videomill record ${slug} --force\``);
    const label = out?.url ?? captureSource(cap, media).label;
    const chrome: Chrome | undefined = !s.frame ? undefined
      : s.frame === "editor" ? { kind: "editor", label: out?.title ?? label.split("/").pop() ?? label }
      : { kind: "browser", label: label.replace(/^https?:\/\/(www\.)?/, ""), icon: ext?.extension.icon };
    const area = s.frame ? frameLayout(f, FORMATS[f].width, FORMATS[f].height).area : undefined;
    const popups = (shows: ReturnType<typeof popupsOf>): PopupClip[] => shows.map((sh, i) => {
      const shot = sh.state ? ext!.after[sh.state] : ext!.popup;
      return { image: shot.png, width: shot.width, height: shot.height, start: sh.start, end: sh.end, enter: i === 0 || shows[i - 1].end !== sh.start };
    });
    const stamp = cap.extension ? [stamps.get(`record ${cap.id} ${f}`), stamps.get(`record ${cap.id} extension ${f}`)] : stamps.get(`record ${cap.id} ${f}`);
    return { image: out ? out.view : `${s.capture}-${f}.png`, meta, chrome, area, popups, stamp };
  };

  // The span a clip scene plays, cut out on its own: from + scene length, both pinned in the name.
  const clipName = (s: Extract<AnyScene, { kind: "clip" }>, f: Format, seconds: number) =>
    `clip-${s.project}-${s.export}-${s.format ?? f}-${s.from}s-${Math.round(seconds * 1000)}ms.mp4`;
  /**
   * Copy a clip scene's source video into the media dir (Remotion's publicDir) and return its name there.
   * Export folders are written once and never changed, so the folder name pins the footage (v1.L).
   */
  const stageClip = (s: Extract<AnyScene, { kind: "clip" }>, f: Format, seconds: number): string => {
    const src = join(EXPORTS_DIR, s.project, s.export, videoFile(s.format ?? f));
    if (!existsSync(src)) throw new VideoMillError(`scene ${s.id}: no ${relative(process.cwd(), src)} — export ${s.project} first, or fix \`export\``);
    const length = probeDurationSec(src);
    if (s.from + seconds > length + 0.05) throw new VideoMillError(`scene ${s.id}: needs ${(s.from + seconds).toFixed(1)}s of ${s.project}'s ${s.format ?? f} video, which is ${length.toFixed(1)}s — lower \`from\` or shorten the narration`);
    const name = clipName(s, f, seconds);
    if (!existsSync(join(media, name))) { mkdirSync(media, { recursive: true }); cutClip(src, s.from, seconds, join(media, name)); }
    return name;
  };

  // Stage clips before the first render: Remotion bundles the media dir once, so later copies would 404.
  for (const s of p.scenes) {
    if (s.kind === "clip") for (const f of formats) stageClip(s, f, timeScene(s, audio[s.id].map((a) => a.sec), FPS).seconds);
  }

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
      const t = timeScene(s, audio[s.id].map((a) => a.sec), FPS);
      const durationInFrames = Math.ceil(t.seconds * FPS);
      const phrases: PhraseClip[] = t.phrases.map((ph, i) => ({ audio: audio[s.id][i].file, caption: ph.caption, start: ph.start, end: ph.end }));
      const clip = join(out, "scenes", `${s.id}-${f}.mp4`);
      let segments: Timeline["scenes"][number]["segments"] = [];
      let area: Timeline["scenes"][number]["area"];
      if (t.scene.kind === "page-scroll") {
        const page = pageScene(t.scene, f);
        segments = planCamera(t.scene, f, page.meta, t.seconds, FPS, page.area);
        area = page.area;
        const props: PageCameraProps = {
          image: page.image, imageWidth: page.meta.width, segments, phrases, font: textFont(brand),
          chrome: page.chrome, background: brand.colors.background, popups: page.popups(popupsOf(t.scene, FPS)), durationInFrames,
        };
        const inputs = { props, img: page.stamp, brand: brandStamp[brand.id], code };
        await step(stamps, `render ${s.id} ${f}`, inputs, [clip],
          () => renderClip(f, { comp: "PageCamera", props } satisfies Clip, media, clip, (pct) => info(`${s.id} ${f} ${pct}%`)),
          opts.force && (!opts.scene || opts.scene === s.id));
      } else {
        const sc = t.scene;
        const props: SceneCardProps = sc.kind === "title"
          ? { variant: "title", brand: cardBrand(brand), text: sc.text, phrases, durationInFrames }
          : sc.kind === "badges" ? { variant: "badges", brand: cardBrand(brand), items: sc.items, phrases, durationInFrames }
          : { variant: "clip", brand: cardBrand(brand), video: clipName(sc, f, t.seconds), videoWidth: FORMATS[sc.format ?? f].width, videoHeight: FORMATS[sc.format ?? f].height, startFrom: 0, phrases, durationInFrames };
        await step(stamps, `render ${s.id} ${f}`, { props, brands: brandStamp, code }, [clip],
          () => renderClip(f, { comp: "SceneCard", props } satisfies Clip, media, clip, (pct) => info(`${s.id} ${f} ${pct}%`)),
          opts.force && (!opts.scene || opts.scene === s.id));
      }
      clips.push(clip);
      renders.push(stamps.get(`render ${s.id} ${f}`));
      for (const ph of phrases) if (ph.caption) cues.push({ start: offset + ph.start / FPS, end: offset + ph.end / FPS, text: ph.caption });
      laid.push({
        id: s.id, capture: s.kind === "page-scroll" ? s.capture : undefined, view: s.kind === "page-scroll" ? s.view : undefined, area,
        offset: frames, segments, phrases: t.phrases.map(({ caption, start, end }) => ({ caption, start, end })),
      });
      offset += durationInFrames / FPS;
      frames += durationInFrames;
    }
    if (endCard) {
      const e = endCard;
      await card("@end-card", {
        variant: "end", brand: cardBrand(brand), headline: e.headline, url: e.url, tagline: e.tagline, audio: endSay?.file,
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
