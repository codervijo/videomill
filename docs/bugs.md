# Bugs

Tracked bugs for this project. Workflow + open + fixed.

## Workflow

When the operator reports a bug (brief chat report: "found a bug — X command shows Y but should show Z"), Claude writes a structured entry in `## Open bugs` with these fields:

- **Date** — `YYYY-MM-DD` when reported
- **Title** — one-line summary
- **Repro** — exact commands or steps that trigger it
- **Expected** — what should happen
- **Actual** — what happens instead
- **Where** — file path / function / module if known
- **Severity** — `blocker` | `major` | `minor` | `cosmetic`
- **Notes** — root cause hypothesis, related context, fix sketch

### Bug-pickup order between phases

After a phase ships, before starting the next phase, review `## Open bugs` and pick up entries in this order:

1. Blockers first (anything that would prevent shipping the next phase or that's actively breaking operator workflow).
2. Bugs whose fix overlaps with the just-shipped phase or the next phase (cheap to bundle).
3. Everything else by date (oldest first).

Don't let bug debt accumulate across many phases. The plateau between tiers is the natural bug-fix window.

### Moving to fixed

When a bug is fixed, move its entry from `## Open bugs` to `## Fixed bugs` and append a line:

```
**Fixed in** — <commit SHA> (<phase or one-line description>)
```

Same commit moves the entry + fixes the bug — atomic. Don't delete fixed entries; they're the project's known-issue archive.

## Open bugs

(Add entries here.)

## Fixed bugs

### 2026-10-20 — Renders unreadable in snap browsers (ERR_ACCESS_DENIED)

- **Repro:** `make x T=run ARGS="render lamillrentals-poc"`, then open `out/lamillrentals-poc/scene-9x16.mp4` in snap Chromium.
- **Expected:** the video plays.
- **Actual:** `ERR_ACCESS_DENIED`.
- **Where:** the container runs as root (builder `dev_container.sh`), so bind-mounted outputs are root-owned. Snap AppArmor `owner` rules then deny them.
- **Severity:** major. It blocks reviewing renders.
- **Notes:** symptom patch: `make x` runs `chown -R` back to the host UID after every command. The root fix is tracked in `architecture.md § 10` (container user = host user).

**Fixed in** — v1.B follow-up commit (`Makefile.local` `x` target).
