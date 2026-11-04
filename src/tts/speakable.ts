// What the TTS voice is given, not what's shown (v1.K): Kokoro reads a domain
// like "lamill.io" as one word ("lamillio"), so dots in domains are spoken, and
// brand names it gets wrong are respelled.
// Captions, SRT and on-screen text keep the written form.

// A word made of letters/digits/dashes joined by dots, ending in a letters-only TLD.
const DOMAIN = /\b([a-z0-9-]+(?:\.[a-z0-9-]+)*)\.([a-z]{2,24})\b(?![\w-]|\.\w)/gi; // a trailing sentence dot is fine

// TLDs said letter by letter (operator: "lamill dot I O", not "io"); others are said as words ("dot com").
const SPELLED_TLDS: Record<string, string> = { io: "I O", ai: "A I" };

// Brand names Kokoro mispronounces → how they're said (operator: "LaMill" is "La Mill").
// Matched case-insensitively at a word start, so "lamill.io" and "lamillrentals" are covered.
const SAY_AS: [RegExp, string][] = [[/\bla-?mill(?=([a-z]?))/gi, "La Mill"]];

export function speakable(text: string): string {
  let out = text.replace(DOMAIN, (_, name: string, tld: string) => `${name.split(".").join(" dot ")} dot ${SPELLED_TLDS[tld.toLowerCase()] ?? tld}`);
  for (const [re, say] of SAY_AS) out = out.replace(re, (_m, next: string) => (next ? `${say} ` : say));
  return out;
}
