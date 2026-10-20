# Architecture — videomill

How this project is built. Mechanisms, schemas, modules, and integrations. The "HOW" companion to `docs/prd.md`'s "WHY / WHAT".

Status: v1.D built (2026-10-20). Sections still marked *projected* are firmed up by the phase noted.

## 1. Project layout

Built through v1.D: `Makefile`, `Makefile.local`, `package.json`, `src/{cli,pipeline,project,record,tts,remotion,render}`, `src/constants.ts`, `projects/<slug>/project.json`, `out/`. The rest is projected (v1.E–v1.J):

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
├── brands/<brand>.json      # brand profiles (v1.F)
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
- Steps are keyed by content hash (`out/<slug>/stamps.json`). **Built in v1.C:**
  - `record <capture> <format>`: keyed by URL, anchors and capture settings.
  - `tts <scene>`: keyed by narration + voice; the WAV is cached at `media/tts/<hash>.wav`.
  - `render <scene> <format>`: keyed by props, the capture stamp and `compositionHash()`.
  - `assemble <format>`: keyed by the list of scene render hashes; ffmpeg concat with video stream-copied and audio re-encoded.
  - `contact sheet <format>`.
- Editing one scene re-voices and re-renders only that scene, then re-assembles (verified 2026-10-20). `--scene <id> --force` forces one scene's TTS and render and leaves the rest cached.
- Render and approve are separate: render refuses to run unless `project.json` is approved (v1.G).
- Claude drafting happens in the operator's Claude Code session editing `project.json`; the CLI makes no LLM calls in v1.

### Site recording (v1.B)

`src/record/site.ts`, one Chromium context per format:
- Viewport × `deviceScaleFactor` = output frame width (16x9: **1280 × 1.5** since v1.C; 9x16: 540 × 2, `isMobile`). So a full-page screenshot maps 1:1 onto video pixels and stays sharp. v1.B used 1920 × 1 for 16x9, which made desktop pages tiny and sparse; 1280 @1.5× reads about 1.5 times larger.
- **Anchors (v1.C):** every scene `from`/`to` that isn't `"top"` is a Playwright selector. At record time each one is resolved to a device-pixel y offset per format and written to `media/<capture>-<format>.json`. A missing anchor fails the record step with `✗`. Framing per format therefore comes from the real layout: the same heading sits at y=1144 on desktop and y=2048 on mobile.
- The recorder scrolls the whole page once, so lazy images load (Playwright records this as `scroll-<f>.webm`). Then it returns to the top and takes a full-page PNG.
- The scene (`src/remotion/PageCamera.tsx`) moves a virtual camera over that PNG along segments planned from the scene's shots (next section). The caption sits clear of the Shorts UI on 9x16, with narration audio underneath.
- **Finding (2026-10-20):** a screenshot pan beats Playwright's own video for page content. Playwright's recording is low-bitrate VP8, while the PNG pan is pixel-exact and deterministic. The `.webm` is kept as an artifact but not rendered. Interaction footage (clicks, popups) will still need real video capture (v1.I).

### Camera and shots (v1.D)

`src/render/camera.ts` `planCamera(scene, format, meta, seconds, fps)` → `Segment[]`. It's a pure function, unit-tested in `camera.test.ts`.
- **View** = the visible window into the screenshot `{x, y, w}` in image pixels; height follows the frame aspect. Views are clamped inside the image, and zoom is capped at `MAX_ZOOM` = 2.5× because the screenshot is captured at 1:1 output pixels and gets soft beyond that.
- **Anchor view** = full width, with the anchor box 4% of frame height below the top edge. **Zoom view** = the smallest window that fits the anchor box at `fill` in both dimensions, centered on it, then clamped.
- **Shots** run in order from the scene's `from` view:
  - `hold {seconds, at?}`: static; `at` cuts there first.
  - `pan {seconds, to}`: `to` is an anchor or `"+N"` frame-heights down.
  - `zoom {seconds, target, fill=0.85}`
  - `cut {to}`: instant.
- If narration runs longer than the shots, the last framing holds to the end.
- **No shots** = v1.C behaviour, compiled as hold 0.4 s → pan to `to` (or `+screens`) → hold 0.6 s. So every scene renders through one code path.
- **Rendering:** each frame interpolates the current segment with ease-in-out cubic. Zoom width interpolates in log space so its speed looks even. The image is resized (not CSS-scaled), so Chromium resamples from source pixels.
- **Finding (2026-10-20):** on 9x16, typical mobile elements are already about 94% of the frame width (lamillrentals.com cards are 1016 of 1080 px). So `zoom` with `fill` ≤ 0.94 can't zoom in; it only recenters on the element. Zoom works as intended on 16x9 (Chairs card at the 2.5× cap). A per-shot minimum scale, if wanted, would be an additive field.

