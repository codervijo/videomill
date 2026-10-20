# Architecture — videomill

How this project is built. Mechanisms, schemas, modules, and integrations. The "HOW" companion to `docs/prd.md`'s "WHY / WHAT".

Status: v1.B built (2026-10-20). Sections still marked *projected* are firmed up by the phase noted.

## 1. Project layout

Built in v1.B: `Makefile`, `Makefile.local`, `package.json`, `src/{cli,pipeline,record,tts,remotion,render}`, `src/constants.ts`, `projects/<slug>/poc.json`, `out/`. The rest is projected (v1.C–v1.I):

```
videomill/
├── Makefile                 # includes ~/work/projects/builder/Makefile (ADR-0003)
├── Makefile.local           # project-only targets / overrides (CONTAINER_NAME etc.)
├── package.json             # pnpm, all TS (ADR-0002)
├── src/
│   ├── cli/                 # command entry points (scope: one file per verb)
│   ├── pipeline/            # step runner + idempotent steps (✓ ✗ ↷ markers)
│   ├── record/              # Playwright recording (pages + extension popups)
│   ├── tts/                 # TtsProvider interface + kokoro adapter (ADR-0004)
│   ├── remotion/            # Remotion root, compositions, scene components
│   ├── export/              # export folder + manifest writer (ADR-0005)
│   └── constants.ts         # canonical enums: formats, video types, channels
├── brands/<brand>.json      # brand profiles (v1.E)
├── projects/<slug>/
│   ├── project.json         # scenes as data — committed (v1.C)
│   └── media/               # recordings, screenshots — gitignored, re-recordable
├── exports/                 # immutable export folders — gitignored (ADR-0005)
└── .cache/                  # TTS segments, model weights, browsers — gitignored
```

## 2. Core mechanisms

### Video pipeline

`source (URL | markdown)` → **record** (Playwright footage + screenshots) → **draft** (Claude Code writes script + storyboard into `project.json`) → **approve** (operator gate; factual claims editable) → **synthesize** (TTS per caption segment) → **render** (Remotion, per scene × per format) → **assemble** (concat scenes per format) → **QA** (P1) → **export** (folder + `manifest.json`).

Rules:
- Every step probes existing state first and is safe to re-run; prints `✓` / `↷` / `✗`.
- Steps are keyed by content hash (scene data + brand + voice), so changing one scene invalidates only that scene's TTS segments and scene render. This is how single-scene re-render (P0) works: render scene clips individually, then concat.
- Render and approve are separate: render refuses to run unless `project.json` is approved (v1.F).
- Claude drafting happens in the operator's Claude Code session editing `project.json`; the CLI makes no LLM calls in v1.

### Site recording (v1.B)

`src/record/site.ts`, one Chromium context per format:
- Viewport × `deviceScaleFactor` = output frame width (16x9: 1920 × 1; 9x16: 540 × 2, `isMobile`). So a full-page screenshot maps 1:1 onto video pixels and stays sharp.
- The recorder scrolls the whole page once, so lazy images load (Playwright records this as `scroll-<f>.webm`). Then it returns to the top and takes a full-page PNG.
- The scene (`src/remotion/SiteScroll.tsx`) pans down that PNG: 1 s hold, eased travel of up to 2 screens, 1 s hold. The caption sits clear of the Shorts UI on 9x16, with narration audio underneath.
- **Finding (2026-10-20):** a screenshot pan beats Playwright's own video for page content. Playwright's recording is low-bitrate VP8, while the PNG pan is pixel-exact and deterministic. The `.webm` is kept as an artifact but not rendered. Interaction footage (clicks, popups) will still need real video capture (v1.H).

### Extension popup recording (v1.H — riskiest piece, benchmark test)

Playwright launches Chromium with a persistent context and the unpacked extension (`--load-extension`, `--disable-extensions-except`). The toolbar action popup itself is not scriptable, so the popup is captured by opening `chrome-extension://<id>/<popup>.html` in a page sized to popup dimensions, with Playwright video recording on. Extensions need headed (or new-headless) Chromium; the container provides Xvfb. Proven or disproven in v1.H.

## 3. Data shapes / schemas

### `projects/<slug>/project.json` — `videomill-project-v1` (top-level locked in v1.A; field detail in v1.C)

