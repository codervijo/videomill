# AI Agent Context — videomill

## What this project is
VideoMill is an internal LaMill CLI that turns real product footage and lamill.io portfolio page content into short, faceless, branded social videos (site promos + lamill.io build-in-public). It makes videos only; RankMill (separate CLI) posts, tests and ranks them via an output folder + `manifest.json` contract.

## Stack
All TypeScript on Node 22 + pnpm (ADR-0002): Remotion 4.x (composition + render), Playwright (recording), Kokoro-82M via `kokoro-js` behind a `TtsProvider` interface (ADR-0004), ffmpeg. Everything runs in Docker via the builder `video` stack (ADR-0003). No Python in this repo.

## Project structure
- `src/` — TypeScript: `cli/`, `pipeline/` (idempotent steps), `record/` (Playwright), `tts/` (provider + Kokoro), `remotion/` (compositions), `render/` (render + contact sheet)
- `projects/<slug>/` — per-video definitions (committed); `media/` inside is gitignored
- `out/` — renders + contact sheets (gitignored)
- `docs/` — canonical doc surfaces (PRD, architecture, ADRs, bugs, shipping history, prompt log)
- `docs/decisions/` — ADRs

## Roadmap status

| | Status | Theme |
|---|---|---|
| v1.A | ✅ | Kickoff / decisions lock — stack, container layout, project-file + manifest schema |
| v1.B | ✅ | Container + POC on lamillrentals.com — 10 s scene, both formats, contact sheet |
| v1.C | ✅ | Project file — scenes as data, single-scene re-render |
| v1.D | ⏳ | Phrase-level captions + SRT + 9:16 safe zone + −14 LUFS |
| v1.E | ⏳ | Shot primitives — hold, zoom to element, cut |
| v1.F | ⏳ | Brand profiles + CTA end-card per brand |
| v1.G | ⏳ | Script/storyboard approval gate |
| v1.H | ⏳ | lamillrentals.com end to end — `qa` gates export |
| v1.I | ⏳ | Benchmark: extension popup + Fiverr repro |
| v1.J | ⏳ | First build-in-public video |

## Versioning convention

This project uses a **two-level `vN.X` convention** for tracking work.
The convention is enforced across all `sites/*` projects (see CHECK_013).

- **`vN`** — major capability tier (SemVer-MAJOR semantics).
- **`vN.X`** — phase letter within a tier (A, B, C, ...). Each phase
  is a shippable slice.
- **`vN.A` is always the planning / decisions-lock phase.** Every tier
  opens with its `.A` phase reserved for kickoff — locking the design
  decisions, scope, schema/API shape, and any ADR — *before* any
  implementation. Build work starts at `.B`. Never put build work in
  `.A`; if a tier's first instinct is code, its planning still gets its
  own `.A` row above it. (This is why shipped tiers read `vN.A —
  Kickoff / decisions lock` throughout `docs/prd.md`.)

**Two levels only. Never `vN.X.Y`.** When follow-up work emerges inside
an existing tier, push subsequent phase letters down to make room.
Renumbered rows carry a lineage marker formatted as
`*(renumbered YYYY-MM-DD; was vN.X.Y)*`, so the history is preserved
in the row that replaced them. (Lineage markers belong only on rows
inside `sites/portfolio/docs/prd.md`; this project doesn't introduce
them — renumber silently.)

This standard applies to:
- The `## 5. Phases` table in `docs/prd.md`.
- The roadmap-status table in `AI_AGENTS.md` (this file).
- Phase references in `docs/Prompts.md` and commit subjects.
- The `feature-table` skill (renders rows in this exact convention).

Don't introduce parallel schemes (no `0.1.0`, no `Sprint 3`, no
`Phase 1.A`). Don't introduce three-level identifiers under any
circumstance. The canonical statement is `sites/portfolio/AI_AGENTS.md § Versioning`.

*Copied verbatim from `~/work/projects/sites/portfolio/AI_AGENTS.md § Versioning` (2026-10-20); only the lineage-marker sentence was retargeted. That file is canonical — if they disagree, it wins.*

## Building info
Container-first: nothing beyond Docker (and `make`) is installed on the host. Build tooling comes from the central builder (`~/work/projects/builder/`) via a project `Makefile` that includes `$(BUILDER_PATH)/Makefile`, with project overrides in `Makefile.local`. Container recipes reuse `~/work/projects/b2b/` where one fits (e.g. `b2b/ai/playwright`).

Builder `video` stack (`STACK := video`; `~/work/projects/builder/{Makefile,Dockerfile}.video`).

Host (Docker + make only):
```bash
make up                                        # build image if needed, start `videomill` container, copy builder in
make x T=deps                                  # pnpm install + Playwright Chromium + Remotion headless shell
make x T=test                                  # tsc --noEmit
make x T=run ARGS="render lamillrentals-promo" # run the CLI in the container
make sh                                        # interactive shell (or: make buildsh)
make down                                      # stop the container
```
Inside the container: `make deps | build | run ARGS="…" | test`.

## Distribution / deployment info

- **Type**: CLI tool
- **Target**: local install, runs in Docker on Linux
- **Live URL / install command**: not yet
- **Last released version / deployed commit**: unknown
- **Release / deploy trigger**: n/a
- **Notes**: No API keys in v1 — TTS is local Kokoro. First run downloads model weights into `.cache/`.

## How to run
`make up && make x T=deps && make x T=run ARGS="render lamillrentals-promo"` → `out/lamillrentals-promo/lamillrentals-promo-{16x9,9x16}.mp4` + contact sheets. New video: `make x T=run ARGS="new <slug> --type site-promo --brand <id> --url <page>"`, fill in `projects/<slug>/project.json` scenes, then `render`. Edit one scene and re-run `render`: only that scene re-renders.

## Key conventions
- Never fabricate interfaces or claims: real footage, screenshots and SVGs only.
- Scenes are data in a git-tracked project folder; one scene re-renders alone.
- Brand spelled **LaMill**, never Lamill.
- VideoMill never posts; output folder + `manifest.json` is the RankMill contract.
- Heavy tooling (Playwright, Remotion, ffmpeg, TTS, AI workloads) runs in containers.

## Out of scope / don't touch
- <leave blank for user to fill>
