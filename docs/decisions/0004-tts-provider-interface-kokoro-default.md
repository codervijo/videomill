---
ID: ADR-0004
Title: tts-provider-interface-kokoro-default
Status: Accepted
Date: 2026-10-20
Supersedes: —
---

## Context

The brief requires TTS narration with interchangeable providers. Options were a local open model in the container (free, offline, portable) or a hosted API (higher quality, key + network + per-use cost). Operator chose Kokoro.

## Decision

- TTS sits behind a `TtsProvider` interface: input = text segment + voice id + options; output = audio file path + measured duration (seconds). Callers never import a provider directly.
- **Default provider: Kokoro-82M via `kokoro-js`** (Transformers.js, ONNX model `onnx-community/Kokoro-82M-v1.0-ONNX`, `device: "cpu"`), running in the container. Weights are Apache-licensed; downloaded once into the model cache volume (ADR-0003).
- Narration is synthesized **per caption segment** (sentence/line), not per whole script. Each segment's measured audio duration drives caption timing and scene length. This is required because kokoro-js returns no word-level timestamps.
- Provider + voice are chosen per brand profile; a hosted provider can be added later as a second implementation without touching callers.

## Consequences

**Good:**
- Zero marginal cost, no API key, works offline and on any machine with the image.
- Segment-level synthesis gives exact caption sync at sentence granularity and makes single-scene re-render cheap (only that scene's segments re-synthesize; cache by text+voice hash).

**Bad:**
- Captions are segment-timed, not word-timed. Word-highlight ("karaoke") captions would need forced alignment (e.g. a Whisper-family model in the container) — out of scope until operator-felt.
- CPU inference speed and voice quality vs. the Fiverr benchmark are unverified until v1.D.
- English voices only (American + British sets).

## Alternatives considered

- **Hosted API (ElevenLabs / OpenAI TTS).** Better quality and word timestamps on some providers, but adds a key, network dependency and per-use cost. Kept as a future second provider behind the same interface.
- **Piper.** Also local and fast; Kokoro chosen by operator.
