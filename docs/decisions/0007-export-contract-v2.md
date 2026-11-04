---
ID: ADR-0007
Title: export-contract-v2
Status: Accepted
Date: 2026-11-04
Supersedes: ADR-0005
---

## Context

ADR-0005 fixed `videomill-export-v1`: one video per format, `type` from the project. v2 changes both: `type` values are renamed (ADR-0006), and hook variants put up to three videos per format in one export. v2 also adds `assets.json` (provenance of every non-captured asset: client permission in v2.D, avatar outputs in v3). RankMill doesn't consume exports yet, so this is the cheapest moment to break.

## Decision

- Bump to **`videomill-export-v2`**. Everything in ADR-0005 carries over (immutable timestamped folder, atomic rename, `latest` symlink, relative paths, `complete` flag, additive-only within a version) except:
  - `type` takes the v2 values `promo | ugc | bip`.
  - Each `videos[]` entry gains `hook` (`a | b | c`, absent for a hookless project) and its own `utm` (with `content: "hook-<id>"`); file names become `video-<format>[-<hook>].mp4`.
  - Captions are per hook when the hooks' openings differ: `captions[]` entries gain `hook`.
  - `assets` points at `assets.json` when the export uses any non-captured asset.
- Lands with the first v2 phase that changes the export. v1 exports on disk stay as written.

## Consequences

**Good:** one export holds every variant RankMill will test; the manifest says which hook each file is.

**Bad:** a consumer must group `videos[]` by `hook`, not assume one per format.

## Alternatives considered

- **Stay v1; one export folder per hook.** Rejected: three folders for one approved project, and the type-name mapping kept forever.
