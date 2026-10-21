# Architecture — videomill

How this project is built. Mechanisms, schemas, modules, and integrations. The "HOW" companion to `docs/prd.md`'s "WHY / WHAT".

Status: v1.I shipped (2026-10-20); v1.J (extension benchmark) blocked on the Fiverr reference video. Sections still marked *projected* are firmed up by the phase noted.

## 1. Project layout

Built through v1.H: `Makefile`, `Makefile.local`, `package.json`, `src/{cli,pipeline,project,record,tts,remotion,render,brand,storyboard,qa,export}`, `.claude/skills/videomill-draft/`, `brands/`, `src/constants.ts`, `projects/<slug>/project.json`, `out/`, `exports/`. The rest is projected (v1.J–v1.K):

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
│   ├── qa/                  # caption geometry checks (v1.H)
│   ├── export/              # manifest builder (ADR-0005)
│   └── constants.ts         # canonical enums: formats, video types, channels
├── brands/<id>/             # brand.json + logo/font assets (v1.F); README cites sources
├── projects/<slug>/
│   ├── project.json         # scenes as data — committed (v1.C)
│   └── media/               # recordings, screenshots — gitignored, re-recordable
├── exports/                 # immutable export folders — gitignored (ADR-0005)
└── .cache/                  # TTS segments, model weights, browsers — gitignored
```

## 2. Core mechanisms

### Video pipeline

`source (URL | markdown)` → **record** (Playwright footage + screenshots) → **draft** (Claude Code writes script + storyboard into `project.json`) → **approve** (operator gate; factual claims editable) → **synthesize** (TTS per phrase) → **render** (Remotion, per scene × per format) → **assemble** (concat scenes per format) → **QA** (v1.H: captions, loudness, contact sheet) → **export** (folder + `manifest.json`).

Rules:
- Every step probes existing state first and is safe to re-run; prints `✓` / `↷` / `✗`.
- Steps are keyed by content hash (`out/<slug>/stamps.json`). **Built in v1.C:**
  - `record <capture> <format>`: keyed by URL, anchors and capture settings.
  - `brand <id>` *(v1.F)*: keyed by a hash of `brands/<id>/`; stages it into `media/brand/<id>/` (Remotion publicDir).
  - `tts <scene>#<n>` *(per phrase since v1.E)*: keyed by phrase text + voice; the WAV is cached at `media/tts/<hash>.wav`. *(v1.I)* Leading/trailing silence below −50 dB is trimmed to 50 ms (`trimSilence()`): Kokoro pads each phrase with about 0.4 s, which stacked into > 1 s gaps.
  - `render <scene> <format>`: keyed by props, the capture stamp and `compositionHash()`.
  - `render @intro|@end-card <format>` *(v1.F)*: brand cards, keyed by props + brand hashes + `compositionHash()`.
  - `assemble <format>`: keyed by the list of scene render hashes; ffmpeg concat (video stream-copied, audio re-encoded) to `scenes/joined-<format>.mp4`.
  - `loudness <format>` *(v1.E)*: two-pass `loudnorm` to −14 LUFS → `<slug>-<format>.mp4`; prints before → after.
  - `captions <format>` *(v1.E)*: `<slug>-<format>.srt` from the phrase timings.
  - `timeline <format>` *(v1.H)*: `timeline-<format>.json`, what was laid out (per scene: offset, camera segments with `focus`, phrase windows, caption font), for `qa`.
  - `contact sheet <format>`.
  - After a format's steps, `render` stamps `rendered <format>` = the approval hash it rendered, so `qa` / `export` can tell stale outputs from current ones.
  - `qa <format>` *(v1.H)*: keyed by the approval hash, `rendered`, the video / SRT / sheet / timeline stamps and the thresholds; writes `qa-<format>.json`. The stamp is set only when every check passes.
  - `export` *(v1.H)*: keyed by the `qa` stamps, `publish` and `source` (not the commit, so a docs-only commit doesn't re-export).
- Editing one scene re-voices and re-renders only that scene, then re-assembles (verified 2026-10-20). `--scene <id> --force` forces one scene's TTS and render and leaves the rest cached.
- Render and approve are separate: render refuses to run unless the current `project.json` content is approved (v1.G, § Storyboard and approval).
- Claude drafting happens in the operator's Claude Code session editing `project.json`; the CLI makes no LLM calls in v1.

### Site recording (v1.B)

`src/record/site.ts`, one Chromium context per format:
- Viewport × `deviceScaleFactor` = output frame width (16x9: **1280 × 1.5** since v1.C; 9x16: 540 × 2, `isMobile`). So a full-page screenshot maps 1:1 onto video pixels and stays sharp. v1.B used 1920 × 1 for 16x9, which made desktop pages tiny and sparse; 1280 @1.5× reads about 1.5 times larger.
- **Anchors (v1.C):** every scene `from`/`to` that isn't `"top"` is a Playwright selector. At record time each one is resolved to a device-pixel y offset per format and written to `media/<capture>-<format>.json`. A missing anchor fails the record step with `✗`. Framing per format therefore comes from the real layout: the same heading sits at y=1144 on desktop and y=2048 on mobile.
- **Text runs (v1.I, meta version 3):** the recorder also writes the device-pixel box of every visible non-empty text node (`text: [{text, box}]`), so `qa` can see page text the script never names. Captures from meta version 2 fail `render` with `✗ … record --force`.
- The recorder scrolls the whole page once, so lazy images load (Playwright records this as `scroll-<f>.webm`). Then it returns to the top and takes a full-page PNG.
- The scene (`src/remotion/PageCamera.tsx`) moves a virtual camera over that PNG along segments planned from the scene's shots (next section). Phrase captions and narration play on top (§ Phrases and captions).
- **Caption strip (v1.I, both formats):** page footage ends at `pageBottom()` (`remotion/caption.ts`: caption band top − 24 px) and fades out over those 24 px into a solid white strip, which holds the captions. So a caption never hides page content. On 16:9 the strip is the bottom ~26% of the frame; on 9:16 it overlaps the platform UI zone below the safe area anyway. Chosen by the operator (2026-10-20) after `qa` found captions covering page text no shot could frame around (the Tables card, hero buttons, the phone line).
- **Finding (2026-10-20):** a screenshot pan beats Playwright's own video for page content. Playwright's recording is low-bitrate VP8, while the PNG pan is pixel-exact and deterministic. The `.webm` is kept as an artifact but not rendered. Interaction footage (clicks, popups) will still need real video capture (v1.J).

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
- **Zoom framing (v1.H; v1.I):** the zoom subject is fitted to `fill` of the clear area and centred in it: from the safe-zone top to `pageBottom()` (v1.H: to the caption band top, fitted to the whole frame), not the frame centre, so the strip doesn't cut it. Found by `qa` on lamillrentals 9:16, where the frame-centred Chairs card sat 22% under the caption.
- **`focus`:** each segment carries the anchor its framing is about (zoom target, or the pan / cut / hold / scene-`from` anchor; none for `top` and `+N` pans). `qa` uses it as the element captions must not cover.
- **Finding (2026-10-20):** on 9x16, typical mobile elements are already about 94% of the frame width (lamillrentals.com cards are 1016 of 1080 px). So `zoom` with `fill` ≤ 0.94 can't zoom in; it only recenters on the element. Zoom works as intended on 16x9 (Chairs card at the 2.5× cap). A per-shot minimum scale, if wanted, would be an additive field.

### Phrases and captions (v1.E)

`src/render/timeline.ts`, pure and unit-tested in `timeline.test.ts`:
- `phrasesOf(scene)`: one phrase per shot with `say`/`caption`, in order; a scene without them is one phrase (scene `narration` + `caption`) spanning the whole scene.
- `timeScene(scene, audioSec[], fps)`: each phrase's shot lasts max(`seconds`, audio + `PHRASE_GAP` 0.25 s). A pan/zoom whose own `seconds` is shorter moves, then gets an appended hold. Returns the scene with every shot timed (input to `planCamera`), phrase windows in frames, and the scene length (≥ `minSeconds`).
- `PageCamera.tsx` renders each phrase as a `<Sequence>` holding its `<Audio>` and caption, so a caption shows only while its phrase plays.
- **Safe zone:** `SAFE_ZONE` per format in `constants.ts`. 9x16 = Google's YouTube vertical-video zone (288 top / 192 right / 672 bottom / 48 left, source in the constant's comment); 16x9 = none. The caption box is laid out inside the zone.
- **Loudness:** `normalizeLoudness()` in `render.ts`, two-pass ffmpeg `loudnorm` against `LOUDNESS` (I −14, TP −1.5, LRA 11).
- **SRT:** `writeSrt()`; cue times are scene offset + phrase window.

