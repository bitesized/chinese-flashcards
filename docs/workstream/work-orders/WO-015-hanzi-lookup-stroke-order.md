---
id: WO-015
title: M8 — Hanzi lookup, stroke-order animation, and the character dictionary pipeline
owner: Black
status: Ready
priority: MUST
milestone: M8
requirements: [FR-80, FR-81, FR-85]
depends_on: []
spec_refs:
  - product/requirements.md#h-hanzi-lookup-and-handwriting-practice
  - project/decision-log.md#dec-035--hanzi-lookup-and-handwriting-practice-added-to-v1-scope-stroke-data-licensed-under-the-arphic-public-license
  - project/roadmap.md#m8--hanzi-practice-character-lookup-stroke-order-and-handwriting
touches:
  - pipeline/hanzi-dictionary.ts, build-hanzi.ts (new)
  - data/source/hanzi-writer-data/ (new)
  - public/strokes/, public/hanzi/ (new)
  - src/features/hanzi/ (new)
  - src/services/strokes.ts, hanzi.ts, useSpeechAvailable.ts (new)
  - src/domain/hanzi.ts (new)
review_required: [White]
---

# WO-015 — M8: Hanzi lookup, stroke-order animation, and the character dictionary pipeline

## Context

First slice of M8 (DEC-035) — the owner asked for a Hanzi section with
character lookup, animated stroke order, guided drawing practice with
stylus support, and a free-drawing practice grid. This work order covers
the **lookup and viewing** half only (FR-80, FR-81, FR-85): a searchable
character index and a per-character page showing stroke order, Pinyin, and
English. **Guided practice with stroke feedback (FR-82, FR-83) and the
free-drawing practice grid (FR-84) are explicitly out of scope** — separate
follow-on work orders, since they're substantial pieces in their own right
(interactive quiz UI, mistake feedback, canvas-based freehand drawing) and
this slice is independently useful and shippable on its own.

Stroke data is pinned per [DEC-035](../../project/decision-log.md):
`hanzi-writer-data@2.0.1` used as a one-time extraction source (never a
runtime dependency), only the 2,619 individual characters actually used
across the compiled HSK 1–6 decks extracted into `public/strokes/`. A
parallel per-character dictionary (Pinyin + English, from CC-CEDICT's own
single-character entries — a new pipeline stage, `pipeline/hanzi-dictionary.ts`
+ `build-hanzi.ts`, independent of the word-deck pipeline's HSK-matching,
override, and review-status machinery) is compiled into `public/hanzi/`.

## Task

### 1. Stroke data extraction

`scripts/extract-strokes.mjs` — reads every compiled deck's headwords,
collects the unique individual-character set, copies each character's
stroke JSON verbatim from a temporarily-installed `hanzi-writer-data` into
`public/strokes/{char}.json`. Documented in
`data/source/hanzi-writer-data/SOURCE.md`, re-run manually when vocabulary
changes (not part of `npm run build:data`'s CI-run pipeline, since
`hanzi-writer-data` is never installed as a persistent dependency).

### 2. Character dictionary pipeline

`pipeline/hanzi-dictionary.ts` (pure) + `pipeline/build-hanzi.ts`
(`npm run build:hanzi`, run after `npm run build:data`): filters the full
CC-CEDICT parse to exactly-one-character entries, groups by that character,
applies the same vulgar-content filter (DEC-029) and bracket-annotation
cleanup (LR-001) word-level cards get. Emits `public/hanzi/{char}.json` per
character plus `public/hanzi/index.json` (every character + its readings,
for the browsable list without an up-front fetch per character).

### 3. Hanzi section UI

`src/features/hanzi/`: `HanziList` (searchable/browsable index, reachable
from Level Select's top bar), `HanziDetail` (one character: stroke
animation, all readings with English senses, a speak control reusing the
existing speech service), `HanziAnimation` (the `hanzi-writer` wrapper,
`charDataLoader` overridden to fetch `public/strokes/` — never
hanzi-writer's default CDN loader, see DEC-035's clarification on why this
matters for the app's offline story).

`useSpeechAvailable` extracted from `StudySession.tsx` into
`src/services/useSpeechAvailable.ts` so both the study session and the
Hanzi section can share it without duplicating the subscription logic.

## Acceptance criteria

1. Every one of the 2,619 individual characters used across HSK 1–6 can be
   looked up and shows correct stroke order, Pinyin, and English.
2. The character list is searchable by character or by Pinyin substring.
3. Stroke order animation plays on request (not automatically) and uses
   only self-hosted data — verified no request to any third-party host is
   made (not assumed from reading the code).
4. The Hanzi section is reachable from Level Select and back-navigation
   works at every level.
5. `npm run typecheck`, `npm run lint`, `npm run format:check`, and
   `npm test` all remain green; new pipeline logic has unit test coverage
   including the real edge case found during this work (a single-character
   CC-CEDICT entry with no convertible reading, 儿's bare erhua-suffix
   entry).
6. Verified in a real browser: search, open a character, play the
   animation, and confirm the speak control works — screenshotted.

## Out of scope

- Guided drawing practice with stroke-level feedback and stylus support
  (FR-82, FR-83) — follow-on work order.
- The free-drawing practice grid (FR-84) — follow-on work order, and not
  dependent on the practice/quiz work landing first.
- Linking a character's page to HSK words that use it (FR-86, MAY
  priority, not requested).
- CI wiring for `npm run build:hanzi` (no drift-check step added yet,
  mirroring `build:data`'s — deferred until the Hanzi section's shape is
  more settled, to avoid CI churn on every iteration).
- Any change to the word-deck pipeline, `Card`/`Deck` domain types, or
  `public/decks/*.json`.

## Notes

- Per the owner's 2026-08-25 process change, this work order is executed
  directly by Claude Code rather than dispatched to a Black/White session.
- Real device + stylus verification (roadmap M8 gate #2) is **not**
  something this environment can do — no physical touch/stylus hardware is
  available here. This must be verified by the owner on real hardware
  before that specific gate criterion is considered met, regardless of
  what any future work order claims from browser-only testing.
