# AI Agent Context — videomill

## What this project is
VideoMill is an internal LaMill CLI that turns real product footage and lamill.io portfolio page content into short, faceless, branded social videos (site promos + lamill.io build-in-public). It makes videos only; RankMill (separate CLI) posts, tests and ranks them via an output folder + `manifest.json` contract.

## Stack
All TypeScript on Node 22 + pnpm (ADR-0002): Remotion 4.x (composition + render), Playwright (recording), Kokoro-82M via `kokoro-js` behind a `TtsProvider` interface (ADR-0004), ffmpeg. Everything runs in Docker via the builder `video` stack (ADR-0003). No Python in this repo.

## Project structure
- `docs/` — canonical doc surfaces (PRD, architecture, ADRs, bugs, shipping history, prompt log)
- `docs/decisions/` — ADRs

## Roadmap status

| | Status | Theme |
|---|---|---|
| v1.A | ✅ | Kickoff / decisions lock — stack, container layout, project-file + manifest schema |
| v1.B | ⏳ | Container + POC on lamillrentals.com — 10 s scene, both formats, contact sheet |
| v1.C | ⏳ | Project file — scenes as data, single-scene re-render |
| v1.D | ⏳ | TTS interface + Kokoro + captions + SRT |
| v1.E | ⏳ | Brand profiles — LaMill + lamillrentals.com |
| v1.F | ⏳ | Script/storyboard approval gate |
| v1.G | ⏳ | lamillrentals.com end to end + manifest export |
| v1.H | ⏳ | Benchmark: extension popup + Fiverr repro |
| v1.I | ⏳ | First build-in-public video |

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

Targets land in v1.B (builder `video` stack): `make buildsh` (enter the `videomill` dev container), then `make deps` / `make build` / `make run` / `make test` inside it.

## Distribution / deployment info

- **Type**: CLI tool
- **Target**: local install, runs in Docker on Linux
- **Live URL / install command**: not yet
- **Last released version / deployed commit**: unknown
- **Release / deploy trigger**: n/a
- **Notes**: No API keys in v1 — TTS is local Kokoro. First run downloads model weights into `.cache/`.

## How to run
Not yet runnable.

## Key conventions
- Never fabricate interfaces or claims: real footage, screenshots and SVGs only.
- Scenes are data in a git-tracked project folder; one scene re-renders alone.
- Brand spelled **LaMill**, never Lamill.
- VideoMill never posts; output folder + `manifest.json` is the RankMill contract.
- Heavy tooling (Playwright, Remotion, ffmpeg, TTS, AI workloads) runs in containers.

## Out of scope / don't touch
- <leave blank for user to fill>