### Brands and cards (v1.F)

- **LaMill presents its sites.** A site brand's `parent` (here `lamill`) adds a sign-off under the site's end-card CTA (`parent.signoff` + parent logo), and *only with `parent.opener: true`* (v1.I; default off) a silent opener in the parent's look before scene 1 (parent logo, `parent.intro`, site name). Assembled order: [`@intro`] → scenes → `@end-card`.
- `src/brand/schema.ts`: `loadBrand()` (typed errors per field path; id must equal the folder; every asset must exist), `isDark()`.
- `src/brand/cards.ts`: `brandHash()`, `stageBrand()`, `cardBrand(brand, background)` (resolves publicDir paths, picks the logo variant for the background), `textFont()`.
- `src/remotion/BrandCard.tsx`: `intro` / `end` variants inside `SAFE_ZONE`, spring-in, and the opener fades out. `src/remotion/fonts.ts` `useFonts()` registers brand font files via `FontFace` and holds the frame with `delayRender`. Captions use the brand text font.
- End-card length = max(`endCard.seconds`, `say` audio + 0.6 s); `say` is voiced like a phrase (`tts end-card`).

### Storyboard and approval (v1.G)

- **Draft** = Claude Code in the operator's session following the project skill `.claude/skills/videomill-draft/SKILL.md`. Steps: `record` the page, write shots with `say` from the site's own copy only, use real selectors, run `storyboard`, and hand off. The CLI makes no LLM calls.
- **`storyboard <slug>`** (`src/storyboard/build.ts`) records if needed, then writes `out/<slug>/storyboard.html` and a full-page Playwright screenshot `storyboard.png`. The page shows the status, hash and brand cards, then one row per camera segment: its landing framing per format, cropped from the recorded screenshot with the same view math as `PageCamera` and the caption strip drawn in, plus the line spoken from there and its caption. Silent holds that repeat the row above are dropped. Needs no TTS or Remotion, so it takes about a second. It's a `storyboard` step keyed by the approval hash, status, capture stamps and brands.
- **`approve <slug>`** refreshes the storyboard, prints the script, and writes `approval { status: "approved", approvedAt, hash }` into the raw JSON, so zod defaults aren't written into the file.
- **`approvalHash()`** covers `captures`, `scenes`, `voice` and `publish`: everything recorded, said, shown or published. `approvalState()` returns `draft` | `approved` | `edited since approval` (stored hash ≠ current). Brand files are not in the hash; they're committed and reviewed as code.
- **Gate:** `render` calls `requireApproved()` first. If the content changed it prints a `↷` with the old and new hash, then a `✗` naming the storyboard → approve fix.

