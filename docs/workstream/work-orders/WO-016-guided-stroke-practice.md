---
id: WO-016
title: M8 — Guided stroke-drawing practice with mistake feedback
owner: Black
status: Ready
priority: MUST
milestone: M8
requirements: [FR-82, FR-83]
depends_on: [WO-015]
spec_refs:
  - product/requirements.md#h-hanzi-lookup-and-handwriting-practice
  - project/decision-log.md#dec-035--hanzi-lookup-and-handwriting-practice-added-to-v1-scope-stroke-data-licensed-under-the-arphic-public-license
  - project/roadmap.md#m8--hanzi-practice-character-lookup-stroke-order-and-handwriting
touches:
  - src/features/hanzi/HanziPractice.tsx, HanziPractice.module.css (new)
  - src/features/hanzi/HanziDetail.tsx, HanziDetail.module.css
review_required: [White]
---

# WO-016 — M8: Guided stroke-drawing practice with mistake feedback

## Context

Second slice of M8 (DEC-035), following directly from WO-015's lookup and
viewing work. This work order covers guided drawing practice with
per-stroke feedback (FR-82, FR-83): the user draws each stroke of the
current character, gets immediate correct/incorrect feedback, and a hint
after repeated misses on the same stroke. **The free-drawing practice grid
(FR-84) remains out of scope** — a separate, independent follow-on.

## Task

### 1. `HanziPractice` component

`src/features/hanzi/HanziPractice.tsx` wraps `hanzi-writer`'s `quiz()` mode
(not `animateCharacter()` — a separate interaction mode on the same
instance). Same self-hosted `charDataLoader` as `HanziAnimation` — never
`hanzi-writer`'s default CDN loader. Tracks mistake count and completion
via `onMistake`/`onComplete` quiz callbacks; a "Try again" control restarts
the quiz on the same character without navigating away.

### 2. Watch / Practice mode toggle

`HanziDetail` gains a two-way toggle (mirroring the segmented-button
pattern already used in Settings) switching between the existing
`HanziAnimation` (Watch) and the new `HanziPractice` (Practice). Defaults
to Watch on every character change, including when the user is already on
a character's page and picks a different one.

## Acceptance criteria

1. Practice mode accepts drawn strokes (mouse/touch/stylus) and reports
   per-stroke correctness live.
2. A running mistake count is shown while the quiz is in progress.
3. On completion, a clear message distinguishes a clean run ("no
   mistakes") from one with mistakes (count shown), with a control to
   retry the same character.
4. Watch/Practice is a simple, discoverable toggle; switching characters
   always returns to Watch.
5. The practice canvas is marked up honestly for assistive tech
   (`role="application"`, not `role="img"` — it is interactive, not
   static); the NFR-7 "keyboard operable end to end" exception this
   implies (there is no keyboard equivalent to "draw this stroke's shape")
   is documented, not silently shipped.
6. `npm run typecheck`, `npm run lint`, `npm run format:check`, and
   `npm test` all remain green; the new component has test coverage
   including the mistake-counting and completion paths.
7. Verified in a real browser: switch to Practice, draw a stroke with the
   mouse, confirm live feedback updates.

## Out of scope

- The free-drawing practice grid (FR-84) — independent follow-on work
  order.
- Verification on real touch/stylus hardware — this environment has none;
  see Notes.
- Linking a character's page to HSK words that use it (FR-86, MAY
  priority, not requested).
- Any change to the word-deck pipeline, stroke-data extraction, or the
  character-dictionary build (`pipeline/hanzi-dictionary.ts`,
  `build-hanzi.ts`) — those are WO-015's territory and are unaffected here.

## Notes

- Executed directly by Claude Code, per the owner's standing process
  change (see WO-015's Notes).
- Real device + stylus verification (roadmap M8 gate #2) is **not**
  something this environment can do — no physical touch/stylus hardware is
  available here. Mouse-simulated drawing in a real browser is the
  strongest verification available in this environment; the gate stays
  open until the owner verifies on their own device.