| Key | Meaning |
|---|---|
| `schema` | `"videomill-project-v1"` |
| `slug` | project id; folder name |
| `type` | `site-promo` \| `build-in-public` |
| `brand` | brand profile id (`brands/<brand>.json`) |
| `source` | `{ url?, file? }` — what the video is about |
| `formats` | subset of `["16x9", "9x16"]` |
| `approval` | `{ status: "draft" \| "approved", approvedAt?, hash? }` — hash of scenes at approval; any later edit drops back to draft |
| `scenes[]` | ordered scenes: `{ id, kind, narration[], media?, framing: { "16x9": …, "9x16": … } }` |
| `publish` | `{ title, description, hashtags[], channels[], utm }` — copied into the manifest |

### `exports/<slug>/<UTC-ts>/manifest.json` — `videomill-export-v1` (locked; ADR-0005)

```json
{
  "schema": "videomill-export-v1",
  "complete": true,
  "project": "<slug>",
  "type": "site-promo",
  "brand": "<brand id>",
  "createdAt": "<ISO-8601 UTC>",
  "videomillCommit": "<git sha>",
  "source": { "url": "<page URL>" },
  "title": "…",
  "description": "…",
  "hashtags": ["…"],
  "channels": ["youtube", "x"],
  "utm": { "medium": "social", "campaign": "<…>", "content": "<slug>" },
  "videos": [
    { "format": "9x16", "width": 1080, "height": 1920, "fps": 30, "durationSec": 0, "path": "video-9x16.mp4" },
    { "format": "16x9", "width": 1920, "height": 1080, "fps": 30, "durationSec": 0, "path": "video-16x9.mp4" }
  ],
  "captions": [{ "lang": "en", "path": "captions.srt" }]
}
```

- Paths are relative to the export folder.
- `utm.source` is intentionally absent: the consumer sets it per channel when posting.
- `channels` is a list of strings from `constants.ts`; v1 values `youtube`, `x` (operator priority). `tiktok` arrives in v2 or later — additive, no schema bump.
- `fps` default 30 is a v1.B default, not a contract value — consumers read it, never assume it.

### `brands/<brand>.json` (v1.E)

Colors, logo path, fonts, TTS voice id, caption style. Shared `lamill` brand plus one per site. Field set locked in v1.E.

## 4. Modules

| Module | Purpose |
|---|---|
| `src/constants.ts` | Canonical enums: `FORMATS`, `VIDEO_TYPES`, `CHANNELS`, `FPS`, per-format `CAPTURE` settings |
| `src/pipeline/step.ts` | `step()` runner: skips when outputs exist and the inputs hash matches `out/<slug>/stamps.json`; prints `✓ ✗ ↷`; `VideoMillError` |
| `src/record/site.ts` | Playwright capture of a live page (scroll video + full-page PNG) per format |
| `src/tts/provider.ts` | `TtsProvider` interface + `getTtsProvider(id)` (ADR-0004) |
| `src/tts/kokoro.ts` | Kokoro-82M via kokoro-js, `q8`, CPU; lazy import wrapped in a typed error |
| `src/remotion/` | `index.ts` (registerRoot), `Root.tsx` (`SiteScroll-16x9` / `SiteScroll-9x16`, duration from props), `SiteScroll.tsx` |
| `src/render/render.ts` | Remotion bundle (cached per publicDir) + `renderMedia` (h264, concurrency 4); ffmpeg contact sheet; `compositionHash()` so renders re-run when scene code changes |
| `src/cli/index.ts` | `videomill render <slug> [--force]` |

## 5. CLI / UX surface

**Built (v1.B):** `videomill render <slug> [--force]`. It reads `projects/<slug>/poc.json` (a temporary format, replaced by `project.json` in v1.C) and runs record → tts → render → contact sheet per format, writing to `out/<slug>/`. From the host: `make up` once, then `make x T=run ARGS="render <slug>"`.

Projected command tree (names firmed per phase; no aliases):

```
videomill new <slug> --type <site-promo|build-in-public> --brand <id> [--url <u> | --file <md>]   (v1.C)
videomill record <slug>                                  (v1.B/v1.C)
videomill approve <slug>                                 (v1.F)
videomill render <slug> [--scene <id>] [--format <f>]    (v1.B → v1.C)
videomill export <slug>                                  (v1.H)
```

