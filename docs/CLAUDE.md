# CLAUDE.md — videomill

Per-project orientation for Claude. Read this first when picking up work
on this repo. Index of decisions, conventions, and deliberate non-features
that aren't obvious from the code or git history.

## Project

VideoMill is an internal LaMill CLI that turns real browser footage and portfolio page content into faceless 16:9 + 9:16 social videos. It records (Playwright), composes and renders (Remotion), narrates (TTS) and exports a `manifest.json` folder that RankMill consumes. Two video types share one engine: site promo and lamill.io build-in-public.

`docs/prd.md` is the canonical spec; `docs/Prompts.md` is the prompt log; `docs/CLAUDE.md` is this file.

## Canonical doc surfaces

Five docs that together describe the project. All must match reality and code — drift is a conformance failure, not a backlog item.

- `docs/prd.md` — WHY / WHAT / WHEN (purpose, non-goals, goals, target user, versions/phases, conformance rules, open questions)
- `docs/architecture.md` — HOW (project layout, mechanisms, schemas, modules, integrations, stack baselines, active plans, risks, tracked refactors)
- `docs/shipping-history.md` — archived design rationale for shipped phases (append-only, newest at top)
- `docs/decisions/` (ADRs) — load-bearing architectural decisions (Nygard format; see `decisions/README.md`)
- `docs/CLAUDE.md` — this file; Claude-specific decisions, locked target shapes, deferred decisions

Plus `AI_AGENTS.md` (at repo root) — agent orientation + canonical `vN.X` versioning rule.

## When to update which doc

| If you're changing… | …update this doc | …in the same commit |
|---|---|---|
| A mechanism, schema, or module | `docs/architecture.md` | yes |
| Phase status (planned → in-progress → shipped) | `docs/prd.md` phase row | yes |
| A phase has just shipped | move its design notes from `prd.md` to `docs/shipping-history.md` | yes |
| Goals, target user, conformance rule, open question | `docs/prd.md` | yes |
| **A load-bearing architectural decision** (new or reversed) | **write a new ADR in `docs/decisions/`** | **yes** |
| A Claude-specific convention or locked target shape | `docs/CLAUDE.md` (this file) | yes |
| Agent-orientation summary or versioning rule | `AI_AGENTS.md` | yes |

**Stale docs are a conformance failure, not a backlog item.** Never let docs drift "to be updated later" — fix in the same commit as the code change that made them stale.

## ADR workflow

`docs/decisions/` holds **Architecture Decision Records** (ADRs) for load-bearing architectural decisions. See `docs/decisions/README.md` for the full spec.

**Write an ADR when** future re-evaluation would hinge on knowing *why* this was chosen. Heuristic: "would someone six months from now ask 'why is it this way?' and need the rationale beyond what the code shows?"

- ✅ ADR-worthy: language/runtime, write-surface constraints, data-shape choices, model-family choices, lockfile policy, build conventions, doc-structure choices.
- ❌ Not ADR-worthy: small implementation details (parser library, default flag values, log format). Those belong in `shipping-history.md` or code comments.

**Forward commitment.** When a new phase introduces a load-bearing decision, the ADR is part of the shipping unit — written alongside the code and doc updates, not deferred.

**Naming.** `NNNN-kebab-case-title.md`, four-digit zero-padded, sequentially numbered. Never re-number — the ID is the stable reference.

**Supersession.** Don't edit accepted ADRs. To reverse:
1. Write a new ADR with the next number; frontmatter says `Supersedes: ADR-NNNN`.
2. Update the old ADR's frontmatter: `Status: Superseded by ADR-MMMM`.
3. Update `docs/decisions/README.md` index for both rows.
4. Old ADR body stays intact — historical record.

**Status values:** `Proposed` | `Accepted` | `Deprecated` | `Superseded by ADR-NNNN`.

## Heading hygiene

**Before adding any section, subsection, or heading to a Markdown file, output the file's current heading outline first:**

```bash
grep -nE '^#+ ' path/to/file.md
```

Then confirm in the chat that the planned new heading's:

1. **Depth** (`#`, `##`, `###`, …) is the intended depth, not accidentally one level too shallow.
2. **Label** doesn't collide with existing headings — no duplicate `## 1. <title>`, no `### N.X` subsection labels that look like `vN.X` phase identifiers.

Only after that confirmation, write.

