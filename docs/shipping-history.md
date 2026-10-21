# Shipping history

Archived design rationale for shipped phases. Append-only, newest at top.

When a phase ships:
1. Move its design notes from `docs/prd.md` `#### Design notes` to a new section here.
2. The PRD's phase row stays — only the design notes migrate.

Format per entry: `## vN.X — <title>` (shipped YYYY-MM-DD) with the design rationale, key decisions, tradeoffs, and links to relevant commits / ADRs.

---

(Entries below, newest first.)

## v1.I — v1.H defect fixes (shipped 2026-10-20)

- Defects seen in the shipped v1.H video (operator, 2026-10-20). Inserted before the benchmark; benchmark → v1.J, build-in-public → v1.K.
  - **Parent opener opt-in:** no LaMill logo intro unless `brand.json` `parent.opener: true`; the end-card sign-off stays.
  - **Silence ≤ 1 s between phrases:** `qa` runs ffmpeg `silencedetect` over the narration span; the hero's silent 1.5 s pan is shortened to 0.6 s. `qa` also caught Kokoro's ~0.4 s per-phrase padding (gaps of 1.02–1.68 s), fixed by trimming each phrase WAV (`trimSilence()`).
  - **End card ~2 s:** `endCard.seconds` default 3 → 2.
  - **"No minimum order"** zooms to the hero line that says it, not a product card.
  - **9:16 captions:** stay at the bottom of Google's safe zone (operator, 2026-10-20); the camera frames subjects above the caption band.
  - **`qa` caption overlap:** a caption box may not intersect any visible recorded anchor box (was: ≤ 10% of the shot's subject area, which passed a caption sitting 590×100 px on the Folding Chair card). Regression test on export `20261020T233815Z`'s real 9:16 geometry.
  - **Duration (operator-set):** 9:16 15–30 s, 16:9 15–45 s, checked by `qa`.
  - **Quote close** holds on the hero framing: zooming to the small "Get a Quote" button cropped the 16:9 hero line; the 9:16 Chiavari card is taller than the clear area above the caption band.
  - **Duration shortfall:** trimming dead air took the video to 14.0 s. Operator added the hero's own line "Or call (831) 288-5751 to check a date." → 19.9 s.
- **Real run 2026-10-20:** re-approved (hash `9a081ed42d207dc5`, operator-directed) → render → `qa` passed both formats (captions, −14.1 LUFS / TP −1.5, no gap > 1 s, 19.9 s, contact sheet) → export.
- **Known gap:** `qa` only knows anchors the script names; the 9:16 categories hold puts its captions over the unnamed Tables card (`bugs.md`).
- Tests: 21 total (caption overlap rewritten as 4, incl. the regression).

## v1.H — lamillrentals.com end to end; `qa` gates export (shipped 2026-10-20)

- First complete video: every pipeline step runs on one real project and produces an export RankMill could consume. This is the end-to-end proof. `videomill qa <slug>` checks caption overlap (captions inside the safe zone and not over key content), integrated loudness (−14 LUFS within tolerance), and that a contact sheet was produced. `export` refuses unless `qa` passes. Pulled forward from the brief's P1 "Automated QA" row; the remaining P1 QA checks (text clipping, brand spelling, resolution/duration) stay in a later tier.
  - **Built 2026-10-20:** `qa`, `export`, the timeline file `render` writes for `qa`, and zoom framing that keeps the subject above the caption band (`architecture.md § 2`). "Key content" = the element the shot is about (zoom target, pan / cut / hold anchor).
  - **Proven on a throwaway approved copy** of `lamillrentals-promo`: render → `qa` first failed on 9:16 (caption covered 22% of the zoomed Chairs card), passed after the zoom fix → `export` wrote `exports/<slug>/<ts>/` + `manifest.json`; re-export skipped; an edit or a re-approval without re-render made `qa` and `export` refuse.
  - **Real run 2026-10-20:** operator approved `lamillrentals-promo` (hash `e04c88abf9557bd0`) → render → `qa` passed both formats (−14.0 LUFS, TP −1.5) → `exports/lamillrentals-promo/20261020T232945Z/`. Manifest records `ab909ac` from a dirty tree (v1.H uncommitted at export time).
  - **Remaining to ship:** the operator watches the exported videos.
  - **Seen:** the video is 21.0 s, under the P0 25–45 s target. Not a v1.H check (duration QA is the later tier); lengthening is a script change for the operator.
- Tests: caption geometry (3), manifest (1), segment `focus` (1); 20 total.

## v1.G — Script/storyboard draft + approval gate (shipped 2026-10-20)

- **Gate (shape locked in v1.A):** `render` refuses unless `approval.hash` equals `approvalHash()` of the current content. Any edit to `captures`, `scenes`, `voice` or `publish` makes the project "edited since approval". `publish` was added to the hash because its title and description are factual claims that reach the manifest. Brand files stay outside the hash: they're committed code reviewed in diffs.
- **No render preview before approval.** The pre-approval review is the storyboard, kept cheap (≈1 s, no TTS or render) so the edit → review loop stays fast. Approving is one command, and the next edit drops it back to draft.
- **`storyboard`** shows one row per camera segment, each with its landing framing per format and the line spoken there. It's HTML and a Playwright PNG, so Claude can read the PNG during drafting and the operator can open the HTML on the host.
- **`approve`** edits the raw JSON so the operator's file isn't rewritten with zod defaults, and prints the script it approves.
- **Draft** is a project skill (`.claude/skills/videomill-draft`), not CLI code. It says to use only the site's own claims, real selectors, then storyboard and stop. Agents never run `approve` unless told to in that turn.
- **Verified** on a throwaway copy of lamillrentals-promo: approve, then render, then a one-word edit, after which render refused with `↷` and `✗`. The real `lamillrentals-promo` is left **draft** for the operator to approve.
- Approval tests (2); 15 total.

## v1.F — Brand profiles: LaMill presents its sites, CTA end-card (shipped 2026-10-20)

- **LaMill is the parent brand; sites are its sub-brands (operator, 2026-10-20).** A site brand names its parent (`parent: { brand: "lamill" }`). Site videos open with a silent 1.5 s card in the parent's look (LaMill logo, "Introducing", site name) and close on the site's own end-card with "Part of [LaMill logo]" under the CTA. The body stays in the site's look. On-screen copy for both lives in `brand.json` (`parent.intro`, `parent.signoff`), with defaults wordsmithed rather than taken verbatim from the request. Alternatives were end sign-off only, or a LaMill frame (caption style + watermark) on every scene.
- **`brands/<id>/brand.json` (`videomill-brand-v1`)** plus assets in the same folder; zod schema in `src/brand/schema.ts`; every asset path is checked at load. `brands/README.md` cites the site source for every value. Nothing is invented:
  - `lamillrentals`: no logo file or theme exists on the site, so the logo is the lucide 0.344.0 `Warehouse` icon in orange-500 plus the name rendered as text, exactly as `Logo.tsx` does. Colors are the default Tailwind classes the site uses. Font is system sans. CTA "Get a Quote".
  - `lamill`: `logo.svg` / `logo-dark.svg` from `lamill.io/public/brand/`; colors converted from the site's oklch tokens (approximate); Inter + JetBrains Mono (OFL) committed under `fonts/`; CTA "Start a project →".
- **Cards** are one Remotion composition, `BrandCard-<f>`, with `intro` and `end` variants, laid out inside the safe zone. Logo variant is picked from the card background's luminance. Fonts load from files via `FontFace` + `delayRender`. Clips are named `@intro` / `@end-card` so they can't collide with scene ids. `renderMedia` now sets `enforceAudioTrack`, so silent cards concat cleanly.
- **Captions** use the brand's text font.
- **Voice** precedence: project `voice` → brand `voice` → `DEFAULT_VOICE` (`af_heart`). Project `voice` lost its zod default (still optional, so additive).
- Brand folders are staged into `media/brand/<id>/` (Remotion's publicDir) by a `brand <id>` step keyed by a hash of the folder; renders depend on that hash.
- `videomill new` fails early if `--brand` doesn't exist.
- lamillrentals-promo: 21.0 s per format (1.5 s opener + 16.5 s scenes + 3 s end-card), −14.0 LUFS. Brand tests (2) added; 13 total.

## v1.E — TTS + phrase captions, SRT, 9:16 safe zone, −14 LUFS (shipped 2026-10-20)

- **Phrase → shot (additive to `videomill-project-v1`).** `hold`/`pan`/`zoom` shots gain optional `say` (one spoken phrase) and `caption` (on-screen text; default `say`). With `say`, `seconds` becomes optional (required → optional, allowed under the additive rule). Scenes whose shots carry phrases must leave scene `narration`/`caption` empty; scenes without them keep v1.B–D whole-scene narration.
- **Timing from Kokoro.** kokoro-js has no word timestamps (ADR-0004), so each phrase is synthesized separately (`tts <scene>#<n>`, cached per text + voice) and its measured length sets its shot: shot = max(`seconds`, audio + 0.25 s gap). A pan/zoom with its own shorter `seconds` moves, then holds for the rest of the phrase. `src/render/timeline.ts` `timeScene()` resolves this before `planCamera()`; 5 unit tests.
- **Rendering.** Each phrase is a Remotion `<Sequence>` with its own `<Audio>` and caption, so there's no per-scene WAV concat. Captions show only during their phrase.
- **SRT** `out/<slug>/<slug>-<f>.srt` from the same frame timings (scene offsets = clip lengths).
- **9:16 safe zone** `SAFE_ZONE` in `constants.ts`: 288 top / 192 right / 672 bottom / 48 left at 1080×1920. Verified 2026-10-20 against Google's own [YouTube vertical-video ads template](https://services.google.com/fh/files/misc/youtubesafezoneoverlay_vertical_final.png) and diagram on [Google Ads Help 13547298](https://support.google.com/google-ads/answer/13547298); the earlier reap.video / upload-post figures match. No organic-Shorts or X spec exists, so Google's zone is applied to both (assumption). Captions sit inside it, bottom edge 24 px above the zone's bottom. 16x9 has no platform overlay spec (zero insets; the 90 px bottom margin is a design choice).
- **−14 LUFS.** Two-pass ffmpeg `loudnorm` (I −14, TP −1.5, LRA 11, `linear=true`) on the concatenated track, video stream-copied; the result is re-measured and printed. lamillrentals-promo: −22.8 → −14.0 LUFS.
- **Kokoro on CPU (container):** 1.82 s of audio in 2.00 s, 2.42 s in 1.38 s, so roughly real time per phrase after model load. Voice quality is the operator's call.
- Pipeline steps added: `loudness <f>`, `captions <f>`; `assemble` now writes `out/<slug>/scenes/joined-<f>.mp4`.
- Seen for v1.H: captions on 9:16 still cover page content (e.g. the Chairs card); the `qa` caption-overlap check is v1.H.

## v1.D — Shot primitives: hold, zoom to element, cut (shipped 2026-10-20)

- `scenes[].shots[]` (additive to `videomill-project-v1`): `hold {seconds, at?}`, `pan {seconds, to}` (`to` = anchor or `"+N"` frame-heights), `zoom {seconds, target, fill=0.85}`, `cut {to}`. `to` together with `shots` is a schema error.
- **One camera path.** `planCamera()` compiles shots into keyframed view segments. Scenes without shots compile to the v1.C hold → pan → hold, so old projects render the same way. `PageCamera.tsx` replaces `SiteScroll.tsx`.
- **The recorder stores full anchor boxes** (`CaptureMeta` version 2). The record cache key gained `meta: 2`, so existing captures re-recorded automatically. Render refuses a version-1 capture with a `✗` naming the fix.
- **Zoom capped at 2.5×** because screenshots are 1:1 output pixels. Zoom interpolates in log space, and the image is resized rather than CSS-scaled for sharper resampling.
- Unit tests (6) for `planCamera` via Node's test runner + tsx: no new dependency.
- lamillrentals-promo now uses all four primitives: hold → pan (hero), zoom to the Chairs card (categories), zoom to Folding Chair → cut to Chiavari (featured). All five selector anchors resolved in both formats.
- **Finding:** on 9x16, zoom with `fill` 0.85 is a recentre, not a zoom, for elements already about 94% of frame width (mobile cards). Recorded in `architecture.md § 2`; a per-shot minimum scale would be additive if wanted.
- Seen for v1.E/v1.H: the bottom caption covers card content in zoomed and cut frames (safe zone + `qa` caption-overlap check).

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
