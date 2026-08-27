---
id: WO-018
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-018 — Work Report

## What was done

A sequence of direct owner feedback on WO-017's just-shipped free-drawing
grid, delivered as several follow-up messages rather than one work order,
implemented here as a single coherent slice:

- **Pan and zoom**: two-finger pinch (scale + pan around the pinch
  midpoint) and mouse-wheel/trackpad zoom (around the cursor), plus a
  "Reset view" control. Coordinate mapping for drawing is recovered from
  `canvas.getBoundingClientRect()`, which already reflects the live CSS
  transform, so strokes land correctly at any zoom/pan state without a
  second, parallel coordinate system.
- **`HanziGlyph`** (new component): shows a character in its real
  `hanzi-writer` handwritten stroke form — no quiz, no animation, just
  the static character `hanzi-writer` renders by default once stroke data
  loads. Replaces the CJK web-font glyph previously used for the pinned
  reference tiles.
- **Pinned tiles at true scale**: each pinned character now sits inside a
  田字格 guide square sized to exactly `CELL_SIZE`, the same constant the
  main sheet's cells use, so the reference is an honest scale comparison.
  The unpin (×) control is hover/focus-revealed on pointer devices, and
  always visible on touch devices via `@media (hover: none)`.
- **Configurable practice rows**: a small options bar (Filled / Traceable
  / Stroke order counts) drives a row of cells per pinned character,
  reusing `HanziGlyph` (filled model), `HanziPractice` (already built in
  WO-016 — outline + per-stroke feedback), and `HanziAnimation` (already
  built in WO-015 — animated stroke order) as independent, repeatable row
  cells. No new practice mechanic was built; this is entirely reuse of
  already-shipped, already-tested components.
- **"Copy on grid"** control on `HanziDetail`: jumps straight to the
  practice grid with the current character pre-pinned.

## A real bug found and fixed mid-verification

Live browser verification caught a console error the unit tests could not:
`Unable to preventDefault inside passive event listener invocation.` on
the wheel-zoom path. React attaches `wheel` as a passive listener at the
document root by default (a deliberate change since React 17, to match
native scroll performance), which silently drops `event.preventDefault()`
called from a JSX `onWheel` handler — the *page* would have kept scrolling
underneath the zoom gesture in a real browser, while jsdom's `fireEvent.wheel`
in the unit tests never surfaces this because jsdom doesn't implement
passive-listener semantics. Fixed by attaching the wheel handler directly
via `canvas.addEventListener('wheel', handler, { passive: false })` in a
`useEffect`, instead of JSX `onWheel`. Re-verified clean (zero console
errors) afterward.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Pinch and wheel/trackpad zoom, no page scroll | yes | `PracticeGrid.test.tsx` — two-pointer pinch scales/pans the transform layer; wheel zooms without a second pointer; live-verified via wheel zoom in a real browser, zero console errors after the passive-listener fix |
| 2 | Pinned tile at true scale, real stroke form | yes | `HanziGlyph.test.tsx` (5 tests); pinned tile sized via `--cell-size` CSS variable set from the same `CELL_SIZE` constant the sheet uses; live-verified visually |
| 3 | Unpin hover/focus-revealed, always visible on touch | yes | CSS `:hover`/`:focus-within` reveal plus `@media (hover: none)` override; not independently browser-verified on touch hardware (none available — see Notes) |
| 4 | Counts control row cell counts live | yes | `PracticeGrid.test.tsx` — default counts produce the expected `HanziWriter.create` call count and traceable-cell count; changing the Traceable input changes the rendered count live; live-verified changing all three counts in a real browser |
| 5 | "Copy on grid" pre-pins from a character's page | yes | `HanziDetail.test.tsx` — new test asserts `onPracticeOnGrid` called with the current character; live-verified end to end (Hanzi → 你 → Copy on grid → pinned) |
| 6 | typecheck/lint/format/test green; new logic tested | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (429 tests, up from 413 — 5 new for `HanziGlyph`, plus new/updated tests in `PracticeGrid.test.tsx` and `HanziDetail.test.tsx`), `npm run license-check` (301 packages OK, no new dependency) |
| 7 | Verified in a real browser, zero console errors | yes | See Browser verification below |

## Browser verification

Real Chromium (Playwright) against a production build served via
`vite preview`:

- Hanzi → looked up 你 → "Copy on grid" → landed on the practice grid with
  你 already pinned, in its own scaled guide square, rendered from real
  stroke data (not the web font).
- Typed 好 into the grid's own pin input → pinned alongside 你.
- Changed Traceable to 2 and Stroke order to 2 → both rows updated live to
  the new counts, each cell an independent, working `HanziPractice`/
  `HanziAnimation` instance.
- Zoomed the freehand sheet via mouse wheel → cells visibly enlarged;
  clicked "Reset view" → returned to the original scale.
- Zero console or page errors throughout the full sequence (after the
  passive-listener fix above — the first pass caught the bug this report
  documents).

Scratch verification script and screenshots removed after use.

## Not done

Per-character count configuration (global counts only), persisting pinned
characters/counts across a reload, and any change to `HanziPractice`'s or
`HanziAnimation`'s own internals — all explicitly out of scope, see the
work order.

## Findings

1. **Real device/stylus/pinch testing is still not possible in this
   environment.** Wheel-zoom was verified directly in a real browser;
   the two-pointer pinch path is verified only via unit tests simulating
   two simultaneous Pointer Events plus a manual read of the transform
   math — it has never received input from two real fingers or a stylus.
   Roadmap M8 gate #2 stays open until the owner verifies on real
   hardware — now including this pinch/pan behaviour specifically, not
   just the two practice surfaces WO-016/WO-017 already flagged.
2. **React's passive `wheel` listener default is an easy, silent trap**
   for exactly this kind of gesture-handling code — worth remembering
   for any future pointer/wheel work in this codebase: `onWheel` alone
   cannot reliably `preventDefault()`; a native `addEventListener` with
   `{ passive: false }` is required.

## Follow-ups proposed

- Owner verification of pinch-zoom and both practice surfaces on real
  touch/stylus hardware — the one remaining open item for M8 gate #2, and
  now the last thing separating M8 from a fully closed gate.
