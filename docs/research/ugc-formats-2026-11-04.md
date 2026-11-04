# UGC-style tech/B2B short video research: reusable formats for VideoMill v2/v3

Access date for every fetch: **2026-11-04**. Research only. No repo files were edited.

## 0. Method and what "verified" means here

- **YouTube** (17 examples): each watch page was fetched with `curl`, and the page's own `ytInitialPlayerResponse` was parsed for title, channel, `viewCount`, length and publish date. Likes come from the like button's accessibility text ("along with N other people") and comments from the page. **Visual style and hooks were observed** from YouTube's storyboard sprite sheets (1 frame per second, first ~18 s) or, for two Shorts with no usable storyboard, the full-size thumbnail. Hook text in quotes is **on-screen caption text read off those frames**. Spoken audio was *not* transcribed, because YouTube's caption endpoint returned empty without a session token.
- **TikTok** (2): metrics come from spytok.com's listing (three unlabeled numbers per post, read as views / likes / comments). The TikTok page itself rendered empty to the fetcher. TikTok oEmbed confirmed that both video IDs exist. **The video content was not viewed.**
- **Instagram / LinkedIn** (1 combined entry): the post pages were fetched. Both are login-walled, but likes, reactions and comments were visible. Views were not shown.
- **Not reachable:** reddit.com (fetch tool blocked) and X (not attempted, login-walled). The Umer Arif article links no Reels, and viral.app shows no video URLs. Those sources are used for *format* evidence only and are not counted.
- **Paid vs organic:** YouTube view counts include paid views. Where the description carries `utm_medium=paid-social`, or where likes are tiny relative to views, it's flagged. The latter is an **inference**, not a verified fact.

**Count: 20 examples listed.** 17 are fully verified (URL, metrics on the fetched page, visuals observed). 3 are partly verified (URL and metrics on a fetched page, but the content was not viewed). Two further format sources had no URL and are listed separately in § 1.4.

## 1. Examples

Legend: **Hook** in quotes = on-screen text read from frames. "described" = my description of the frames. Pacing comes from the 1 fps storyboards. "Caption chunk" = how many words a burned-in caption shows at once.

### 1.1 SaaS / dev-tool / AI demos (screen-recording-led)

**1. "Browser Extensions Everybody Should Have": Sambucha** (tech creator listicle)
- URL: https://www.youtube.com/shorts/MbJqnZKZi7c
- Metrics: 7,753,822 views · 397,992 likes · 3.9K comments · 51 s · published 2024-09-07. Source: the watch page, fetched 2026-11-04.
- Hook (0–2 s): a title card with the Chrome logo plus a puzzle piece and the red/white text "Browser Extensions Everybody Should Have". It hard-cuts to a talking head at a mic.
- Beats: title card → per extension: name label ("Edit Anything", "Hive AI Detector", …) → screen recording of it working on a real site → back to the talking head explaining → next item.
- Pacing: a cut every 1–3 s, alternating talking head and screen recording. Captions are 1–3 words, white with a green highlight word, centered.
- Visual: talking head (podcast mic) plus full-bleed screen recordings with a small label top-left. No stock.

