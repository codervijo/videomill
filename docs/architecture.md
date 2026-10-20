# Architecture — videomill

How this project is built. Mechanisms, schemas, modules, and integrations. The "HOW" companion to `docs/prd.md`'s "WHY / WHAT".

Status: **projected** (locked in v1.A, 2026-10-20). Nothing below is built yet; each section is firmed up by the phase noted.

## 1. Project layout

Projected (lands across v1.B–v1.H):

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

(Filled per phase as modules land.)

## 5. CLI / UX surface

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
- Node 22 (Remotion's Docker baseline), pnpm, TypeScript strict (ADR-0002).
- Remotion 4.x; its own Chrome Headless Shell (`npx remotion browser ensure`) baked into the image.
- Playwright npm version pinned to match the base image tag.
- ffmpeg from Debian packages in the image.
- Remotion license: free for an individual or a for-profit org with up to 3 employees; a company license is required beyond that.

## 8. Active implementation plans

### v1.B — container + proof of concept on lamillrentals.com

1. Builder: add `Makefile.video` + `Dockerfile.video`; auto-detect `remotion` in `package.json` before the `playwright` rule. (Separate commit in the builder repo.)
2. VideoMill: `Makefile` builder include, `Makefile.local` with `CONTAINER_NAME=videomill`, minimal `package.json`.
3. Record https://lamillrentals.com with Playwright in the container: a smooth scroll capture of the homepage (video) + full-page screenshot, at both a desktop and a mobile viewport.
4. One 10-second Remotion scene from that footage with a caption and one Kokoro TTS line.
5. Render 16:9 and 9:16; generate a contact sheet (ffmpeg tile).
6. Report what worked, what failed, and any plan change → update this doc + PRD.

## 9. Risks

- **Extension popup capture** (§ 2, v1.H) may not match what a real toolbar click shows (popup chrome, positioning). Fallback: compose the popup page into a browser-frame SVG in Remotion.
- **Kokoro on CPU** — synthesis speed and voice quality vs. the Fiverr benchmark unknown until v1.D. Mitigation: provider interface (ADR-0004).
- **No word timestamps** from kokoro-js → captions are segment-timed (ADR-0004).
- **Image size** — Playwright Chromium + Remotion Chrome Headless Shell + ffmpeg.
- **Shared dev container** — builder's `dev_container.sh` defaults to container `mb1`; must override `CONTAINER_NAME`.
- **Recordings are gitignored** — a project whose source can't be re-recorded (e.g. the Fiverr reference footage) can't be rebuilt from git alone. Revisit if it bites.
- **Remotion license** — free tier ends above 3 employees.

## 10. Tracked refactors

Work known to be queued at the architectural level. Each entry: **trigger** (what would make this worth doing now), **risk** (what could go wrong), **cost** (rough effort).

(None yet.)