### QA and export (v1.H)

- **`qa <slug>`** (`src/cli/qa.ts`) refuses unless approved and each format's outputs are `rendered` from the current approval hash. Per format:
  - **captions** (`src/qa/captions.ts`): each caption is laid out in Playwright Chromium with the render's own styles (`captionStyles()`, shared with `PageCamera`) and brand font, so the measured box is the rendered box. ✗ if the box leaves the safe zone, or *(v1.I)* intersects (≥ 1 px each way) the visible box of **any** recorded anchor, or of any recorded page text run, in any overlapping segment's start or end view. "Visible" = inside the page footage (`timeline.pageBottom`; absent on pre-strip timelines = the whole frame). With the strip this holds by construction; the check catches a caption that grows above the strip (e.g. wraps to three lines). v1.H's rule (≤ 10% of the `focus` element's area) passed a caption sitting 590×100 px on the Folding Chair card; `captions.test.ts` replays that export (`src/qa/fixtures/export-20261020T233815Z-9x16.json`) as a regression.
  - **silence** *(v1.I)*: ffmpeg `silencedetect` (`QA.silenceFloorDb` −50 dB) over the narration span (first phrase start → last phrase end); ✗ on any gap over `QA.maxSilenceSec` (1 s).
  - **duration** *(v1.I)*: within `QA.durationSec` (9x16 15–30 s, 16x9 15–45 s; operator-set).
  - **loudness:** integrated within ±`QA.lufsTolerance` (1 LU) of −14 LUFS and true peak ≤ `QA.maxTruePeak` (−1 dBTP).
  - **contact sheet** exists.
  - Loudness thresholds are VideoMill defaults chosen in v1.H, not platform specs; silence and duration are operator-set (v1.I).
