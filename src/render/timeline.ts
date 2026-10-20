// Phrase timeline (v1.E): each narration phrase maps to a shot, and its
// measured audio length sets that shot's duration (kokoro-js has no word
// timestamps — ADR-0004). Pure, so it is cache-stable and unit-testable.
import { phrased, type Scene, type Shot } from "../project/schema.js";
import { shotsSeconds } from "./camera.js";

/** Silence after each phrase before the next shot starts. */
export const PHRASE_GAP = 0.25;
/** Tail after whole-scene narration (v1.B–D behaviour). */
const SCENE_TAIL = 0.6;

/** A phrase to voice and/or caption. `say` empty = caption only. */
export type Phrase = { say: string; caption: string };
/** A phrase placed on the scene timeline, in frames: [start, end). */
export type TimedPhrase = Phrase & { start: number; end: number };

/** Phrases in speaking order. Whole-scene narration is one phrase. */
export function phrasesOf(scene: Scene): Phrase[] {
  if (!phrased(scene)) return [{ say: scene.narration.trim(), caption: scene.caption.trim() }];
  return (scene.shots ?? []).flatMap((sh) =>
    sh.kind !== "cut" && (sh.say || sh.caption) ? [{ say: sh.say ?? "", caption: sh.caption ?? sh.say ?? "" }] : []);
}

/**
 * Resolve shot durations from phrase audio lengths (seconds, aligned with
 * phrasesOf). Returns the scene with every timed shot's `seconds` set, the
 * phrases placed on the timeline, and the scene length.
 */
export function timeScene(scene: Scene, audioSec: number[], fps: number): { scene: Scene; phrases: TimedPhrase[]; seconds: number } {
  const phrases = phrasesOf(scene);
  if (!phrased(scene)) {
    const seconds = Math.max(scene.minSeconds, audioSec[0] + SCENE_TAIL, scene.shots ? shotsSeconds(scene.shots) : 0);
    return { scene, seconds, phrases: [{ ...phrases[0], start: 0, end: Math.ceil(seconds * fps) }] };
  }

  const shots: Shot[] = [];
  const timed: TimedPhrase[] = [];
  const frames = (s: number) => Math.max(1, Math.round(s * fps)); // same rounding as planCamera
  let t = 0;
  let k = 0;
  for (const sh of scene.shots!) {
    if (sh.kind === "cut") { shots.push(sh); continue; }
    if (!(sh.say || sh.caption)) { shots.push(sh); t += frames(sh.seconds!); continue; }
    const p = phrases[k];
    const total = Math.max(sh.seconds ?? 0, p.say ? audioSec[k] + PHRASE_GAP : 0);
    k++;
    // A move with its own `seconds` shorter than the phrase moves, then holds.
    if (sh.kind !== "hold" && sh.seconds !== undefined && sh.seconds < total) {
      shots.push({ ...sh, seconds: sh.seconds }, { kind: "hold", seconds: total - sh.seconds });
      timed.push({ ...p, start: t, end: t + frames(sh.seconds) + frames(total - sh.seconds) });
    } else {
      shots.push({ ...sh, seconds: total });
      timed.push({ ...p, start: t, end: t + frames(total) });
    }
    t = timed.at(-1)!.end;
  }
  const seconds = Math.max(scene.minSeconds, t / fps);
  return { scene: { ...scene, shots }, phrases: timed, seconds };
}
