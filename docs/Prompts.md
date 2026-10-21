# Prompt History

<!-- Append new prompts at the bottom, newest last. Format:
## YYYY-MM-DD
> <prompt text>
-->

## 2026-10-20
> Read https://claude.ai/artifact/BertafZRwwzsbJUFY8eMYo (VideoMill project brief)

> things to remember - use docker container in AI workloads, and for playwright and maybe even for video /remotion etc - i dont want to install a bunch of new libraries and commands on the host. keep it in a container, so it would work in another computter

> use builder Makefiles and also b2b whereever appropriate (my local dirs/repos)

> use custom skills to do project init

> /feature-table

> start v1.A — operator picked: all TypeScript; new builder `video` stack; TTS "use kokoro"; v1 phases v1.A–v1.H as proposed.

> commit v1.A, you can push tiktok to v2 or v3 - x and youtube are the highest prio for v1

> use lamillrentals.com for the first render to prove the pipeline end to end, then do the extension video as the benchmark test.

> commit and start v1.B

> fidn latest screenshot - still installing mp4 on my ubuntu
> (snap Chromium: ERR_ACCESS_DENIED on scene-9x16.mp4)
> commit this and start v1.C

> Before v1.D: confirm whether project.json scenes support camera moves (hold, zoom to element, cut). Fold into the plan: v1.D adds phrase-level captions timed from Kokoro, a 9:16 safe zone, and −14 LUFS normalization; v1.E adds a CTA end-card template per brand; v1.G adds a qa command (caption overlap, loudness, contact sheet) that gates export. Add shot primitives as v1.D2 if missing.

> commit v1.C and the plan, then start v1.D

> Accept renumbering and per-phrase Kokoro timing. Order: v1.D = shot primitives (explicit hold with duration, zoom-to-element, cut within scene; recorder stores full anchor bounding boxes). v1.E = TTS + phrase captions + safe zone + −14 LUFS, where each phrase maps to a shot. Shift the rest down. Then commit and start v1.D.

> commit v1.D and start v1.E

> commit v1.E and start v1.F
> (v1.F) Q: what does "LaMill brand shared" mean? → "Site + LaMill sign-off".
> Main brand is LaMill - lamillrentals is a subset of it, so LaMill should "present" lamillrentals.com -one of its sub-sites
> (v1.F) Q: where does LaMill show up? → "Intro + end sign-off".
> Dont use my words exactly -wordsmith it

> commit v1.F and start v1.G

> commit v1.G and start v1.H

> approve lamillrentals-promo and run render, qa, export

> commit v1.H and start v1.I

> Before v1.I: v1.H shipped with known defects. Renumber per the versioning rule and add a fix phase now: no logo intro by default; ≤1s silence between phrases; ~2s end card; "No minimum order" zooms to the hero text; 9:16 captions in a bottom safe zone; fix qa caption-overlap to test caption boxes against visible anchor bounding boxes, with a regression test that fails on export 20261020T233815Z. Duration targets 15–30s (9:16) and 15–45s (16:9). Re-render, re-qa, commit.
> Then v1.I answers: (1) Fiverr video at <host path> → mount to .cache/reference/. (2) Extension unpacked at <path or repo>. (3) Reproduce same extension and same script beats as the Fiverr video.

> still waiting on fiverr video. we could pause now

> commit the prompt log

> start the fix phase — captions at bottom of safe zone

> option 1 — add the call line, then export and commit
