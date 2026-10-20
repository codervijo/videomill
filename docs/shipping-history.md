# Shipping history

Archived design rationale for shipped phases. Append-only, newest at top.

When a phase ships:
1. Move its design notes from `docs/prd.md` `#### Design notes` to a new section here.
2. The PRD's phase row stays — only the design notes migrate.

Format per entry: `## vN.X — <title>` (shipped YYYY-MM-DD) with the design rationale, key decisions, tradeoffs, and links to relevant commits / ADRs.

---

(Entries below, newest first.)

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