Runs inside the container (`make buildsh`, then `pnpm videomill …`), or via a Makefile target that `docker exec`s it. Output: one line per step with `✓ ✗ ↷`, printed live.

## 6. Integrations / external APIs

- **None remote in v1.** Kokoro runs locally (ADR-0004). Model weights download once from Hugging Face into `.cache/` — the only network dependency, at first run.
- **RankMill** consumes exports via the folder contract only (ADR-0005).

## 7. Stack baselines

- Linux x86_64, Docker. Host needs Docker + make only (ADR-0003).
- Image `builder/Dockerfile.video`: `node:22-bookworm` + ffmpeg, Xvfb, fonts (Liberation, Noto), Playwright's Chromium system deps, pnpm 9. About 1.65 GB.
- Node 22, pnpm 9.15.9 (`packageManager`), TypeScript strict (ADR-0002); TS runs via `tsx`.
- Remotion **4.0.537, pinned exactly** across `remotion` / `@remotion/*`, which must stay in lockstep. Chrome Headless Shell is installed by `make deps` into `node_modules/.remotion/`.
- Playwright 1.64.1. Chromium is installed by `make deps` into `.cache/ms-playwright` (`PLAYWRIGHT_BROWSERS_PATH`), so its version follows the lockfile.
- kokoro-js 1.2.1 (onnxruntime-node 1.21).
- Output: H.264 + AAC 48 kHz, 30 fps.
- Remotion license: free for an individual or a for-profit org with up to 3 employees; a company license is required beyond that.

## 8. Active implementation plans

v1.B shipped (see `shipping-history.md`). Next: v1.C, `project.json` with scenes as data (plan in `prd.md § 5` design notes).

## 9. Risks

- **Extension popup capture** (§ 2, v1.H) may not match what a real toolbar click shows (popup chrome, positioning). Fallback: compose the popup page into a browser-frame SVG in Remotion.
- **Kokoro on CPU** — synthesis speed and voice quality vs. the Fiverr benchmark unknown until v1.D. Mitigation: provider interface (ADR-0004).
- **No word timestamps** from kokoro-js → captions are segment-timed (ADR-0004).
- **Image size** — Playwright Chromium + Remotion Chrome Headless Shell + ffmpeg.
- **Shared dev container** — builder's `dev_container.sh` defaults to container `mb1`; `Makefile.local` sets `CONTAINER_NAME=videomill`, `DOCKER_CMD=docker`, and host port 3333 → 3000.
- **Root-owned files on the host** — the container runs as root, so `node_modules/`, `.cache/`, `out/`, `projects/*/media/` and `pnpm-lock.yaml` are root-owned on the host. The host user can't delete or edit them without sudo. See § 10.
- **Narration loudness** — the v1.B render measured mean −26.5 dB and peak −8.9 dB (ffmpeg volumedetect), likely quiet for social platforms. Normalization (ffmpeg `loudnorm`) belongs in v1.D, and checking it in P1 QA.
- **Disk** — `node_modules` is 1.6 GB, `.cache` 681 MB, plus the 1.65 GB image. The host had about 26 GB free.
- **Recordings are gitignored** — a project whose source can't be re-recorded (e.g. the Fiverr reference footage) can't be rebuilt from git alone. Revisit if it bites.
- **Remotion license** — free tier ends above 3 employees.

## 10. Tracked refactors

Work known to be queued at the architectural level. Each entry: **trigger** (what would make this worth doing now), **risk** (what could go wrong), **cost** (rough effort).

- **Container user = host user.** Run the dev container with the host UID/GID so bind-mounted files aren't root-owned. **Trigger:** the first time root ownership blocks a host action (deleting `node_modules`, editing the lockfile). **Risk:** `dev_container.sh` is shared by every builder stack; global npm/pnpm paths in the image assume root. **Cost:** about 1 h in builder plus testing across stacks.
- **Builder auto-detect for `video`.** ADR-0003 planned an auto-detect rule (`remotion` in `package.json`, ahead of `playwright`). v1.B set `STACK := video` explicitly instead, because builder's `Makefile` has uncommitted Playwright-stack work from another session. **Trigger:** once that work is committed. **Cost:** 5 min.
