# PRD — videomill

The canonical source of truth for purpose, scope, phases, and conformance. Code that contradicts this doc is drift, not feature.

Source: "VideoMill — Project Brief" (Claude Doc, rev 18, 2026-10-20).

## 1. Purpose

An internal tool, built with Claude Code, that turns existing pages from lamill.io portfolio sites into short branded social videos. Its job is to give every site a cheap, repeatable distribution channel without on-camera work, in keeping with the faceless brand style. The portfolio already has the content (guides, calculators, events, product pages); what it lacks is a way to repackage it for Shorts, Reels, TikTok and X at minutes per video rather than hours.

Two video types, one engine:

| Type | Source | Destination | Example |
|---|---|---|---|
| Site promo | A page on a portfolio site | That site's social accounts | "3 signs your home air is bad" for airsucks |
| Build in public | lamill.io progress: launches, metrics, PRDs, commits | lamill.io YouTube and X | "Site #12 hit 1K impressions in 30 days" |

**Scope boundary:** VideoMill makes content; RankMill handles posting, testing, validation and ranking. Both are CLI-first. The contract between them is an output folder with `manifest.json` listing per-format MP4s, SRT, title, description, hashtags, target channels, source URL and UTM tags. RankMill reads that folder and never calls VideoMill internals.

## 2. Non-goals

**This section is load-bearing.** Update it whenever a tier gets dropped — capture the reason so the next similar proposal gets dropped at scoping, not after implementation.

| Item | Why |
|---|---|
| Commercial SaaS, multi-tenant design, UI for outside users | Internal tool, single operator |
| Web dashboard, cloud infrastructure | CLI-first, local-first |
| Posting or analytics | RankMill's job |
| Generative video or AI-drawn interfaces | Only real footage, screenshots and SVGs — never fabricate |
| Fully automatic URL → video | Guided workflow with approval gates |
| Editing raw footage; long-form YouTube (v1) | Shorts and X clips only in v1 |
| LinkedIn, Instagram/Facebook, 1:1 format, thumbnails | P2 |
| Installing heavy tooling on the host | Container-first; must run on another machine with Docker only |

## 3. Goals

1. **Drive traffic to portfolio sites** from social platforms, supporting the $10K MRR goal.
2. **One tool, every site:** each site plugs in a brand profile (colors, logo, fonts, voice) with no per-site code.
3. **Content in, video out:** start from a URL or markdown file and get a finished 9:16 video with voiceover and captions.
4. **Faceless by design:** screenshots, text motion, charts and TTS only. No camera, no real voice.
5. **Fast enough to use weekly:** a new video in under 10 minutes of human time.
6. **Fits the existing stack:** runs as a CLI alongside current Claude Code and lamill tooling (builder Makefiles, b2b containers).
7. **Feed the lamill.io build-in-public channels:** launch, milestone and build-update videos for the new YouTube channel and X account. These channels are the first real user.

MVP requirements (benchmark: a 41-second Fiverr Chrome-extension video, $80 for 16:9 + $40 quoted for 9:16; VideoMill should match that quality at near-zero marginal cost):

| Priority | Requirement |
|---|---|
| P0 | 25–45 s video from real browser footage (Playwright), including Chrome extension popups |
| P0 | 16:9 (1920×1080) and 9:16 (1080×1920) from one project, with per-format framing |
| P0 | Scene-level revision: re-render one scene without rebuilding the video |
| P0 | Per-site brand profile (colors, logo, fonts, voice); LaMill brand shared |
| P0 | TTS narration with burned-in captions and an SRT file, providers interchangeable |
| P0 | Script and storyboard approval before render; factual claims editable |
| P0 | Editable project file (scenes as data), committed to git |
| P1 | Automated QA: contact sheet, text clipping, brand spelling (LaMill), caption sync, resolution, duration, audio levels |
| P1 | Build-in-public templates: metric card, launch announcement, build update |
| P2 | Licensed background music, 1:1 format, thumbnails, social captions |

## 4. Target user

Sole user: the operator (Vijo), running the lamill.io portfolio. Wants a weekly cadence of short videos per site and for lamill.io build-in-public, without being on camera and without hand-editing. Success from their seat: approve a script + storyboard, get finished MP4s + manifest in under 10 minutes of their time.

