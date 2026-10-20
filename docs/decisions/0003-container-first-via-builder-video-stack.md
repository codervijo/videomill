---
ID: ADR-0003
Title: container-first-via-builder-video-stack
Status: Accepted
Date: 2026-10-20
Supersedes: —
---

## Context

VideoMill needs Chromium (Playwright recording + Remotion rendering), ffmpeg, a virtual display for headed extension recording, Node + pnpm, and a TTS model. The operator does not want these installed on the host and wants the project to run unchanged on another machine. The operator's central builder (`~/work/projects/builder/`) already provides per-stack `Makefile.<stack>` + `Dockerfile.<stack>` and `make buildsh` (dev container via `dev_container.sh`); it has a `playwright` stack but no video/Remotion stack. `~/work/projects/b2b/` holds a library of Dockerfiles (incl. `ai/playwright`).

## Decision

1. **Container-first.** All recording, rendering, TTS and AI workloads run in Docker. Host requirements: Docker + make (+ the builder checkout).
2. **New builder stack `video`.** Add `Makefile.video` + `Dockerfile.video` to `~/work/projects/builder/`, derived from `Dockerfile.playwright` (Playwright base image already carries Chromium's system libs) plus ffmpeg, Xvfb, pnpm and Remotion's Chrome Headless Shell. Builder auto-detection gains a rule for Remotion projects (`package.json` containing `remotion`) ahead of the playwright/vite rules; projects may also set `STACK := video`.
3. **VideoMill's `Makefile`** is the standard builder include (`BUILDER_PATH ?= ../../builder` or env override; `include $(BUILDER_PATH)/Makefile`), with project-only targets in `Makefile.local`.
4. **Model + browser caches** (Kokoro weights, Playwright/Remotion browsers, pnpm store) live in named Docker volumes or a gitignored cache dir under the bind mount — never baked per-run, never on the host outside the project dir.

## Consequences

**Good:**
- Portable: a fresh Linux box with Docker reproduces the environment.
- Reusable: any future Remotion/video project gets the stack for free.
- One source of truth for build tooling, consistent with every other operator project.

**Bad:**
- Touches the builder repo (separate commit there). The `playwright` auto-detect rule must not shadow the new one — ordering matters.
- Image is large (Chromium ×2 variants + ffmpeg). Acceptable for a local dev container.
- builder's `dev_container.sh` defaults to a shared container name (`mb1`); VideoMill should set its own `CONTAINER_NAME` to avoid colliding with other projects.

## Alternatives considered

- **Project-local `./Dockerfile`.** Self-contained (builder's `buildsh` already prefers it) but not reusable; drifts from builder over time.
- **Extend `Dockerfile.playwright`.** Smallest change, but bloats the image for every Playwright-only project.
- **Host install.** Rejected by operator constraint.
