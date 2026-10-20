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

### v1 — first milestone: lamillrentals.com end to end + Fiverr benchmark + first build-in-public video

Order (operator, 2026-10-20): prove the pipeline end to end on **lamillrentals.com** first, then the Chrome-extension video as the **benchmark test** against the Fiverr reference. Later tiers (not scoped yet): the rest of P1 QA automation (beyond v1.H's `qa`), P1 build-in-public templates, second-site onboarding, TikTok channel (v2 or later), P2 items. v1 channels are YouTube and X only — highest priority.

#### Phases

| Phase | Status | Title |
|---|---|---|
| v1.A | ✅ done 2026-10-20 | Kickoff / decisions lock — stack, container layout, project-file + manifest schema (ADR-0002–0005) |
| v1.B | ✅ done 2026-10-20 | Container + POC on lamillrentals.com — builder `video` stack; record the live site; 10 s scene; 16:9 + 9:16; contact sheet |
| v1.C | ✅ done 2026-10-20 | Project file — scenes as data (`videomill-project-v1`), single-scene re-render |
| v1.D | ✅ done 2026-10-20 | Shot primitives — explicit hold with duration, zoom to element, cut within a scene; recorder stores full anchor boxes |
| v1.E | ✅ done 2026-10-20 | TTS + captions — phrase-level captions timed from Kokoro (each phrase maps to a shot), SRT, 9:16 safe zone, −14 LUFS |
| v1.F | ✅ done 2026-10-20 | Brand profiles — LaMill presents its sites (opener + sign-off), lamillrentals.com, CTA end-card per brand |
| v1.G | ✅ done 2026-10-20 | Script/storyboard draft + approval gate |
| v1.H | ⏳ planned | lamillrentals.com end to end — `qa` command (caption overlap, loudness, contact sheet) gates `manifest.json` export (`videomill-export-v1`) |
| v1.I | ⏳ planned | Benchmark: record a Chrome extension popup + reproduce the Fiverr video in 16:9 + 9:16 |
| v1.J | ⏳ planned | First lamill.io build-in-public video |

#### Design notes

- **v1.H** — first complete video: every pipeline step runs on one real project and produces an export RankMill could consume. This is the end-to-end proof. `videomill qa <slug>` checks caption overlap (captions inside the safe zone and not over key content), integrated loudness (−14 LUFS within tolerance), and that a contact sheet was produced. `export` refuses unless `qa` passes. Pulled forward from the brief's P1 "Automated QA" row; the remaining P1 QA checks (text clipping, brand spelling, resolution/duration) stay in a later tier.
- **v1.I** — the riskiest piece (extension popup recording) moves here, after the pipeline is proven. Needs the Fiverr reference video and the extension it shows (see § 7). Quality bar = the Fiverr video.

## 6. Conformance rules

- Brand spelled **LaMill**, never Lamill, in every rendered frame, caption, SRT and manifest field.
- No fabricated UI or claims: every visual is real footage, a real screenshot or an SVG.
- Every render exports a folder with `manifest.json`; VideoMill never posts.
- Heavy tooling runs in Docker; host needs only Docker + make.

## 7. Open questions

- **2026-10-20 — Fiverr reference video + its extension.** Needed for v1.I (benchmark). Where do they live? Video is a large binary — keep outside git (e.g. `.cache/reference/`) or a known host path?

Resolved in v1.A (2026-10-20): CLI language → all TypeScript (ADR-0002); container recipe → new builder `video` stack (ADR-0003); TTS → Kokoro behind a provider interface (ADR-0004); export contract → `videomill-export-v1` (ADR-0005); v1 channels → YouTube + X only, TikTok deferred to v2 or later.

## 8. References

- VideoMill — Project Brief: https://claude.ai/artifact/BertafZRwwzsbJUFY8eMYo
- lamill (`~/work/projects/sites/portfolio/`) — doc model, versioning, pipeline conventions
- Central builder: `~/work/projects/builder/`
- Container library: `~/work/projects/b2b/`

## Spec discipline

All five canonical doc surfaces (this file + `architecture.md` + `shipping-history.md` + ADRs + `CLAUDE.md`) must match reality and code. Drift is a conformance failure that gets fixed in the same commit as the code change that made it stale — not a backlog item.
