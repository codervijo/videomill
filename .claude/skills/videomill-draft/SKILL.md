---
name: videomill-draft
description: Draft or revise a VideoMill project's script and storyboard (project.json scenes, shots, say/caption) from a real page, then hand it to the operator for approval. Use when the operator asks to draft, script, storyboard or rework a video in this repo.
---

# Draft a VideoMill script + storyboard

The CLI makes no LLM calls. Drafting is you, in this session, editing `projects/<slug>/project.json`. The operator approves; you never do.

## Steps

1. **Project.** If `projects/<slug>/project.json` is missing: `make x T=run ARGS="new <slug> --type <site-promo|build-in-public> --brand <id> --url <page>"`. The brand must exist in `brands/`.
2. **Read the page.** Run `make x T=run ARGS="record <slug>"`, then look at `projects/<slug>/media/<capture>-9x16.png` and `-16x9.png`. Where the site's source is local (`~/work/projects/sites/<domain>`), read the copy from the source too.
3. **Write scenes.** 3–6 scenes, 25–45 s total. Each scene is `kind: "page-scroll"` on a capture, with `shots`, and empty scene `narration` and `caption`. Each spoken line is one `say` on the shot that shows it (field reference: `docs/architecture.md § 3`).
   - **Words:** only the site's own claims (prices, areas, policies, features) as they appear on the page. Never add a claim the page doesn't make. Rephrase for speech; don't invent.
   - **Captions:** short, about 40 characters or less; `caption` defaults to `say`. Brand is spelled **LaMill**.
   - **Anchors:** Playwright selectors for real elements (`h2:has-text("…")`, `.card:has(h3:has-text("…"))`). `record` fails with `✗` on a selector that doesn't resolve; fix it, don't guess offsets.
   - **Camera:** a `hold`/`pan`/`zoom` per phrase; `cut` to jump. On 9:16, zooming into full-width elements only recentres (`architecture.md § Camera and shots`).
   - **Close:** don't restate the brand end-card CTA; `brands/<id>/brand.json` adds it.
4. **Storyboard.** `make x T=run ARGS="storyboard <slug>"` → `out/<slug>/storyboard.png` (and `.html`). Read the PNG and check that each still shows what its line talks about, in both formats.
5. **Hand off.** Give the operator the script lines, the storyboard path, and any claim you weren't sure was on the page. Stop there. Approval is the operator's: `make x T=run ARGS="approve <slug>"`. Never run `approve` unless the operator explicitly tells you to in this turn.

Editing an approved project puts it back to "edited since approval"; `render` refuses until it is re-approved.