**2. "I built this using Cursor AI😱": Web Prodigies** (AI coding demo)
- URL: https://www.youtube.com/shorts/TnHFxc3biRc
- Metrics: 1,084,273 views · 40,438 likes · 694 comments · 50 s · 2025-04-18. Source: the watch page.
- Hook (described): a phone-camera shot of a monitor showing code, with a hand pointing at the screen. No text overlay is visible.
- Beats: hand-held tour of the screen. A finger points at the editor, then at the built app in the browser. The device is filmed, not screen-captured.
- Pacing: long continuous handheld takes with a slowly moving camera. No visible cuts in the first 18 s.
- Visual: "phone filming the screen" UGC texture (the operator's v2.B intent is the inverse: real capture in a phone frame). No captions visible in the sampled frames.

**3. "How I use cursor for my mobile app #buildinpublic": David** (founder workflow)
- URL: https://www.youtube.com/shorts/3FCHaIQZ2Mk
- Metrics: 71,674 views · 715 likes · 18 comments · 27 s · 2025-06-07. Source: the watch page.
- Hook: "Here's how I use Cursor while working on my mobile app"
- Beats: laptop on a desk (plants, window) → typing in Cursor ("I try to give it as much context as possible") → "It really helps the AI stay on track" → close-up of the diff ("I review the changes right away").
- Pacing: 3–4 s shots, sentence-length captions (5–10 words, white, lower third).
- Visual: over-the-shoulder phone footage of a real screen. Faceless (hands only).

**4. "Build Apps Without Code Using Lovable AI & ChatGPT": Nick Saraev Ai** (AI builder tutorial)
- URL: https://www.youtube.com/shorts/t4S3IytnVeg
- Metrics: 312,910 views · 5,126 likes · 1.3K comments · 38 s · 2025-10-21. Source: the watch page.
- Hook: a thumbnail frame, "Lovable + ChatGPT / HOW TO BUILD ENTIRE APPS WITH AI", then the finished app in a **phone frame** with the captions "build any" / "without writing" / "a single line".
- Beats: result first (the app in a phone mockup) → "For example, I wanted an app" → "AI news in bite-sized summaries" → ChatGPT screen: "describe … in detail … into a PRD" → "Then all I did [was copy] and paste" → Lovable builds it → CTA in the description: *Comment "LOVABLE" to get your Free Guide* (comment-keyword CTA; 1.3K comments).
- Pacing: a caption change every ~1 s (2–3 words, white bold with a black outline, centered). A screen change every 2–3 s.
- Visual: **fully faceless.** Voiceover plus screen recordings plus a phone frame. No talking head appears in the sampled frames. This is the closest match to VideoMill's stack.

**5. "how i use linear as a solo founder": Keegan Ryan** (dev tool, founder story)
- URL: https://www.youtube.com/shorts/2TXk9Bd6his
- Metrics: 17,189 views · 142 likes · 3 comments · 36 s · 2026-05-27. Source: the watch page.
- Hook: "I didn't think linear made sense as a solo founder" (the contrarian-confession hook), with the Linear logo popping in at 1 s.
- Beats: belief ("I thought Linear was mostly for teams with project managers and dev tickets") → turn ("until I connected it to my app") → mechanism ("using Linear's API") → demo ("So now when I go to my app and type in a customer support issue…") → the ticket appears.
- Pacing: 2–3 s, sentence captions centered low. Logo and UI screenshots pop over the talking head.
- Visual: phone-shot talking head at a desk, with product screenshots overlaid as cards.

**6. "Cursor: The AI Code Editor": Tom Shaw** (AI dev-tool explainer)
- URL: https://www.youtube.com/shorts/PfpYTCeK-B0
- Metrics: 170,114 views · 3,640 likes · 24 comments · 41 s · 2024-09-15. Source: the watch page.
- Hook: the talking head says "how good", then the text "AI Code Editor" over an editor screenshot.
- Beats: claim → "looks a lot like VS Code" → "functionalities that separate [it from] VS Code" → highlighted code region (red box) → "If you have GitHub Copilot…" comparison.
- Pacing: 1–2 s alternation of head and screen. Captions are 1–3 words, small and white.
- Visual: talking head plus screen recording with a **highlight box** drawn on the code (equivalent to VideoMill's zoom/anchor).

**7. "Granola AI: Your Secret Weapon for Meeting Notes": Snobydo** (AI tool listicle and podcast clip)
- URL: https://www.youtube.com/shorts/fTf__ZgUo2I
- Metrics: 14,561 views · 139 likes · comments not shown · 61 s · 2026-01-11. Source: the watch page.
- Hook: a **logo grid** of AI tools (ElevenLabs, HeyGen, n8n, Claude, Lovable…) with "NUMBER 14" and a "BuddyPro" card, then the Granola logo.
- Beats: series counter → clipped podcast talking head (OpusClip watermark) → B-roll of a Zoom grid → "Granola actually records on your end".
- Pacing: 1–2 s. Captions are 2–3 words, uppercase, white with a green keyword highlight.
- Visual: repurposed long-form clip plus logo grid plus product B-roll. A "numbered series" wrapper around someone else's footage.

**8. "Introducing the new Notion AI": Notion** (brand launch, faceless)
- URL: https://www.youtube.com/watch?v=S92KX8-Hmlc
- Metrics: 8,187,938 views · 1,647 likes · 80 comments · 57 s · 2024-09-25. Source: the watch page. The like/view ratio suggests paid distribution (inference).
- Hook: "Meet the new Notion AI" (kinetic type on white; "new" is italicized, then underlined).
- Beats: "One AI tool to [Ask a question]" → "[Find in Slack]" → "[Improve writing]" (the chip swaps each second) → "One AI tool to do it all." → full UI screen recordings of each capability.
- Pacing: a text change every ~1 s, then 3–5 s UI holds.
- Visual: **fully faceless.** Kinetic typography plus UI chips plus product screen recordings, on brand background. No VO visible in the frames, and the audio was not checked.

**9. "Introducing Cursor 3": Cursor** (dev-tool launch, founder-led)
- URL: https://www.youtube.com/watch?v=UxbULt_hCdA
- Metrics: 3,127,708 views · 2,311 likes · 232 comments · 90 s · 2026-04-02. Source: the watch page. Likely paid-boosted (inference from the ratio).
- Hook (described): a two-shot of the co-founders at a table with lower thirds ("Sualeh Asif, Co-Founder" / "Michael Truell, Co-Founder").
- Beats: founders explain the "why" → cut to the laptop → product screen recording.
- Pacing: 3–6 s interview shots. No burned-in captions.
- Visual: founder interview plus product B-roll. Not faceless.

### 1.2 Founder stories / build-in-public

**10. "I built a startup in 31 hours (SaaS)": Marc Lou** (indie founder)
- URL: https://www.youtube.com/shorts/JHCAMmQUgf4
- Metrics: 88,283 views · 2,582 likes · 130 comments · 20 s · 2024-04-05. Source: the watch page.
- Hook: "IF YOU'RE A SOFTWARE ENGINEER" (the white word "SOFTWARE ENGINEER" is in cyan), with a cut-in photo labelled "Real software engineer".
- Beats: call-out → "Next part [will make you] cringe" → his rules as a strike-through list ("TYPESCRIPT ✗ / GIT BRANCHES ✗ / TEST ✗ / NEW TECH ✗") → "MongoDB" logo → jail-bars overlay gag → "MOVE FAST". The description names the product (ZenVoice) and the stack.
- Pacing: a cut or overlay every ~1 s. Captions are 1–3 words, uppercase white, with a red or cyan keyword.
- Visual: talking head plus a **checklist overlay that accumulates** plus meme inserts.

**11. "Why SaaS is the best business model": Guillaume Moubeche** (founder explainer)
- URL: https://www.youtube.com/shorts/_g_bUR1uehI
- Metrics: 252,786 views · 5,095 likes · 73 comments · 38 s · 2023-10-12. Source: the watch page.
- Hook: "…FOR EVERY DOLLAR … CAN ACTUALLY [TURN] INTO $36"
- Beats: claim → whiteboard: "$1 → $36?" is drawn stroke by stroke → "subscription" → "$1 in recurring …".
- Pacing: alternating ~1 s between the speaker and the **hand-drawn whiteboard** (white panel, black marker). Captions are 1 word, yellow uppercase, centered.
- Visual: talking head plus a progressively drawn diagram. The diagram half is reproducible as an SVG stroke animation.

**12. "Cluely (Cheating Tool for Literally Everything)": Cluely** (AI product launch stunt)
- URL: https://www.youtube.com/watch?v=Rz3LD7u2KX8
- Metrics on YouTube: 193,872 views · 2,670 likes · 279 comments · 99 s · 2025-04-20. Source: the watch page. Secondary press claims of ~10–12M views on other platforms were seen only in search snippets: **not verified.**
- Hook (described): a cinematic dark restaurant date, then the "Cluely" wordmark at 2 s.
- Beats: the date goes awkwardly → a translucent UI overlay ("Analyzing…", the date's age, talking points) feeds him lines → escalating lies → reveal.
- Pacing: 1–3 s cinematic cuts.
- Visual: live-action short film plus a **UI overlay composited on top** (the product as a HUD). Rage-bait positioning.

**13. "Introducing the Cluely Marketing Team": Cluely** (company/founder intro)
- URL: https://www.youtube.com/watch?v=AOK9cX2AQl0
- Metrics: 84,131 views · 1,569 likes · 105 comments · 30 s · 2025-06-18. Source: the watch page.
- Hook: big kinetic type "CLUELY" over a moody portrait, then "MEET THE MINDS AT Cluely", then the name "ROY" in giant yellow type.
- Beats: per person: name slam → **X-profile screenshot card** ("Kicked out of Columbia", follower counts) → next person.
- Pacing: ~1 s slams.
- Visual: portraits plus kinetic type plus real social-post screenshots as cards.

### 1.3 Corporate / developer humor

**14. "Literally my boss and AI right now": ClickUpComedy** (corporate humor, brand-run channel)
- URL: https://www.youtube.com/shorts/UA2ekE_8p4k
- Metrics: 4,137,659 views · 50,343 likes · 1.3K comments · 13 s · 2026-05-13. Source: the watch page.
- Hook (described, thumbnail only): an actor with an "Employee" label sticker.
- Beats: two-hander skit (boss vs AI). The description is hashtags only.
- Pacing: 13 s total. Cut rhythm not observable (no usable storyboard).
- Visual: live-action skit with a role-label overlay. No product shown in the thumbnail.

**15. "POV: The highest paid engineer at your company gets fired 😭": Educative** (dev humor from an ed-tech brand)
- URL: https://www.youtube.com/shorts/kqLz53z8Inc
- Metrics: 26,241,037 views · 797,955 likes · 12K comments · 115 s · 2025-08-21. Source: the watch page.
- Hook: "POV: The highest paid engineer at your company gets fired 😭" (a purple pill box, top, persistent).
- Beats: manager announces the departure ("All right guys… a little company update… no longer with us… any gaps can be filled with AI") → cut to engineers' reactions ("Wait, what?") → escalation.
- Pacing: 1–3 s cuts in a real office. Captions are 1–3 words, white, centered lower-middle.
- Visual: live-action office skit plus a persistent POV title box plus word captions.

**16. "I asked Cursor to fix a 'small bug'": SCALER** (dev humor, ed-tech brand)
- URL: https://www.youtube.com/shorts/riflxxpE-Cg
- Metrics: 8,806,651 views · 173,613 likes · 619 comments · 11 s · 2025-06-24. Source: the watch page.
- Hook: "Me - Cursor, fix this small bug / Cursor -" (black text block on top, a clip below).
- Beats: setup text → a reaction/visual-gag clip (a hand "fixing" something absurdly) → loop. The description punchline reads "…and creates five new ones 💀".
- Pacing: a single 11 s gag, built to loop.
- Visual: **meme template:** top text plus one clip. The clip is not product footage.

**17. "Chasing Receipts": Ramp** (fintech corporate humor, **paid**)
- URL: https://www.youtube.com/watch?v=gU2uc_wZ7UU
- Metrics: 20,724,382 views · 152 likes · 9 comments · 30 s · 2025-06-02. Source: the watch page. The description link has `utm_medium=paid-social`, so this is a paid placement.
- Hook (described): a forklift-POV wide-angle shot of an employee running at the camera across a lot.
- Beats: finance person chasing coworkers for receipts → fisheye close-ups of annoyed staff → "Switch to Ramp and love finance again" (description).
- Pacing: 1–2 s cuts, wide-angle POV.
- Visual: high-production live action with a deliberately "lo-fi" POV camera.

### 1.4 TikTok / Instagram / LinkedIn (partly verified: content not viewed)

**18. Notion meme: @katrinaforeal** (productivity app, creator)
- URL: https://www.tiktok.com/@katrinaforeal/video/7602457731760409886 (oEmbed confirms the ID)
- Metrics: 583.2K / 42.0K / 1.4K (unlabeled; read as views / likes / comments). Source: https://spytok.com/top-posts/business-testimonials, 2026-11-04.
- Hook (caption text): "don't even get me started on canva 🫷🏼🫩🫸🏼 #notion #notionapp"
- Beats, pacing and visual: **not verified** (TikTok page rendered empty).

**19. onghost.com creator testimonial: @catherine** (B2B outreach SaaS, creator UGC)
- URL: https://www.tiktok.com/@catherine/video/7577742227842092310 (oEmbed confirms the ID)
- Metrics: 110.1K / 4.3K / 19 (unlabeled; read as views / likes / comments). Source: the spytok page above, 2026-11-04.
- Hook (caption text): "Using onghost.com for outreach makes landing brand deals 10x easier! #ugc #conte…"
- Beats, pacing and visual: **not verified.**
- ⚠ This is a **first-person testimonial format** (see § 2 conflicts).

**20. Clay × Aidan Brannigan skit** (GTM SaaS sponsored corporate skit)
- Instagram: https://www.instagram.com/reel/DZaf7wEgi5w/ (creator aidanbranniganofficial, collaborator claygtm)
  - Metrics: 113.8K likes · 719 comments · views not shown · dated "June 10" (year not shown).
  - Caption: "Maybe if I was using @claygtm like the rest of the team, we wouldn't be having this issue. #claypartner"
- LinkedIn version: https://www.linkedin.com/posts/aidanbrannigan_claypartner-ugcPost-7470528549129723904-_1aR/
  - Metrics: 1,646 reactions · 50 comments · "4mo".
  - Text: "Maybe if I was using Clay like the rest of the team, I wouldn't be behind on my numbers." The fetch reported no video element, so the media type is unconfirmed.
- Context: https://www.noboringbrands.co/case-studies/clay-case-study claims 6M+ organic views across the skits, aggregate only (no per-video split). Top IG comments were jokes about "too much creatine", which suggests a physical-comedy skit (inference).
- Both pages are login-walled, and the video was not viewed.

**Format sources without a URL (not counted)**
- **Umer Arif "UGC reaction + demo" Reels** (LinkedIn article): a ~3–4 s real-person reaction with an overlay like "Claude + LinkedIn = 🔥" → a demo of **one** feature → small black/white centered captions → CTA "Comment Claude and I'll send you the link" (ManyChat DM). The author claims a best Reel of 1M+ views / 21.6K likes / ~4K comments, but it is self-reported and unlinked, so **not verified.**
- **viral.app UGC library:** shows ItsNazsare × Hark Pro (#ad), 1.6M views, hook "Date night planned in one text!? Absolutely!". The page has no video URL.
- **Casey Hill's LinkedIn "[company] is the only company I have seen do this" series** (121 reactions / 37 comments on the post; login-walled): a recurring *format-as-series* that showcases other brands' websites, which brands then pay to boost. No video URLs.
- **RedCurate r/buildinpublic digest:** text posts only, plus one claim of an "800k+ views" video → $15k MRR. Reddit is unreachable from the fetcher, so not verified.

## 2. Top 5 formats VideoMill can reproduce programmatically

Ranked by fit with VideoMill's existing engine (real captures, camera shots, Kokoro TTS, burned captions, cards, clip scenes) and with § 2 / goal 4.

### F1. `tool-list`: "N tools/extensions you should have"
- **Drawn from:** #1 Sambucha (7.75M), #7 Snobydo, and Casey Hill's series pattern (a recurring numbered series).
- **Why repeatable and cheap:** each item is the same unit: name card → 3–6 s real capture of the tool doing *one* thing → a 1-line benefit. It's a numbered series, so one template produces weekly episodes. The footage is the tools' own UIs, which VideoMill already records (pages, extension popups).
- **Already has:** `page-scroll` with `hold/zoom/pan`, `popup` shot (extension popups), browser `frame`, `title` card, TTS, captions, end card.
- **Needs:**
  - v2.C: word-by-word captions with a keyword highlight; jump-cut pacing (≤3 s shots); 3 hook variants.
  - A numbered item card: a `title`-card variant with an index ("#3"), or `badges` reuse.
  - v2.D: `type: ugc`, template defaults.
- **PRD conflicts:** none if every item is the operator's own site or a real capture. Featuring *third-party* tools is fine as real footage; a client tool needs the v2.D permission record.
- **Drop:** Sambucha's talking head (replaced by TTS).

### F2. `build-walkthrough`: "Here's how I [built / use] X" (faceless screen walkthrough)
- **Drawn from:** #4 Nick Saraev (fully faceless, 312.9K), #3 David, #5 Keegan Ryan, #6 Tom Shaw, #10 Marc Lou.
- **Why repeatable and cheap:** it's VideoMill's core: real footage of a real workflow. The hook pattern is "result first, then how". The phone frame and the "prompt → result" sequence are mechanical, and the bip channel gets an episode every time the operator ships.
- **Already has:** captures, camera, `frame: editor|browser`, `clip` scenes (VideoMill's own past exports), local-file captures (e.g. a PRD markdown file).
- **Needs:**
  - v2.B: phone frame (Saraev opens on the result in a phone mockup).
  - v2.C: word captions, result-first `hooks.a/b/c`, casual voice preset.
  - Highlight box: Tom Shaw's red box. VideoMill's zoom covers it; a drawn box overlay would be new.
- **PRD conflicts:**
  - First-person "I built…" narration in a TTS voice is the operator's own claim in bip, so it is not a testimonial. It stays OK in v2.
  - In v3, if an **avatar** says "I built", that is the operator's story told by an avatar, not a customer testimonial. v3.C's `qa` rule ("I use…" ✗) would flag it, so v3.A should decide whether bip avatar lines may use first-person *operator* voice with disclosure.

### F3. `kinetic-launch`: "Meet the new X / One tool to [chip]"
- **Drawn from:** #8 Notion AI (8.19M, faceless), #13 Cluely team (name slams plus real X-post cards), #12 Cluely (UI overlay over footage).
- **Why repeatable and cheap:** pure typography plus UI chips plus real screen recordings, so it needs no footage beyond what the product already has. Each feature gets one chip, then a 3–5 s capture of that feature, which is fully data-driven from a list.
- **Already has:** `title` card (typed text, brand background), `badges` (1–4 tiles), page captures, brand profile.
- **Needs:**
  - A "chip-swap" card: a fixed phrase with a rotating chip, as a `title` variant with `items[]`.
  - A screenshot card: a real social-post screenshot via local-file capture, which v1.L already handles.
  - v2.C pacing.
- **PRD conflicts:** none. Cluely's live-action date with a composited HUD is **not** reproducible faceless; using stock or generated actors there would hit the § 2 non-goal.
- **Variant to note:** it fits `promo` better than `ugc` (it reads as polished, not native).

### F4. `pov-pain`: "POV: [relatable work pain]" → real product fix
- **Drawn from:** #15 Educative (26.2M), #16 SCALER (8.8M), #14 ClickUp (4.14M), #17 Ramp (20.7M, paid), #20 Clay skits.
- **Why repeatable and cheap:** the hook is one persistent top caption ("POV: …" / "Me: … / Tool: …"), and the joke is the caption. These are the highest-view examples in the set.
- **What VideoMill can do faceless:**
  - The **meme layout:** a top text box plus one clip.
  - The "pain" half: real capture of the painful status quo (a spreadsheet of receipts, a 40-tab browser, a bug list), then the product doing it.
- **Already has:** captures, `clip`, `title` cards, captions.
- **Needs:**
  - v2.C: a **persistent top caption box** (pill style) that survives the cuts (a new caption style), plus word captions and hooks (three different POV lines over one body is a natural fit for `hooks.a/b/c`).
  - A loop-friendly short length (11–20 s).
- **PRD conflicts:**
  - **Skits with actors aren't reproducible:** they're real people on camera (goal 4).
  - **Stock reaction clips** (SCALER style): stock is "real footage" but not *of the product*. § 2 says "only real footage, screenshots and SVGs", and stock isn't addressed, so the operator must decide. If allowed, each stock clip's license belongs in `assets.json`.
  - **AI-generated skits:** a § 2 non-goal violation, and outside v3's avatar-only reversal.
  - **v3 avatar in a skit role** ("Employee" label): fine only if the avatar plays a *character*, not a customer. Lines like "since I switched to X my numbers are up" are first-person testimonial phrasing, which v3 P0 blocks.

### F5. `metric-story`: founder number story / whiteboard explainer
- **Drawn from:** #11 Guillaume Moubeche ($1 → $36 whiteboard, 252.8K), #10 Marc Lou (the accumulating ✗ list), #13 Cluely (real X-post cards), and the RedCurate bip post titles ("2,600 signups", "$5 MRR, 400 downloads, 2 paying users").
- **Why repeatable and cheap:** one real number is the hook. A progressively drawn SVG (arrow, equation, bar) or an accumulating checklist carries the body, and real dashboards or screenshots provide the proof. Every week's bip update supplies new numbers.
- **Already has:** v1 P1 "metric card / build update" bip templates, `title` and `badges` cards, local-file captures for screenshots of real dashboards.
- **Needs:**
  - A stroke-draw SVG card (whiteboard look) and an accumulating checklist card. Both are VideoMill-drawn SVG, which § 2 allows.
  - v2.C: word captions and hooks.
- **PRD conflicts:** every number must come from the operator (no-fabrication rule). The template should refuse to render placeholder numbers, e.g. a `qa` ✗ on a `‹FILL›` token.

### Formats deliberately *not* in the top 5 (flagged)

| Format | Examples | Conflict |
|---|---|---|
| Creator testimonial ("Using X makes Y 10x easier!") | #19 catherine/onghost, spytok "business testimonials", Hark (#ad) | A TTS voice saying "it saved me…" fabricates a customer. In v3, an avatar saying it is blocked by **P0: avatar never poses as a customer**. The only honest version is a *real* customer's quote shown as on-screen text with the permission in `assets.json`. That is a question for the operator, not proposed here. |
| Reaction hook (real person reacts → demo) | Umer Arif Reels | A real face is needed (goal 4). A generated reaction face is generative video (§ 2). v3 avatar reactions would need v3.A to explicitly include "reaction" in the avatar reversal. |
| Live-action skit / sponsored creator skit | #14 ClickUp, #15 Educative, #17 Ramp, #20 Clay | A camera and real people are needed (goal 4). Sponsored-creator deals are distribution, not VideoMill's job. |
| Founder interview / talking head | #9 Cursor 3, #6 Tom Shaw, #5 Keegan | Goal 4 (v3 avatar could cover a *presenter*, not the founder posing as themself unless the operator decides so in v3.A). |
| Phone-filming-the-monitor | #2 Web Prodigies | A camera is needed. v2.B already chose real capture in a phone frame instead. |

## 3. Proposed CLI templates and config

### 3.1 CLI surface (one new flag)

```
videomill new <slug> --type <promo|ugc|bip> [--template <name>] --brand <id> --url <page> [--audience "<text>"]
videomill render <slug> [--hook <a|b|c>] [--scene <id>] [--format <f>]      # --hook already planned (v2.D)
```

- `--template` is the only new flag. Everything else lives in the template's defaults, written into `project.json` by `new` and editable there.
- `--audience` is optional: the field is planned in ADR-0006, and a flag is only worth it if the operator wants it at creation time. Otherwise edit `project.json`.
- No `--hooks N` flag: the hook count is fixed at three by v2.C (`a|b|c`).
- No per-style flags (captions, pacing, voice): a template sets them in data.
- Each `--type` has a default template: `ugc` → `tool-list`, `bip` → `metric-story`, `promo` → `kinetic-launch`.

| Template | Default for type | Also allowed with | Format |
|---|---|---|---|
| `tool-list` | `ugc` | `promo` | F1 |
| `build-walkthrough` | — | `ugc`, `bip` | F2 |
| `kinetic-launch` | `promo` | `ugc` | F3 |
| `pov-pain` | — | `ugc` | F4 |
| `metric-story` | `bip` | — | F5 |

`new` writes a scene *skeleton* (scene ids, kinds, `minSeconds`, empty `narration` / `caption` marked `‹FILL›`). The `videomill-draft` skill fills it from the real page, and the operator approves as today. `qa` should ✗ on any remaining `‹FILL›`.

### 3.2 Schema implications (decision for the operator)

- **`template` in `project.json`:** additive and optional on top of `videomill-project-v2` (ADR-0006). Allowed within v2 by the additive rule, but it's a new field, so the operator should confirm whether it goes into ADR-0006 now (v2.A is still open) or later.
- **Style block** (captions, pacing, voice preset): the proposals below use a `style` object. If v2.C prefers flat fields, rename them. These names are proposals, not existing schema.

### 3.3 Template defaults (as written into `project.json`)

The field names `template`, `style.*` and new card kinds (`chip`, `draw`, `checklist`, `item`) are **proposed**. `type`, `audience`, `hooks.{a,b,c}`, `scenes`, `page-scroll`, `title`, `badges`, `clip`, `frame` and `popup` exist or are locked.

**`tool-list`** (F1)
```json
{
  "type": "ugc",
  "template": "tool-list",
  "audience": "‹FILL: who this is for›",
  "formats": ["9x16", "16x9"],
  "style": {
    "captions": "word",          // v2.C forced-alignment word captions, keyword highlight in brand accent
    "captionChunk": [1, 3],      // words on screen at once (observed range)
    "pacing": "jump",            // max shot length 3 s
    "voice": "casual",           // v2.C preset
    "targetSeconds": [35, 55],   // observed 38–61 s for listicles
    "footage": "browser"         // per item: browser frame; extension items use the popup shot
  },
  "hooks": {
    "a": [{ "kind": "title", "text": "‹FILL: N tools …›" }],                // claim-style
    "b": [{ "kind": "page-scroll", "capture": "‹best item›", "shots": [{ "zoom": "‹anchor›" }] }],  // result-first
    "c": [{ "kind": "title", "text": "‹FILL: question hook›" }]             // "Why did nobody tell me…" style
  },
  "scenes": "repeat per item: item card (#n + name) → page-scroll/popup 3–6 s → 1-line benefit; then end card"
}
```

**`build-walkthrough`** (F2)
```json
{
  "type": "ugc",
  "template": "build-walkthrough",
  "formats": ["9x16", "16x9"],
  "style": { "captions": "word", "captionChunk": [2, 3], "pacing": "jump", "voice": "casual",
             "targetSeconds": [25, 45], "footage": "phone" },   // v2.B phone frame for the result; editor frame for the build
  "hooks": {
    "a": "result-first: the finished app in a phone frame + 'built this in ‹FILL›'",
    "b": "contrarian: 'I didn't think ‹tool› made sense for ‹audience›'",
    "c": "how-to: 'Here's how I use ‹tool› for ‹job›'"
  },
  "scenes": "prompt/input (local-file or editor frame) → tool working (page-scroll) → result (phone frame) → one lesson → end card",
  "note": "first-person narration only for the operator's own work (bip/own sites); never for a client's customer"
}
```

**`kinetic-launch`** (F3)
```json
{
  "type": "promo",
  "template": "kinetic-launch",
  "formats": ["16x9", "9x16"],
  "style": { "captions": "phrase", "pacing": "beat-1s", "voice": "brand", "targetSeconds": [30, 60], "footage": "browser" },
  "hooks": {
    "a": "'Meet ‹product›' typed title",
    "b": "chip-swap: 'One ‹tool› to [feature1] / [feature2] / [feature3]'",
    "c": "problem line: '‹pain in 6 words›'"
  },
  "scenes": "chip card (features from a list) → per feature: 3–5 s capture → badges (trust points) → end card"
}
```

**`pov-pain`** (F4)
```json
{
  "type": "ugc",
  "template": "pov-pain",
  "formats": ["9x16"],
  "style": { "captions": "word", "topBox": "pov",    // persistent pill caption at the top, new in v2.C
             "pacing": "jump", "voice": "casual", "targetSeconds": [11, 25], "loop": true,
             "footage": "browser" },
  "hooks": {
    "a": "'POV: ‹pain›'",
    "b": "'Me: ‹ask› / ‹tool›: ‹result›' (meme dialogue)",
    "c": "'Nobody: … / ‹audience›: ‹pain›'"
  },
  "scenes": "pain capture (real status quo) 3–6 s → product fix capture → payoff line → end card",
  "note": "no stock/actor clips unless the operator amends § 2; licensed stock would be logged in assets.json"
}
```

**`metric-story`** (F5)
```json
{
  "type": "bip",
  "template": "metric-story",
  "formats": ["9x16", "16x9"],
  "style": { "captions": "word", "captionChunk": [1, 2], "pacing": "beat-1s", "voice": "casual",
             "targetSeconds": [20, 40], "footage": "local-file" },  // dashboard screenshots
  "hooks": {
    "a": "number-first: '‹metric›' big",
    "b": "before→after: '‹from› → ‹to›' drawn arrow",
    "c": "confession: '‹what went wrong›'"
  },
  "scenes": "draw card (SVG stroke equation/arrow) → proof capture (real dashboard) → checklist card (what I did / didn't) → next step → end card",
  "note": "every number from the operator; qa ✗ on ‹FILL›"
}
```

### 3.4 Mapping to phases

| Need | Phase |
|---|---|
| Phone frame for results | v2.B |
| Word captions + keyword highlight, jump pacing, casual voice, `hooks.a/b/c`, UTM per hook | v2.C |
| Persistent top-box caption style (`pov-pain`) | v2.C (new style; small) |
| `--type` defaults, `--template`, `render --hook`, client brand + permission | v2.D |
| New card kinds: item index, chip-swap, SVG stroke-draw, accumulating checklist | Not in any phase yet. They need a slot (suggest v2.C or v2.D, or a new letter with renumbering; the operator decides) |
| Stock footage allowance | Not planned. A § 2 decision for the operator |
| Avatar as presenter in F1/F2/F3; testimonial and first-person rules | v3.A ADR, v3.B, v3.C |

## 4. PRD conflicts summary

1. **Testimonial-style formats** (#19 onghost, spytok testimonials, Hark ad) conflict with no-fabrication in v2 (a TTS "customer") and with v3 P0 (an avatar never poses as a customer). Excluded.
2. **Reaction hooks and live-action skits** (Umer Arif, ClickUp, Educative, Ramp, Clay) need real faces (goal 4). Generated faces are a § 2 generative-video non-goal, outside v3's avatar-only reversal.
3. **Stock footage** (SCALER meme clip style) isn't addressed by § 2 ("real footage, screenshots and SVGs"). It needs an operator ruling, and an `assets.json` license entry if allowed.
4. **First-person narration:** fine for the operator's own bip/site work in TTS (v2). In v3, the `qa` ✗ on "I use…/it saved me…" would also hit legitimate *operator-story* lines spoken by an avatar, so v3.A should define the scope (customer-claim vs operator-story).
5. **Third-party tools in `tool-list`:** real footage is fine. A *client's* brand needs the v2.D permission record.
6. **New card kinds** (chip, stroke-draw, checklist, item index) aren't placed in any v2 phase yet. They must go into the PRD before being built.

## 5. Sources (all accessed 2026-11-04)

- Operator references: noboringbrands.co Clay case study; LinkedIn pulse (Umer Arif); LinkedIn post (Casey Hill); viral.app/free-tools/ugc-examples; spytok.com/top-posts/business-testimonials; redcurate.com/digest/buildinpublic-feb-2026-48NUhY
- Clay: instagram.com/reel/DZaf7wEgi5w; lnkd.in/p/ebdGb47D → linkedin.com/posts/aidanbrannigan_claypartner-ugcPost-7470528549129723904-_1aR
- YouTube watch pages: every URL in § 1.1–1.3 (watch-page metadata plus i.ytimg.com storyboard sprites)
- TikTok oEmbed: tiktok.com/oembed for #18 and #19
- Search-only (not used for numbers): Cluely press coverage (TBPN digest, newschannelnebraska), CMI and SweetFish B2B-skit articles