### Extension popup recording (v1.I — riskiest piece, benchmark test)

Playwright launches Chromium with a persistent context and the unpacked extension (`--load-extension`, `--disable-extensions-except`). The toolbar action popup itself is not scriptable, so the popup is captured by opening `chrome-extension://<id>/<popup>.html` in a page sized to popup dimensions, with Playwright video recording on. Extensions need headed (or new-headless) Chromium; the container provides Xvfb. Proven or disproven in v1.I.

## 3. Data shapes / schemas

### `projects/<slug>/project.json` — `videomill-project-v1` (locked in v1.C)

Validated by zod (`src/project/schema.ts`, strict: unknown keys are errors). Example: `projects/lamillrentals-promo/project.json`.

| Key | Meaning |
|---|---|
| `schema` | `"videomill-project-v1"` |
| `slug` | id (`[a-z0-9-]`); must equal the folder name |
| `type` | `site-promo` \| `build-in-public` |
| `brand` | brand profile id (`brands/<brand>.json`, v1.F) |
| `source` | `{ url?, file? }`, at least one; what the video is about |
| `formats` | non-empty subset of `["16x9", "9x16"]` |
| `voice` | TTS voice id, default `af_heart` *(added v1.C)* |
| `approval` | `{ status: "draft" \| "approved", approvedAt?, hash? }`, default draft. `hash` = `scenesHash()` over captures + scenes + voice. Enforced from v1.G |
| `captures[]` | `{ id, url }`, pages to record *(added v1.C)* |
| `scenes[]` | see below; ordered, non-empty, unique ids |
| `publish?` | `{ title, description, hashtags[], channels[], utm{medium,campaign,content} }`, copied into the manifest (v1.H) |

Scene (`kind: "page-scroll"`, the only kind in v1.C):

| Field | Meaning |
|---|---|
| `id` | unique within the project; names the clip |
| `shots?` | *(added v1.D)* ordered `hold` / `pan` / `zoom` / `cut` (see § 2 Camera and shots). When set, `to` is rejected and `screens` is ignored |
| `capture` | a `captures[].id` |
| `from` | `"top"` or a Playwright selector (default `"top"`) |
| `to?` | selector or `"top"`; if absent the pan runs `screens` × frame height from `from` (no-shots scenes only) |
| `screens` | 0–4, default 1 |
| `narration` | spoken text (one TTS segment until v1.E splits it into phrases) |
| `caption` | burned-in text |
| `minSeconds` | default 3; scene length = max(minSeconds, narration + 0.6 s) |
| `framing?` | per-format `{ from?, to? }` overrides |

Change from the v1.A projection: `voice` and `captures` were added at the top level (additive). A scene's `narration` is a single string, not an array; v1.E decides segmenting.

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

### `brands/<brand>.json` (v1.F)

Colors, logo path, fonts, TTS voice id, caption style, and a **CTA end-card template** (appended as the last scene). Shared `lamill` brand plus one per site. Field set locked in v1.F.

## 4. Modules

| Module | Purpose |
|---|---|
| `src/constants.ts` | Canonical enums: `FORMATS`, `VIDEO_TYPES`, `CHANNELS`, `FPS`, per-format `CAPTURE` settings |
| `src/pipeline/step.ts` | `step()` runner: skips when outputs exist and the inputs hash matches `out/<slug>/stamps.json`; prints `✓ ✗ ↷`; `VideoMillError` |
| `src/project/schema.ts` | zod schema for `project.json`, `scenesHash()`, `anchorsFor()` |
| `src/project/load.ts` | `loadProject()` (typed errors listing each invalid field path), `writeProject()` |
| `src/record/site.ts` | Playwright capture of a live page per format: full-page PNG + anchor **boxes** JSON (`CaptureMeta` version 2: `{x,y,w,h}` per selector, device px) |
| `src/tts/provider.ts` | `TtsProvider` interface + `getTtsProvider(id)` (ADR-0004) |
| `src/tts/kokoro.ts` | Kokoro-82M via kokoro-js, `q8`, CPU; lazy import wrapped in a typed error |
| `src/remotion/` | `index.ts` (registerRoot), `Root.tsx` (`PageCamera-16x9` / `PageCamera-9x16`, duration from props), `PageCamera.tsx` |
| `src/render/camera.ts` | `planCamera()` shots → segments; `shotsSeconds()`; tests in `camera.test.ts` |
| `src/render/render.ts` | Remotion bundle (cached per publicDir) + `renderMedia` (h264, concurrency 4); `concatClips()`; ffmpeg contact sheet; `compositionHash()` so renders re-run when scene code changes |
| `src/cli/index.ts` | arg parsing + dispatch |
| `src/cli/new.ts` | `new`: scaffolds a valid `project.json` with one empty scene |
| `src/cli/render.ts` | `record` and `render`: the per-scene pipeline |

