---
ID: ADR-0006
Title: project-schema-v2
Status: Accepted
Date: 2026-11-04
Supersedes: —
---

## Context

v2 (UGC look) needs three project-level changes that `videomill-project-v1` can't take additively: the `type` values are renamed (`site-promo` → `promo`, `build-in-public` → `bip`) and gain `ugc`; projects name their target `audience`; and a project carries three alternative openings ("hooks") over one body. Renaming enum values is a breaking change under the v1 rule (docs/CLAUDE.md § Locked target shapes). Four projects exist, all in this repo.

## Decision

- Bump to **`videomill-project-v2`**. It lands in v2.B, the first v2 build phase; later v2 phases add to it additively.
- **`type`**: `promo | ugc | bip`. The type selects defaults (opening, footage, captions, voice, formats), applied by `new` into the written `project.json`; `new` flags override them, and the file stays the single source of truth after that.
- **`audience`**: optional string, the target audience in plain words. Not "segment", which already means camera and TTS segments in the code.
- **`template`**: optional template name (`tool-list`, `build-walkthrough`, `kinetic-launch`, `pov-pain`, `metric-story`; research in `docs/research/ugc-formats-2026-11-04.md`). `new --type <t> --template <name>` writes that template's defaults and scene skeleton; each type has a default template. Recorded for provenance; render reads the written fields, not the template.
- **`hooks`**: optional `{ a, b, c }`, each a list of opening scenes (same scene kinds as `scenes`); `scenes` is the shared body. All hooks are part of the approval hash. `render --hook <a|b|c>` renders one; default renders all. Each hook's CTA URL carries `utm_content=hook-<id>`.
- **Migration:** the four existing `project.json` files are rewritten to v2 in the same commit that lands the schema; the loader reads v2 only. `type` isn't in the approval hash, so approvals survive.

## Consequences

**Good:** one schema string marks the break; no dual-version reader to maintain; hooks reuse every existing scene kind.

**Bad:** a project-v1 file from outside this repo no longer loads (none exist). Three hooks triple the opening's render and review work.

## Alternatives considered

- **Keep v1, map old type names.** Rejected: the mapping lives forever for four files.
- **Hooks as first-line text only.** Rejected by the operator: hooks couldn't differ visually.
