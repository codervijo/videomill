---
ID: ADR-0008
Title: word-timing-forced-alignment
Status: Accepted
Date: 2026-11-04
Supersedes: —
---

## Context

v2.C's UGC captions show words as they're spoken. Kokoro returns no word timestamps (ADR-0004), which left word captions "out of scope until operator-felt"; the operator has now asked for them.

## Decision

- Word timings come from **forced alignment** of each TTS phrase's audio against its known text, run in the video container. The text is never re-transcribed: alignment only places the words VideoMill already has.
- The aligner sits behind an interface like TTS (ADR-0004) and is cached by audio hash. The tool is picked in a spike at the start of v2.C (candidates: whisper.cpp word timestamps, a CTC forced aligner) and recorded in `architecture.md`.
- Phrase-level captions stay the default for `promo` and `bip`; `ugc` defaults to word captions.

## Consequences

**Good:** captions track speech exactly; TTS providers stay interchangeable.

**Bad:** a model in the container (image size, first-run download); an alignment step per new phrase.

## Alternatives considered

- **Split phrase duration by character count.** Rejected by the operator: words drift on uneven speech.