- **`export <slug>`** (`src/cli/export.ts`, `src/export/manifest.ts`) refuses unless approved, every format's `qa` stamp matches the current outputs, and `publish` is set. It copies `video-<f>.mp4` and one `captions.srt` (cue timings are format-independent; it refuses if the formats' SRTs differ) into `exports/<slug>/.tmp-<ts>`, writes `manifest.json`, renames to `<ts>` (UTC, `20261020T232529Z`) and repoints the relative `latest` symlink. `videomillCommit` = `git rev-parse HEAD`; a dirty tree prints `↷`.

### Extension popup recording (v1.J — riskiest piece, benchmark test)

Playwright launches Chromium with a persistent context and the unpacked extension (`--load-extension`, `--disable-extensions-except`). The toolbar action popup itself is not scriptable, so the popup is captured by opening `chrome-extension://<id>/<popup>.html` in a page sized to popup dimensions, with Playwright video recording on. Extensions need headed (or new-headless) Chromium; the container provides Xvfb. Proven or disproven in v1.J.

## 3. Data shapes / schemas

### `projects/<slug>/project.json` — `videomill-project-v1` (locked in v1.C)

Validated by zod (`src/project/schema.ts`, strict: unknown keys are errors). Example: `projects/lamillrentals-promo/project.json`.

| Key | Meaning |
|---|---|
| `schema` | `"videomill-project-v1"` |
| `slug` | id (`[a-z0-9-]`); must equal the folder name |
| `type` | `site-promo` \| `build-in-public` |
| `brand` | brand id (`brands/<id>/brand.json`, v1.F) |
| `source` | `{ url?, file? }`, at least one; what the video is about |
| `formats` | non-empty subset of `["16x9", "9x16"]` |
| `voice?` | TTS voice id *(added v1.C)*; if absent, the brand's `voice`, else `DEFAULT_VOICE` (`af_heart`) *(default moved v1.F)* |
| `approval` | `{ status: "draft" \| "approved", approvedAt?, hash? }`, default draft. `hash` = `approvalHash()` over captures + scenes + voice + publish; enforced by `render` since v1.G. Written by `videomill approve` only |
| `captures[]` | `{ id, url }`, pages to record *(added v1.C)* |
| `scenes[]` | see below; ordered, non-empty, unique ids |
| `publish?` | `{ title, description, hashtags[], channels[], utm{medium,campaign,content} }`, copied into the manifest (v1.H) |

Scene (`kind: "page-scroll"`, the only kind in v1.C):

| Field | Meaning |
|---|---|
| `id` | unique within the project; names the clip |
| `shots?` | *(added v1.D)* ordered `hold` / `pan` / `zoom` / `cut` (see § 2 Camera and shots). When set, `to` is rejected and `screens` is ignored. *(v1.E)* `hold`/`pan`/`zoom` take optional `say` (spoken phrase) and `caption` (default `say`); with `say`, `seconds` is optional |
| `capture` | a `captures[].id` |
| `from` | `"top"` or a Playwright selector (default `"top"`) |
| `to?` | selector or `"top"`; if absent the pan runs `screens` × frame height from `from` (no-shots scenes only) |
| `screens` | 0–4, default 1 |
| `narration` | whole-scene spoken text; must be empty when shots carry `say` |
| `caption` | whole-scene burned-in text; must be empty when shots carry `say`/`caption` |
| `minSeconds` | default 3; scene length = max(minSeconds, narration + 0.6 s, shots), or with phrases max(minSeconds, timed shots) |
| `framing?` | per-format `{ from?, to? }` overrides |

Change from the v1.A projection: `voice` and `captures` were added at the top level (additive). A scene's `narration` is a single string, not an array; v1.E segments via shot `say` instead.

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
- *(v1.H)* `source` is the project's `source` as-is. `durationSec` is ffprobe's, rounded to ms. One `captions` entry, `lang` from `CAPTION_LANG` (`en`).
- `utm.source` is intentionally absent: the consumer sets it per channel when posting.
- `channels` is a list of strings from `constants.ts`; v1 values `youtube`, `x` (operator priority). `tiktok` arrives in v2 or later — additive, no schema bump.
- `fps` default 30 is a v1.B default, not a contract value — consumers read it, never assume it.

### `brands/<id>/brand.json` — `videomill-brand-v1` (locked in v1.F)

