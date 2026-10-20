---
ID: ADR-0002
Title: all-typescript-node-pnpm
Status: Accepted
Date: 2026-10-20
Supersedes: —
---

## Context

VideoMill composes and renders with Remotion (React/TypeScript, Node runtime) and records with Playwright (TypeScript-first). The project brief named TypeScript orchestration. The operator's other CLIs — lamill (`sites/portfolio`) and RankMill — are Python/uv, so a Python CLI driving Remotion as a subprocess was the alternative.

## Decision

VideoMill is **all TypeScript on Node**: CLI, orchestration, recording, compositions and the TTS adapter. Package manager is **pnpm** (one `pnpm-lock.yaml`), matching builder's Node stacks and the `sites/*` pnpm-only policy. Node major follows Remotion's Docker baseline (Node 22 at time of writing). Everything runs inside the container (ADR-0003); nothing Node-related is installed on the host.

## Consequences

**Good:**
- One language, one lockfile, one toolchain, one image.
- Scene data (project file) is consumed directly by Remotion compositions — no Python↔TS bridge or schema duplication.
- Playwright, Remotion and kokoro-js (ADR-0004) are all native npm packages.

**Bad:**
- Diverges from lamill/RankMill. Python-specific conventions (uv, httpx, `ImportError` wrapping) don't apply literally; `docs/CLAUDE.md` restates them in TS terms.
- The global "use uv for all Python" rule is moot here; there is no Python in this repo.

## Alternatives considered

- **Python/uv CLI + TS compositions.** Matches sibling tools and their conventions, but needs two languages, two lockfiles and a serialized scene-data bridge between them. Rejected: the bridge is pure overhead when the renderer is TS anyway.