Applies especially to long-lived docs: `docs/prd.md`, `AI_AGENTS.md`, `docs/architecture.md`, `docs/CLAUDE.md`.

## Code-shape conventions

Universal rules baked in on day 1. Edit / delete inapplicable ones for this project; add project-specific ones below.

### CLI / module split threshold

Watch `wc -l` on any single file that aggregates command surface or top-level orchestration. When it crosses ~1,500 lines, propose a split into scope-first modules. Splitting at 2k lines is an afternoon; splitting at 8k is multi-hour work. Don't let monolithic files accrue.

### Canonical enums / constants

Any concept that touches more than one module gets its own constants module immediately. First time you reach for the same string value in two modules, extract to a shared constants module. Three spellings of the same concept across modules is a real bug-fix cost. (Likely early candidates here: format names `16x9` / `9x16`, video types, channel names.)

### Lazy-import error wrap

Any module that does `from optional_dep import X` inside a function must wrap it in `try / except ImportError` and raise a typed error naming the fix command:

```python
def _do_thing():
    try:
        from some_optional_pkg import Client
    except ImportError as e:
        raise MyTypedError(
            f"some_optional_pkg not installed ({e}). "
            f"Run `uv sync` to install."
        ) from e
```

Raw `ModuleNotFoundError` stack traces reach operators who have no idea what to do. (Same idea applies to dynamic `import()` in TypeScript if that stack is chosen.)

### httpx-direct over framework SDKs

When wiring a new external API (e.g. a TTS provider), default to a hand-written HTTP client with a mock transport for tests. Reach for an SDK only if the API has complex ceremony and the SDK genuinely reduces code. SDK-based modules are noticeably harder to test and slower to run.

### Pipeline idempotency markers

Each step of the record → script → storyboard → render → QA → export pipeline must:
- Probe existing state before doing work.
- Print one of `✓ exists, skipping` / `✓ created` / `↷ warn-skipped: <reason>` / `✗ <error>`.
- Be safe to re-run with the same input and arrive at the same state.

Re-running after a partial failure is then risk-free, and the operator can scan the log to see which steps actually did work vs. were already-done. Scene-level re-render (P0) depends on this.

### Soft-fail on non-load-bearing failures

Auxiliary steps (contact sheet, optional QA checks) shouldn't abort the main flow. Capture status in a result field; surface to operator below the main success line. For each pipeline step, ask: "if this fails, is the video still usable?" If yes, wrap, log, continue. If no, let it abort.

### Diagnose root cause before fixing symptom

A symptom-treating patch is a tracked-refactor candidate. Before fixing a bug, ask: "is this a symptom of a larger pattern?" If yes, ship the patch AND log the tracked refactor in `docs/architecture.md § Tracked refactors`.

### Tracked-refactors maintained as you go

When you write `// TODO: fold this into X later`, that's a tracked refactor — log it in `docs/architecture.md § Tracked refactors` immediately. Don't wait for an audit pass.

## Locked target shapes

Designs aligned but not yet executed. When picked up, no need to re-debate. (Add entries here as they accumulate.)

## Deferred decisions

Things deliberately *not* shipped — don't re-propose without new context. (Add entries here as they accumulate.)

## Project-specific conventions

- **Strict `vN.X` versioning.** Two levels only; `vN.A` = planning/decisions lock, build from `.B`; renumber instead of sub-levels; no `0.1.0` / `Sprint` / `Phase 1.A` / `(draft)` qualifiers. Applies to PRD tables, `Prompts.md`, and commit subjects. Before writing any version string, check the phase table you're writing into. Full rule: `AI_AGENTS.md § Versioning convention` (canonical source: `~/work/projects/sites/portfolio/AI_AGENTS.md § Versioning`).
- **Container-first.** Playwright, Remotion, ffmpeg, TTS and any AI workloads run inside Docker. Never install them on the host; the project must work on another machine with only Docker + make.
- **Reuse operator tooling.** Makefile includes `~/work/projects/builder/Makefile` (overrides in `Makefile.local`); container recipes start from `~/work/projects/b2b/` where one fits. A missing stack (e.g. Remotion) is proposed as an addition to builder, not baked in here.
- **Scope boundary with RankMill.** VideoMill never posts or reads analytics. Its only output contract is the export folder + `manifest.json`.
- **No fabrication.** Real footage, screenshots and SVGs only; factual claims in scripts are operator-approved.
- **Brand spelling.** LaMill, never Lamill.
