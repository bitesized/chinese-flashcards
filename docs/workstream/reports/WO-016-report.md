---
id: WO-016
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-016 — Work Report

## What was done

Second slice of M8 (DEC-035), building directly on WO-015's lookup and
viewing work.

- **`HanziPractice`** (`src/features/hanzi/HanziPractice.tsx`): wraps
  `hanzi-writer`'s `quiz()` mode with the same self-hosted `charDataLoader`
  as `HanziAnimation` (never the library's default CDN loader). Tracks
  mistakes via `onMistake`, shows a distinct completion message via
  `onComplete` (clean run vs. mistake count), and a "Try again" control
  that re-creates the quiz on the same character without navigating away.
- **Watch / Practice toggle** in `HanziDetail`: a segmented two-button
  control (same visual pattern as Settings' toggles) switching between the
  existing `HanziAnimation` and the new `HanziPractice`. Resets to Watch
  whenever the character prop changes, including switching directly
  between two characters' pages without an intermediate unmount.
- **Accessibility**: the practice canvas uses `role="application"` with a
  descriptive `aria-label`, not `role="img"` — it is interactive content,
  and mislabelling it as static would be actively misleading to assistive
  tech. This is a deliberate, documented exception to NFR-7's "keyboard
  operable end to end": there is no meaningful keyboard equivalent to
  "draw this stroke's shape," and the code comments and this report say so
  explicitly rather than leaving it to be discovered later.
- **Retroactive test coverage for WO-015's UI**: while building this,
  found that WO-015's own components (`HanziList`, `HanziAnimation`,
  `HanziDetail`) had zero component tests despite that work order's
  acceptance criterion 5 claiming coverage was adequate — true for the new
  pipeline logic, not for the UI. Fixed by writing
  `HanziAnimation.test.tsx` (6 tests), `HanziList.test.tsx` (7 tests), and
  `HanziDetail.test.tsx` (7 tests, now covering the Watch/Practice toggle
  too), alongside `HanziPractice.test.tsx` (8 tests) for this work order's
  own component.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Accepts drawn strokes, reports per-stroke correctness live | yes | `hanzi-writer`'s `quiz()` handles stroke recognition; live-verified with a mouse-drawn stroke in a real browser (see Browser verification) |
| 2 | Running mistake count shown during the quiz | yes | `HanziPractice.test.tsx` — mistake count increments on each `onMistake`; live-verified: a wrong stroke shape produced "1 mistake so far." |
| 3 | Clear, distinct completion message; retry control | yes | `HanziPractice.test.tsx` — "no mistakes" vs. "N mistake(s)" messages; "Try again" creates a fresh writer (`createMock` called twice) and resets the prompt |
| 4 | Discoverable Watch/Practice toggle; resets to Watch on character change | yes | `HanziDetail.test.tsx` — defaults to Watch, toggles both ways, resets to Watch on a `rerender` with a different character; live-verified |
| 5 | Honest ARIA role; NFR-7 exception documented | yes | `role="application"` (not `role="img"`) with descriptive label; documented in `HanziPractice.tsx`'s own code comment and here |
| 6 | typecheck/lint/format/test all green; new component tested | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (404 tests, up from 376 — 28 new across the four Hanzi UI test files), `npm run license-check` (301 packages OK, no new dependency) |
| 7 | Verified in a real browser | yes | See Browser verification below |

## Browser verification

Real Chromium (Playwright) against a production build served via
`vite preview`:

- Level Select → Hanzi → searched and opened 你 → confirmed Watch mode is
  the default and the toggle shows the correct pressed state on both
  buttons.
- Clicked Practice: the canvas rendered with the character outline and the
  "Draw the character, one stroke at a time." prompt, `role="application"`
  confirmed present with the expected label.
- Simulated a mouse-drawn stroke (mousedown → move → up) across the
  canvas: the mistake count updated live to "1 mistake so far." — this
  round-trips through `hanzi-writer`'s real stroke-recognition logic, the
  component's `onMistake` handler, and a React re-render, not a mocked
  path.
- No console or page errors at any point in the flow.

Scratch verification script and screenshots removed after use.

## Not done

Nothing within WO-016's stated scope. Explicitly out of scope and
correctly not attempted: the free-drawing practice grid (FR-84), real
touch/stylus hardware verification, linking a character to its HSK words
(FR-86, MAY), and any change to the stroke-data extraction or
character-dictionary build pipeline.

## Findings

1. **Real device/stylus testing is still not possible in this
   environment**, same limitation noted in WO-015. Mouse-simulated drawing
   in a real browser is the strongest verification available here and was
   performed; it confirms the interaction wiring works end-to-end, but
   roadmap M8 gate #2 stays open until the owner verifies on real
   touch/stylus hardware.
2. **WO-015's UI had a real test-coverage gap**, caught and fixed
   proactively during this work order rather than left for a future
   review to find — see "What was done" above. Worth noting as a process
   point: acceptance-criterion checks that say "tests pass" should
   distinguish pipeline coverage from UI coverage explicitly in future
   work-order reports, so this kind of gap is visible at sign-off time
   rather than discovered later.

## Follow-ups proposed

- A follow-on work order for the free-drawing practice grid (FR-84),
  independent of this work and of WO-015.
- Owner verification of guided practice on real touch/stylus hardware —
  the one remaining open item for M8 gate #2.
