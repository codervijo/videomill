// Kokoro-82M via kokoro-js, local CPU inference (ADR-0004).
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { VideoMillError } from "../pipeline/step.js";
import type { TtsProvider, TtsResult } from "./provider.js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

type KokoroModule = typeof import("kokoro-js");

async function loadKokoro(): Promise<KokoroModule> {
  try {
    return await import("kokoro-js");
  } catch (e) {
    throw new VideoMillError(
      `kokoro-js not installed (${(e as Error).message}). ` +
        "Run `make deps` inside the container (`make buildsh`).",
    );
  }
}

export class KokoroProvider implements TtsProvider {
  readonly id = "kokoro";
  private tts: Awaited<ReturnType<KokoroModule["KokoroTTS"]["from_pretrained"]>> | undefined;

  async synthesize(text: string, voice: string, outPath: string): Promise<TtsResult> {
    if (!this.tts) {
      const { KokoroTTS } = await loadKokoro();
      this.tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "cpu" });
    }
    const audio = await this.tts.generate(text, { voice: voice as never });
    mkdirSync(dirname(outPath), { recursive: true });
    await audio.save(outPath);
    return { path: outPath, durationSec: audio.audio.length / audio.sampling_rate };
  }
}