zod-validated (`src/brand/schema.ts`, strict). Asset paths are relative to the brand folder. Values come from the brand's own site source (`brands/README.md`).

| Key | Meaning |
|---|---|
| `schema` | `"videomill-brand-v1"` |
| `id` | must equal the folder name |
| `name` | display name, e.g. `LaMill Rentals` |
| `logo` | `{ light, dark?, withName=false }`. Files for light / dark backgrounds; `withName` = the file is an icon and `name` is rendered beside it |
| `colors` | `{ primary, onPrimary, background, text, muted }`, `#rrggbb`; `primary` = CTA |
| `fonts` | `{ text, cta? }`, each `{ family, file?, uppercase=false }`; no `file` = system sans |
| `voice?` | TTS voice when the project sets none |
| `endCard?` | `{ headline, url, seconds=2, say? }`, appended after the last scene (default 3 → 2 in v1.I) |
| `parent?` | `{ brand, opener=false, intro="Introducing", introSeconds=1.5, signoff="Part of" }`, the brand that presents this one: end-card sign-off, plus the opener when `opener` *(added v1.I)* |

## 4. Modules

| Module | Purpose |
|---|---|
| `src/constants.ts` | Canonical enums: `FORMATS`, `VIDEO_TYPES`, `CHANNELS`, `FPS`, per-format `CAPTURE` settings, `SAFE_ZONE`, `LOUDNESS`, `DEFAULT_VOICE` |
| `src/brand/schema.ts` | `brand.json` zod schema, `loadBrand()`, `isDark()`; tests in `schema.test.ts` |
| `src/brand/cards.ts` | brand → card/caption props; `brandHash()`, `stageBrand()` |
| `src/pipeline/step.ts` | `step()` runner: skips when outputs exist and the inputs hash matches `out/<slug>/stamps.json`; prints `✓ ✗ ↷`; `VideoMillError` |
| `src/project/schema.ts` | zod schema for `project.json`, `approvalHash()`, `approvalState()`, `anchorsFor()`; tests in `schema.test.ts` |
| `src/project/load.ts` | `loadProject()` (typed errors listing each invalid field path), `writeProject()` |
| `src/record/site.ts` | Playwright capture of a live page per format: full-page PNG + anchor **boxes** + visible text-run boxes JSON (`CaptureMeta` version 3: `{x,y,w,h}` per selector and per text node, device px) |
| `src/tts/provider.ts` | `TtsProvider` interface + `getTtsProvider(id)` (ADR-0004) |
| `src/tts/kokoro.ts` | Kokoro-82M via kokoro-js, `q8`, CPU; lazy import wrapped in a typed error |
| `src/remotion/` | `index.ts` (registerRoot), `Root.tsx` (`PageCamera-16x9` / `PageCamera-9x16`, duration from props), `PageCamera.tsx`, `BrandCard.tsx` (+ `BrandCard-<f>`), `fonts.ts` |
| `src/render/camera.ts` | `planCamera()` shots → segments; `shotsSeconds()`; tests in `camera.test.ts` |
| `src/render/timeline.ts` | `phrasesOf()`, `timeScene()`: phrase audio lengths → timed shots + phrase windows; tests in `timeline.test.ts` |
| `src/render/render.ts` | Remotion bundle (cached per publicDir) + `renderClip()` → `renderMedia` (h264, concurrency 4, `enforceAudioTrack`); `concatClips()`; `normalizeLoudness()` / `measureLufs()`; `writeSrt()`; ffmpeg contact sheet; `compositionHash()` so renders re-run when scene code changes |
| `src/cli/index.ts` | arg parsing + dispatch |
| `src/cli/new.ts` | `new`: scaffolds a valid `project.json` with one empty scene |
| `src/cli/approve.ts` | `storyboard`, `approve`, `requireApproved()` (render gate) |
| `src/qa/captions.ts` | `Timeline` type, caption box measurement (Playwright), `captionIssues()` (safe zone + any visible anchor); tests + regression fixture in `captions.test.ts` / `fixtures/` |
| `src/export/manifest.ts` | `buildManifest()` (`videomill-export-v1`); tests in `manifest.test.ts` |
| `src/cli/qa.ts` | `qa`, `qaInputs()`, `requireRendered()` |
| `src/cli/export.ts` | `export`: gates, atomic folder write, `latest` symlink |
| `src/remotion/caption.ts` | caption layout (`captionStyles()`, `captionBand()`, `pageBottom()`) shared by render, camera, storyboard and `qa` |
| `src/storyboard/build.ts` | storyboard HTML (segment stills per format + script) → PNG via Playwright |
| `src/cli/render.ts` | `record` and `render`: the per-scene pipeline |

