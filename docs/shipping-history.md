# Shipping history

Archived design rationale for shipped phases. Append-only, newest at top.

When a phase ships:
1. Move its design notes from `docs/prd.md` `#### Design notes` to a new section here.
2. The PRD's phase row stays — only the design notes migrate.

Format per entry: `## vN.X — <title>` (shipped YYYY-MM-DD) with the design rationale, key decisions, tradeoffs, and links to relevant commits / ADRs.

---

(Entries below, newest first.)

## v1.A — Kickoff / decisions lock (shipped 2026-10-20)

Operator decisions, taken from four options with tradeoffs:

- **All TypeScript** (ADR-0002). Python/uv CLI + TS compositions was rejected: it needs a bridge between two languages when the renderer is TS anyway. Divergence from lamill/RankMill accepted.
- **New builder `video` stack** (ADR-0003). Picked over a project-local Dockerfile (not reusable) and extending `Dockerfile.playwright` (bloats every Playwright project). Container-first is an operator constraint: no host installs, must port to another machine.
- **Kokoro TTS** via `kokoro-js` behind a `TtsProvider` interface (ADR-0004). Verified 2026-10-20: runs on Node CPU and returns no word-level timestamps, so synthesis and captions are per segment.
- **Export contract `videomill-export-v1`** (ADR-0005). Modeled on RankMill's `rankmill-crawl-v1`: atomic temp-dir writes, a `latest` symlink, additive-only within v1. RankMill has no VideoMill consumer yet.
- **v1 tier = brief's first milestone** (v1.B–v1.H as in `prd.md § 5`).

Also checked 2026-10-20:
- Remotion's Docker guidance uses Node 22 on Debian bookworm (`node:22-bookworm-slim`, no Alpine) and `npx remotion browser ensure`.
- Remotion's license is free for an individual or a for-profit org with up to 3 employees.

Channels: v1 = YouTube + X (operator: highest priority); TikTok deferred to v2 or later.

Remaining open moved to `prd.md § 7`: Fiverr reference location.
