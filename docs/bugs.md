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

(None.)

## Fixed bugs

### 2026-10-20 — 9:16 categories captions cover the Tables card; `qa` passes

- **Repro** — `videomill render lamillrentals-promo && videomill qa lamillrentals-promo`; open `out/lamillrentals-promo/lamillrentals-promo-9x16-contact.png`, row 1 frames 5–6 and row 2 frames 1–3.
- **Expected** — `qa` ✗ on a caption over site content; content framed above the caption band.
- **Actual** — "Chairs, tables, tents & lighting" and "Delivered across Monterey County" sit over the Tables card title; `qa` ✓.
- **Where** — `src/qa/captions.ts` `captionIssues()` checks `meta.anchors` only (script-named selectors: Rental Categories h2, Chairs card, hero line); the recorder (`src/record/site.ts`) doesn't record other element boxes. Scene `categories` in `projects/lamillrentals-promo/project.json`.
- **Severity** — major (the defect class v1.I set out to catch; seen by Claude on the contact sheet, not reported by the operator).
- **Notes** — root cause: `qa`'s view of the page is limited to anchors. Fix sketch: the recorder also stores boxes for visible text/card elements, and `qa` checks captions against all of them; then reframe the 9:16 categories scene (e.g. hold on the h2 + Chairs card only).
- **Fixed in** — the commit that moved this entry: "v1.I: caption strip …" (caption strip + text-run qa; operator chose option 1, 2026-10-20)

### 2026-10-20 — Renders unreadable in snap browsers (ERR_ACCESS_DENIED)

- **Repro:** `make x T=run ARGS="render lamillrentals-poc"`, then open `out/lamillrentals-poc/scene-9x16.mp4` in snap Chromium.
- **Expected:** the video plays.
- **Actual:** `ERR_ACCESS_DENIED`.
- **Where:** the container runs as root (builder `dev_container.sh`), so bind-mounted outputs are root-owned. Snap AppArmor `owner` rules then deny them.
- **Severity:** major. It blocks reviewing renders.
- **Notes:** symptom patch: `make x` runs `chown -R` back to the host UID after every command. The root fix is tracked in `architecture.md § 10` (container user = host user).

**Fixed in** — v1.B follow-up commit (`Makefile.local` `x` target).
