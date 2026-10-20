import assert from "node:assert/strict";
import { test } from "node:test";
import { Scene } from "../project/schema.js";
import { PHRASE_GAP, phrasesOf, timeScene } from "./timeline.js";

const FPS = 30;
const scene = (extra: object) => Scene.parse({ id: "s", kind: "page-scroll", capture: "page", narration: "", caption: "", ...extra });

test("whole-scene narration is one phrase spanning the scene (v1.B–D behaviour)", () => {
  const s = scene({ narration: "Hello there.", caption: "Hi" });
  const t = timeScene(s, [2], FPS);
  assert.equal(t.seconds, 3); // minSeconds 3 > 2 + 0.6
  assert.deepEqual(t.phrases, [{ say: "Hello there.", caption: "Hi", start: 0, end: 90 }]);
});

test("each `say` maps to its shot; the phrase audio sets the shot length", () => {
  const s = scene({ minSeconds: 0.1, shots: [
    { kind: "hold", say: "One." },
    { kind: "cut", to: "#a" },
    { kind: "zoom", target: "#a", say: "Two.", caption: "2" },
  ] });
  assert.deepEqual(phrasesOf(s), [{ say: "One.", caption: "One." }, { say: "Two.", caption: "2" }]);
  const t = timeScene(s, [1, 2], FPS);
  const len = (sec: number) => Math.round((sec + PHRASE_GAP) * FPS);
  assert.deepEqual(t.phrases.map((p) => [p.start, p.end]), [[0, len(1)], [len(1), len(1) + len(2)]]);
  assert.deepEqual(t.scene.shots!.map((sh) => (sh.kind === "cut" ? "cut" : sh.seconds)), [1 + PHRASE_GAP, "cut", 2 + PHRASE_GAP]);
  assert.equal(t.seconds, (len(1) + len(2)) / FPS);
});

test("a move with its own `seconds` moves, then holds for the rest of the phrase", () => {
  const s = scene({ shots: [{ kind: "pan", to: "#a", seconds: 1, say: "A longer phrase." }] });
  const t = timeScene(s, [3], FPS);
  assert.deepEqual(t.scene.shots!.map((sh) => [sh.kind, sh.kind === "cut" ? 0 : sh.seconds]), [["pan", 1], ["hold", 2 + PHRASE_GAP]]);
  assert.equal(t.phrases[0].end, 30 + Math.round((2 + PHRASE_GAP) * FPS));
});

test("silent shots keep their seconds and carry no phrase", () => {
  const s = scene({ shots: [{ kind: "hold", seconds: 0.5 }, { kind: "hold", say: "Hi." }] });
  const t = timeScene(s, [1], FPS);
  assert.equal(t.phrases.length, 1);
  assert.equal(t.phrases[0].start, 15);
});

test("timed shots need `seconds` or `say`; shot `say` and scene narration don't mix", () => {
  assert.throws(() => scene({ shots: [{ kind: "hold" }] }), /needs `seconds`/);
  assert.throws(() => scene({ narration: "x", caption: "x", shots: [{ kind: "hold", say: "y" }] }), /leave scene `narration`/);
});
