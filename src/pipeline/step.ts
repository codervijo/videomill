// Idempotent pipeline steps with ✓ ✗ ↷ markers (docs/CLAUDE.md § Pipeline idempotency).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const GREEN = "\x1b[32m", YELLOW = "\x1b[33m", RED = "\x1b[31m", DIM = "\x1b[2m", RESET = "\x1b[0m";

export const ok = (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`);
export const soft = (msg: string) => console.log(`${YELLOW}↷${RESET} ${msg}`);
export const fail = (msg: string) => console.error(`${RED}✗${RESET} ${msg}`);
export const info = (msg: string) => console.log(`${DIM}  ${msg}${RESET}`);

export class VideoMillError extends Error {}

export function hashOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);
}

type Stamps = Record<string, string>;

export class StampFile {
  private stamps: Stamps;
  constructor(private path: string) {
    this.stamps = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
  }
  get(key: string) { return this.stamps[key]; }
  set(key: string, hash: string) {
    this.stamps[key] = hash;
    mkdirSync(dirname(this.path), { recursive: true });
    writeFileSync(this.path, JSON.stringify(this.stamps, null, 2) + "\n");
  }
}

/**
 * Run `fn` only when an output is missing or the inputs hash changed.
 * Re-running with the same inputs is a no-op that prints ✓ up to date.
 */
export async function step<T>(
  stamps: StampFile,
  name: string,
  inputs: unknown,
  outputs: string[],
  fn: () => Promise<T>,
  force = false,
): Promise<void> {
  const hash = hashOf(inputs);
  const fresh = outputs.every(existsSync) && stamps.get(name) === hash;
  if (fresh && !force) {
    ok(`${name} — up to date, skipping`);
    return;
  }
  const t0 = Date.now();
  console.log(`  … ${name}`);
  try {
    await fn();
  } catch (e) {
    fail(`${name} — ${(e as Error).message}`);
    throw e;
  }
  stamps.set(name, hash);
  ok(`${name} — done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
