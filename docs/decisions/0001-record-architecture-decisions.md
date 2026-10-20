---
ID: ADR-0001
Title: Record architecture decisions
Status: Accepted
Date: 2026-10-20
Supersedes: —
---

## Context

This project will accumulate load-bearing architectural decisions over time — choices about language, runtime, data shapes, write surfaces, build conventions, doc structure, and similar. Many such decisions become invisible once embodied in code: future maintainers see the result but not the rationale. Re-evaluating later then costs time spent rediscovering why the original choice was made, or worse, re-deciding without the original constraints in view.

## Decision

We record load-bearing architectural decisions as Architecture Decision Records (ADRs) in `docs/decisions/`, using a lightly adapted Nygard format. Each ADR is a small Markdown file capturing Context, Decision, Consequences, and Alternatives. ADRs are numbered sequentially and never re-used; supersession is explicit (new ADR points back, old ADR's status updates).

## Consequences

**Good:**
- Future-us (and any other contributor) can re-trace the *why* of each architectural choice without git archaeology.
- New decisions get explicit thought: writing the rationale forces examination of alternatives.
- The decision archive is a stable reference — ADR IDs can be cited in commit messages and code comments.

**Bad:**
- Writing ADRs takes time. Threshold matters: too-low and we generate noise; too-high and we miss decisions we'll regret.
- ADRs can drift out of date if not maintained (status updates, supersession). We mitigate this by treating doc-drift as a conformance failure, not a backlog item.

## Alternatives considered

- **No ADRs (rationale only in commit messages or chat).** Git log is poor for this — searching for the rationale behind a specific choice means knowing which commit; once a file has been refactored, the original commit may not even touch the right lines anymore.
- **Inline rationale comments in code.** Useful for narrow choices but doesn't scale to project-level decisions that span many files.
- **One big DECISIONS.md.** Becomes hard to find specific decisions; supersession is awkward; merge conflicts increase.
