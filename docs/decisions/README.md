# Architecture Decision Records

Load-bearing architectural decisions for this project, in Nygard format.

## Format

Each ADR is a separate file: `NNNN-kebab-case-title.md`, four-digit zero-padded, sequentially numbered. Never re-number — the ID is the stable reference.

### Frontmatter

```yaml
---
ID: ADR-NNNN
Title: <kebab-case title matching filename>
Status: Proposed | Accepted | Deprecated | Superseded by ADR-MMMM
Date: YYYY-MM-DD
Supersedes: <ADR-NNNN or "—">
---
```

### Body sections

- **Context** — what's the situation forcing this decision? What constraints, prior choices, and pressures shape it?
- **Decision** — the choice made. State it plainly.
- **Consequences** — what follows from this decision, good and bad. What becomes easier? What becomes harder?
- **Alternatives considered** — what else was on the table and why it lost.

## When to write an ADR

Write one when future re-evaluation would hinge on knowing *why* this was chosen. Heuristic: "would someone six months from now ask 'why is it this way?' and need the rationale beyond what the code shows?"

- ✅ ADR-worthy: language/runtime, write-surface constraints, data-shape choices, model-family choices, lockfile policy, build conventions, doc-structure choices.
- ❌ Not ADR-worthy: small implementation details (parser library, default flag values, log format). Those belong in `shipping-history.md` or code comments.

## Supersession

Don't edit accepted ADRs. To reverse a decision:

1. Write a new ADR with the next available number capturing the new decision. Frontmatter says `Supersedes: ADR-NNNN`.
2. Update the old ADR's frontmatter: `Status: Superseded by ADR-MMMM`.
3. Update this index for both rows.
4. Old ADR body stays intact — historical record.

## Index

| ID | Title | Status | Date |
|---|---|---|---|
| ADR-0001 | Record architecture decisions | Accepted | 2026-10-20 |
