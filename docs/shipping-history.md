# Shipping history

Archived design rationale for shipped phases. Append-only, newest at top.

When a phase ships:
1. Move its design notes from `docs/prd.md` `#### Design notes` to a new section here.
2. The PRD's phase row stays — only the design notes migrate.

Format per entry: `## vN.X — <title>` (shipped YYYY-MM-DD) with the design rationale, key decisions, tradeoffs, and links to relevant commits / ADRs.

---

(Entries below, newest first.)

## v1.C — Project file: scenes as data, single-scene re-render (shipped 2026-10-20)

- `projects/<slug>/project.json` (`videomill-project-v1`) validated by a strict zod schema with typed, path-level errors. `new` scaffolds one; `render` refuses empty narration or captions.
- **Selector anchors instead of pixel offsets.** A scene says `from: 'h2:has-text("Rental Categories")'`. The recorder resolves it per format (desktop y=1144, mobile y=2048 on lamillrentals.com), so one scene definition frames correctly in both formats. Per-format `framing` overrides exist but weren't needed.
- **Per-scene clips + concat.** Each scene renders to `out/<slug>/scenes/<id>-<f>.mp4`, and the clips are joined with ffmpeg concat (video copied, audio re-encoded to avoid AAC priming clicks). Verified: editing one caption re-rendered one clip per format plus the assemble step, with everything else ✓ cached. `--scene hero --format 9x16 --force` touched one clip.
- **TTS per scene, cached by text + voice** (`media/tts/<hash>.wav`), so editing narration re-voices one scene.
- **16x9 capture 1280 × 1.5** (was 1920 × 1 in v1.B): desktop pages were too small to read at 1920 CSS px. The record cache key now includes the capture settings.
- First real project: `lamillrentals-promo`, 3 scenes (hero → categories → featured), 14.7 s per format. All narration and captions come from the site's own copy.
- Schema vs. the v1.A projection: `voice` and `captures` were added at the top level (additive). `narration` is a single string, not an array; segmenting is v1.D's decision.
- Known limit: zod reports cross-field errors (duplicate ids, unknown capture) only once the basic shape is valid.

## v1.B — Container + POC on lamillrentals.com (shipped 2026-10-20)

All exit criteria met in one pass:
- ✓ The `videomill` container builds from the new builder `video` stack. Builder gained two new files only (`Dockerfile.video`, `Makefile.video`), which are uncommitted in the builder repo.
- ✓ https://lamillrentals.com recorded in the container at 16x9 (1920 × 1) and 9x16 (540 × 2), scroll `.webm` plus full-page PNG, in about 6–7 s per format.
- ✓ Kokoro narration (`af_heart`, q8, CPU) from the site's own hero copy: 10.38 s of audio in 11.0 s, including first-run model load.
- ✓ `SiteScroll` scene rendered in both formats: H.264/AAC, 1920×1080 and 1080×1920, 30 fps, 11.9 s. The first render took 31 s (webpack bundle included), the second format 8.5 s.
- ✓ ffmpeg contact sheets for both formats, checked visually: smooth monotonic pan, readable caption, sharp 9x16 frames.
- ✓ A re-run with no changes skips every step. Changing the scene code re-renders only the renders and contact sheets.

Decisions and findings:
- **Screenshot pan over Playwright video** for page content (see `architecture.md § 2 Site recording`).
- **Remotion pinned exactly (4.0.537)**, since `remotion` and `@remotion/*` must match.
- **Browsers installed by `make deps`, not baked into the image**, so Playwright and Remotion browser versions follow the lockfile.
- **Explicit `STACK := video`** instead of the auto-detect rule in ADR-0003, because the builder `Makefile` had another session's uncommitted work. Logged as a tracked refactor.
- **Host-side `Makefile.local` targets** (`up`, `x`, `sh`, `down`), because builder's `buildsh` is interactive-only.
- **Caption box opacity 0.94**: at 0.85, page text showed through.
- Issues logged in `architecture.md § 9/§ 10`: root-owned bind-mount files, quiet narration (mean −26.5 dB), disk footprint.

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
