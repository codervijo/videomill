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

Any dynamic `import()` of an optional or heavy dependency (e.g. `kokoro-js`) must catch the failure and throw a typed error naming the fix command:

```ts
async function loadKokoro() {
  try {
    return await import("kokoro-js");
  } catch (e) {
    throw new VideoMillError(
      `kokoro-js not installed (${(e as Error).message}). ` +
      "Run `make deps` inside the container (`make buildsh`)."
    );
  }
}
```

Raw `ERR_MODULE_NOT_FOUND` stack traces reach the operator with no clue what to do.

### fetch-direct over framework SDKs

When wiring a new external API (e.g. a future hosted TTS provider), default to a hand-written client over `fetch`, with the `fetch` function injectable so tests pass a fake. Reach for an SDK only if the API has complex ceremony and the SDK genuinely reduces code. SDK-based modules are noticeably harder to test and slower to run.

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

Designs aligned but not yet executed. When picked up, no need to re-debate.

### 🔒 Export contract `videomill-export-v1` (ADR-0005, locked 2026-10-20)

Field-level shape in `docs/architecture.md § 3`. Additive-only within v1: new optional fields are fine, while any rename, removal, retype or optional→required change bumps to `-v2` and gets a new ADR. Paths in the manifest are relative to the export folder. Exports are written to a temp dir and renamed into place atomically. **Self-check:** "Would RankMill code written against today's manifest still work after my change?"

### 🔒 `project.json` `videomill-project-v1` (top level locked 2026-10-20 in v1.A; fields locked in v1.C)

Full field reference in `docs/architecture.md § 3`; the zod schema in `src/project/schema.ts` is the enforcement. Same additive-only rule as the export contract: a new optional field is fine, while a rename, removal or new required field bumps to `-v2`. Anchors are Playwright selectors resolved at record time, never hand-entered pixel offsets. Any edit to `scenes` after approval drops `approval.status` back to `draft` (via the stored hash). Render never runs on an unapproved project.

## Deferred decisions

Things deliberately *not* shipped — don't re-propose without new context. (Add entries here as they accumulate.)

## Project-specific conventions

- **Strict `vN.X` versioning.** Two levels only; `vN.A` = planning/decisions lock, build from `.B`; renumber instead of sub-levels; no `0.1.0` / `Sprint` / `Phase 1.A` / `(draft)` qualifiers. Applies to PRD tables, `Prompts.md`, and commit subjects. Before writing any version string, check the phase table you're writing into. Full rule: `AI_AGENTS.md § Versioning convention` (canonical source: `~/work/projects/sites/portfolio/AI_AGENTS.md § Versioning`).
- **Container-first.** Playwright, Remotion, ffmpeg, TTS and any AI workloads run inside Docker. Never install them on the host; the project must work on another machine with only Docker + make.
- **Reuse operator tooling.** Makefile includes `~/work/projects/builder/Makefile` (overrides in `Makefile.local`); container recipes start from `~/work/projects/b2b/` where one fits. A missing stack (e.g. Remotion) is proposed as an addition to builder, not baked in here.
- **Scope boundary with RankMill.** VideoMill never posts or reads analytics. Its only output contract is the export folder + `manifest.json`.
- **No fabrication.** Real footage, screenshots and SVGs only; factual claims in scripts are operator-approved.
- **Brand spelling.** LaMill, never Lamill.
