// What the TTS voice is given, not what's shown (v1.K): Kokoro reads a domain
// like "lamill.io" as one word ("lamillio"), so dots in domains are spoken.
// Captions, SRT and on-screen text keep the written form.

// A word made of letters/digits/dashes joined by dots, ending in a letters-only TLD.
const DOMAIN = /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.([a-z]{2,24})\b(?![\w-]|\.\w)/gi; // a trailing sentence dot is fine

export function speakable(text: string): string {
  return text.replace(DOMAIN, (_, name: string, tld: string) => `${name.split(".").join(" dot ")} dot ${tld}`);
}