## 5. Phases

Tier-grouped structure. Each tier gets a `### vN` section with two children: `#### Phases` (list) and `#### Design notes` (only while unshipped — move to `shipping-history.md` when shipped).

Strict two-level versioning only: `vN` tier, `vN.X` phase. `vN.A` is always the planning / decisions-lock phase; build starts at `.B`. Never three-level (`vN.X.Y`), never parallel schemes (`0.1.0`, `Sprint N`, `Phase 1.A`, `v1.B(draft)`). Mid-tier follow-up work → renumber the later phase letters, don't add a sub-level. Full rule: `AI_AGENTS.md § Versioning convention`.

### v1 — first milestone: Fiverr repro + first build-in-public video

Ends at the brief's first milestone. Later tiers (not scoped yet): P1 QA automation, P1 build-in-public templates, second-site onboarding, TikTok channel (v2 or later), P2 items. v1 channels are YouTube and X only — highest priority.

#### Phases

| Phase | Status | Title |
|---|---|---|
| v1.A | ✅ done 2026-10-20 | Kickoff / decisions lock — stack, container layout, project-file + manifest schema (ADR-0002–0005) |
| v1.B | ⏳ planned | Container + POC — builder `video` stack; record extension popup; 10 s scene; 16:9 + 9:16; contact sheet |
| v1.C | ⏳ planned | Project file — scenes as data (`videomill-project-v1`), single-scene re-render |
| v1.D | ⏳ planned | TTS provider interface + Kokoro adapter + burned-in captions + SRT |
| v1.E | ⏳ planned | Brand profiles — shared LaMill + one site |
| v1.F | ⏳ planned | Script/storyboard draft + approval gate |
| v1.G | ⏳ planned | Reproduce the Fiverr video in 16:9 + 9:16 |
| v1.H | ⏳ planned | `manifest.json` export (`videomill-export-v1`) + first build-in-public video |

#### Design notes

- **v1.B** — plan in `docs/architecture.md § 8`. Exit criteria: extension popup recorded reliably inside the container; one 10 s scene rendered in both formats with a caption + Kokoro line; contact sheet produced; findings written back to this doc. Builder change is its own commit in the builder repo.
- **v1.C** — locks field-level `project.json` shape (top level fixed in `architecture.md § 3`). Single-scene re-render = per-scene clips keyed by content hash, then concat.
- **v1.D** — per-segment synthesis; captions segment-timed (ADR-0004). Validate CPU speed + voice quality against the Fiverr benchmark; if Kokoro falls short, a hosted provider is a second adapter, not a rewrite.
- **v1.G** — needs the Fiverr reference video and the extension it shows (see § 7).

## 6. Conformance rules

- Brand spelled **LaMill**, never Lamill, in every rendered frame, caption, SRT and manifest field.
- No fabricated UI or claims: every visual is real footage, a real screenshot or an SVG.
- Every render exports a folder with `manifest.json`; VideoMill never posts.
- Heavy tooling runs in Docker; host needs only Docker + make.

## 7. Open questions

- **2026-10-20 — Fiverr reference video + its extension.** Needed for v1.G (and ideally v1.B's popup test). Where do they live? Video is a large binary — keep outside git (e.g. `.cache/reference/`) or a known host path?

Resolved in v1.A (2026-10-20): CLI language → all TypeScript (ADR-0002); container recipe → new builder `video` stack (ADR-0003); TTS → Kokoro behind a provider interface (ADR-0004); export contract → `videomill-export-v1` (ADR-0005); v1 channels → YouTube + X only, TikTok deferred to v2 or later.

## 8. References

- VideoMill — Project Brief: https://claude.ai/artifact/BertafZRwwzsbJUFY8eMYo
- lamill (`~/work/projects/sites/portfolio/`) — doc model, versioning, pipeline conventions
- Central builder: `~/work/projects/builder/`
- Container library: `~/work/projects/b2b/`

## Spec discipline

All five canonical doc surfaces (this file + `architecture.md` + `shipping-history.md` + ADRs + `CLAUDE.md`) must match reality and code. Drift is a conformance failure that gets fixed in the same commit as the code change that made it stale — not a backlog item.
