---
ID: ADR-0005
Title: export-folder-manifest-contract
Status: Accepted
Date: 2026-10-20
Supersedes: —
---

## Context

VideoMill makes videos; RankMill (a separate Python CLI under `sites/rankmill`) posts, tests and ranks them. The brief fixes the boundary: RankMill reads an output folder with `manifest.json` and never calls VideoMill internals. RankMill does not yet consume anything from VideoMill. RankMill's own artifacts already use versioned manifest schema strings (`rankmill-crawl-v1`) and atomic temp-dir → rename writes (its ADR-0013).

## Decision

- Each export is an **immutable folder**: `exports/<project-slug>/<UTC-timestamp>/`, written to a temp dir and atomically renamed into place; a `latest` symlink per project is repointed after the rename.
- The folder holds the per-format MP4s, the SRT, and `manifest.json` with `"schema": "videomill-export-v1"`. Field set: see `docs/architecture.md § 3 Data shapes` (that section is the field-level reference; this ADR fixes the contract and its versioning).
- **Additive-only within v1.** New optional fields may be added without a schema bump; renaming/removing/retyping a field, or making an optional field required, bumps to `videomill-export-v2`.
- Paths inside the manifest are **relative to the export folder**, so the folder can be moved or copied to another machine intact.
- A manifest with `"complete": false` (or missing) must be treated by consumers as an incomplete export.

## Consequences

**Good:**
- Clean process boundary: either side can change language, internals or host without coordination beyond the schema string.
- Mirrors RankMill's existing artifact conventions, so its consumer code will feel native.

**Bad:**
- Export folders accumulate (large MP4s). Retention/pruning is deferred until operator-felt; exports are gitignored.

## Alternatives considered

- **RankMill calls a VideoMill CLI/API directly.** Rejected by the brief — couples the two tools.
- **Unversioned manifest.** Rejected: silent breakage the first time a field changes.