## 5. CLI / UX surface

**Built (v1.C):**

```
videomill new <slug> --type <site-promo|build-in-public> --brand <id> --url <page>
videomill record <slug> [--format <f>] [--force]
videomill render <slug> [--scene <id>] [--format <f>] [--force]
```

`render` refuses scenes with empty narration or caption. Outputs: `out/<slug>/<slug>-<f>.mp4`, `<slug>-<f>-contact.png`, `scenes/<id>-<f>.mp4`. From the host: `make up` once, then `make x T=run ARGS="render <slug>"`.

Projected command tree (names firmed per phase; no aliases):

```
videomill new <slug> --type <site-promo|build-in-public> --brand <id> [--url <u> | --file <md>]   (v1.C)
videomill record <slug>                                  (v1.B/v1.C)
videomill approve <slug>                                 (v1.G)
videomill render <slug> [--scene <id>] [--format <f>]    (v1.B → v1.C)
videomill qa <slug>                                      (v1.H)
videomill export <slug>                                  (v1.H; refuses unless qa passes)
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
- Tests: `make x T=test` = `tsc --noEmit` + Node's built-in test runner via `tsx --test` (no test framework dependency).
- Remotion license: free for an individual or a for-profit org with up to 3 employees; a company license is required beyond that.

## 8. Active implementation plans

v1.D shipped (see `shipping-history.md`). Next: v1.E, phrase captions mapped to shots, SRT, 9:16 safe zone, −14 LUFS (plan in `prd.md § 5` design notes).

## 9. Risks

- **Extension popup capture** (§ 2, v1.I) may not match what a real toolbar click shows (popup chrome, positioning). Fallback: compose the popup page into a browser-frame SVG in Remotion.
- **Kokoro on CPU** — synthesis speed and voice quality vs. the Fiverr benchmark unknown until v1.E. Mitigation: provider interface (ADR-0004).
- **No word timestamps** from kokoro-js → captions are segment-timed (ADR-0004).
- **Image size** — Playwright Chromium + Remotion Chrome Headless Shell + ffmpeg.
- **Shared dev container** — builder's `dev_container.sh` defaults to container `mb1`; `Makefile.local` sets `CONTAINER_NAME=videomill`, `DOCKER_CMD=docker`, and host port 3333 → 3000.
- **Root-owned files on the host** — the container runs as root, so `node_modules/`, `.cache/`, `out/`, `projects/*/media/` and `pnpm-lock.yaml` are root-owned on the host. The host user can't delete or edit them without sudo. See § 10.
- **Narration loudness** — the v1.B render measured mean −26.5 dB and peak −8.9 dB (ffmpeg volumedetect), likely quiet for social platforms. Normalization to −14 LUFS (ffmpeg `loudnorm`) is v1.E; the `qa` loudness check is v1.H.
- **Disk** — `node_modules` is 1.6 GB, `.cache` 681 MB, plus the 1.65 GB image. The host had about 26 GB free.
- **Recordings are gitignored** — a project whose source can't be re-recorded (e.g. the Fiverr reference footage) can't be rebuilt from git alone. Revisit if it bites.
- **Remotion license** — free tier ends above 3 employees.

## 10. Tracked refactors

Work known to be queued at the architectural level. Each entry: **trigger** (what would make this worth doing now), **risk** (what could go wrong), **cost** (rough effort).

- **Container user = host user.** Run the dev container with the host UID/GID so bind-mounted files aren't root-owned. **Trigger: hit 2026-10-20.** Snap Chromium showed `ERR_ACCESS_DENIED` on a root-owned render, because AppArmor's `owner` rules block files the user doesn't own. Symptom patch: `make x` now runs `chown -R` back to the host UID after every command. **Risk:** `dev_container.sh` is shared by every builder stack; global npm/pnpm paths in the image assume root. **Cost:** about 1 h in builder plus testing across stacks.
- **Builder auto-detect for `video`.** ADR-0003 planned an auto-detect rule (`remotion` in `package.json`, ahead of `playwright`). v1.B set `STACK := video` explicitly instead, because builder's `Makefile` has uncommitted Playwright-stack work from another session. **Trigger:** once that work is committed. **Cost:** 5 min.
