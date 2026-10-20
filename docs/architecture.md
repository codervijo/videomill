# Architecture — videomill

How this project is built. Mechanisms, schemas, modules, and integrations. The "HOW" companion to `docs/prd.md`'s "WHY / WHAT".

## 1. Project layout

(Top-level directory structure with one-line purpose per directory. Update when adding or moving major directories.)

## 2. Core mechanisms

(The main flows / pipelines / control paths this project implements. Walk through each end-to-end.)

## 3. Data shapes / schemas

(Persistent shapes: config files, output formats, on-disk caches, database tables. Include field meanings + invariants.)

## 4. Modules

(One subsection per significant module. Purpose, public surface, key collaborators.)

## 5. CLI / UX surface

(If this project exposes a CLI: the projected command tree, flag conventions, output format conventions. Otherwise: API surface, UI flows, etc.)

## 6. Integrations / external APIs

(External services this project talks to. Auth model, scopes, rate limits, failure modes.)

## 7. Stack baselines

(Required language / runtime versions, framework version floors, lockfile policy, build toolchain. Conformance failures if violated.)

## 8. Active implementation plans

(Phase-by-phase plan for currently in-progress work. Move shipped phases to `shipping-history.md`.)

## 9. Risks

(Known fragilities, dependency assumptions, scaling cliffs. Things future-you would want to know before changing related code.)

## 10. Tracked refactors

Work known to be queued at the architectural level. Each entry: **trigger** (what would make this worth doing now), **risk** (what could go wrong), **cost** (rough effort).

(Add entries here as `// TODO`s accumulate. Don't wait for an audit pass — log them as you write them.)