## 5. CLI / UX surface

**Built (v1.C; `storyboard` / `approve` v1.G; `qa` / `export` v1.H):**

```
videomill new <slug> --type <site-promo|build-in-public> --brand <id> --url <page>
videomill record <slug> [--format <f>] [--force]
videomill storyboard <slug> [--force]
videomill approve <slug>
videomill render <slug> [--scene <id>] [--format <f>] [--force]
videomill qa <slug> [--format <f>] [--force]
videomill export <slug> [--force]
```

`render` refuses unless approved (§ 2 Storyboard and approval). It also refuses scenes with no narration or captions, and unknown brands. Outputs: `out/<slug>/<slug>-<f>.mp4`, `<slug>-<f>.srt`, `<slug>-<f>-contact.png`, `scenes/{@intro,<id>,@end-card}-<f>.mp4`. `new` refuses an unknown `--brand`. From the host: `make up` once, then `make x T=run ARGS="render <slug>"`.

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

None in progress. v1.J (extension benchmark) is blocked on the Fiverr reference video + its extension (`prd.md § 7`).

## 9. Risks

- **Extension popup capture** (§ 2, v1.J) may not match what a real toolbar click shows (popup chrome, positioning). Fallback: compose the popup page into a browser-frame SVG in Remotion.
- **`qa` caption geometry is measured, not captured.** Boxes come from Playwright Chromium with the render's styles; Remotion renders with its own Chrome Headless Shell, so glyph metrics can differ by a pixel or so. The cover check samples each overlapping segment's start and end view, not every frame of a move.
- **Kokoro on CPU** — measured in v1.E at roughly real time per phrase in the container (1.8 s audio in 2.0 s; 2.4 s in 1.4 s). Voice quality vs. the Fiverr benchmark is still unjudged. Mitigation: provider interface (ADR-0004).
- **No word timestamps** from kokoro-js → captions are segment-timed (ADR-0004).
- **Image size** — Playwright Chromium + Remotion Chrome Headless Shell + ffmpeg.
- **Shared dev container** — builder's `dev_container.sh` defaults to container `mb1`; `Makefile.local` sets `CONTAINER_NAME=videomill`, `DOCKER_CMD=docker`, and host port 3333 → 3000.
- **Root-owned files on the host** — the container runs as root, so `node_modules/`, `.cache/`, `out/`, `projects/*/media/` and `pnpm-lock.yaml` are root-owned on the host. The host user can't delete or edit them without sudo. See § 10.
- **Narration loudness** — the v1.B render measured mean −26.5 dB and peak −8.9 dB (ffmpeg volumedetect), likely quiet for social platforms. Normalized to −14 LUFS since v1.E (lamillrentals-promo measured −22.8 before); the `qa` loudness check is v1.H.
- **Disk** — `node_modules` is 1.6 GB, `.cache` 681 MB, plus the 1.65 GB image. The host had about 26 GB free.
- **Recordings are gitignored** — a project whose source can't be re-recorded (e.g. the Fiverr reference footage) can't be rebuilt from git alone. Revisit if it bites.
- **Remotion license** — free tier ends above 3 employees.

## 10. Tracked refactors

Work known to be queued at the architectural level. Each entry: **trigger** (what would make this worth doing now), **risk** (what could go wrong), **cost** (rough effort).

- **Container user = host user.** Run the dev container with the host UID/GID so bind-mounted files aren't root-owned. **Trigger: hit 2026-10-20.** Snap Chromium showed `ERR_ACCESS_DENIED` on a root-owned render, because AppArmor's `owner` rules block files the user doesn't own. Symptom patch: `make x` now runs `chown -R` back to the host UID after every command. **Risk:** `dev_container.sh` is shared by every builder stack; global npm/pnpm paths in the image assume root. **Cost:** about 1 h in builder plus testing across stacks.
- **Builder auto-detect for `video`.** ADR-0003 planned an auto-detect rule (`remotion` in `package.json`, ahead of `playwright`). v1.B set `STACK := video` explicitly instead, because builder's `Makefile` has uncommitted Playwright-stack work from another session. **Trigger:** once that work is committed. **Cost:** 5 min.
