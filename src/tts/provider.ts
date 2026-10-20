// TTS provider interface (ADR-0004). Callers never import a provider directly.

export interface TtsResult {
  path: string;
  durationSec: number;
}

export interface TtsProvider {
  readonly id: string;
  synthesize(text: string, voice: string, outPath: string): Promise<TtsResult>;
}

export async function getTtsProvider(id = "kokoro"): Promise<TtsProvider> {
  switch (id) {
    case "kokoro": {
      const { KokoroProvider } = await import("./kokoro.js");
      return new KokoroProvider();
    }
    default:
      throw new Error(`unknown TTS provider "${id}"`);
  }
}
