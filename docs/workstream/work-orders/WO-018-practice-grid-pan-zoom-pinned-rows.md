---
id: WO-018
title: M8 — Practice grid pan/zoom, pinned reference characters, and configurable practice rows
owner: Black
status: Ready
priority: SHOULD
milestone: M8
requirements: [FR-82, FR-83, FR-84]
depends_on: [WO-017]
spec_refs:
  - product/requirements.md#h-hanzi-lookup-and-handwriting-practice
  - project/decision-log.md#dec-035--hanzi-lookup-and-handwriting-practice-added-to-v1-scope-stroke-data-licensed-under-the-arphic-public-license
  - project/roadmap.md#m8--hanzi-practice-character-lookup-stroke-order-and-handwriting
touches:
  - src/features/hanzi/PracticeGrid.tsx, PracticeGrid.module.css
  - src/features/hanzi/HanziGlyph.tsx, HanziGlyph.module.css (new)
  - src/features/hanzi/HanziDetail.tsx, HanziDetail.module.css
  - src/app/App.tsx
review_required: [White]
---

# WO-018 — M8: Practice grid pan/zoom, pinned characters, and practice rows

## Context

Direct owner feedback on WO-017's shipped free-drawing grid, delivered as a
sequence of follow-up requests rather than a single work order: the sheet
needed to pan and scale, pinned reference characters needed their own
田字格 square "so users can see the scaling," those references needed to
be the real `hanzi-writer` handwritten form rather than the installed CJK
web font's glyph, and the grid needed configurable rows of practice cells
per pinned character (a model to copy, cells to trace with feedback, and
cells showing stroke order) — recreating the structure of a real
handwriting workbook page. This work order captures that whole sequence
as one coherent, shippable slice.

## Task

### 1. Pan and zoom

A single pointer draws exactly as before; a second simultaneous pointer
switches to a pinch gesture (scale + pan around the pinch midpoint),
matching the convention every touch drawing app uses. A mouse
wheel/trackpad pinch zooms around the cursor for desktop, attached via a
**native, non-passive** `addEventListener('wheel', ...)` rather than
React's `onWheel` — React attaches `wheel` as a passive listener by
default (since React 17), which silently drops `preventDefault()` and
would leave the page scrolling underneath the gesture. A "Reset view"
control returns to scale 1 / no pan. Screen-to-drawing coordinates are
recovered from `canvas.getBoundingClientRect()`, which already reflects
the current transform, so drawing stays accurate at any zoom level
without tracking the transform a second way.

### 2. `HanziGlyph` — the real handwritten form, not a web-font glyph

New component wrapping `hanzi-writer` with no quiz or animation — it
shows the full character immediately once stroke data loads (`hanzi-writer`'s
own default), giving a static reference in the *same* handwritten stroke
shapes `HanziAnimation`/`HanziPractice` already draw from, not the
installed CJK web font's (often quite different, print-style) glyph. Used
for the pinned reference tiles and for "filled" practice-row cells.

### 3. Pinned reference tiles inside a scaled guide square

Each pinned character sits inside a 田字格 guide square sized to exactly
`CELL_SIZE` — the same constant the main sheet's cells use — so the
reference is a true scale comparison, not an arbitrarily-sized decoration.
The unpin control is hidden until the tile is hovered or focused (a
quieter reference column), except on a touchscreen (`@media (hover:
none)`), where it stays always visible — hiding a control behind a
gesture that doesn't exist on that input class would be a real
regression, not a stylistic choice (NFR-5).

### 4. Configurable practice rows per pinned character

A small options bar (visible once at least one character is pinned) with
three number inputs — Filled, Traceable, Stroke order — controlling how
many of each cell type render in a row per pinned character:

- **Filled**: `HanziGlyph` — a model character to copy.
- **Traceable**: `HanziPractice` (already built in WO-016) — outline
  shown, per-stroke feedback via `hanzi-writer`'s `quiz()` mode. This is
  the "trace with feedback" the owner asked for, and already existed;
  this work order is what puts multiple independent instances of it in a
  row.
- **Stroke order**: `HanziAnimation` (already built in WO-015) — the
  animated stroke-order reference, on request.

No new practice mechanics were built for this — the value here is
reusing the two already-shipped, already-tested components as repeatable
row cells, not re-implementing tracing or stroke-order display a third
time.

### 5. "Copy on grid" from a character's own page

`HanziDetail` gained a control that jumps straight to the practice grid
with the current character pre-pinned (`onPracticeOnGrid`), so "look up a
character, then go copy it" is a single tap, not a manual re-type on the
grid page.

## Acceptance criteria

1. The sheet can be scaled and panned via a two-finger pinch and via
   mouse wheel/trackpad pinch, both without scrolling the surrounding
   page.
2. A pinned character's reference tile is sized to the same scale as the
   main sheet's cells and rendered from real stroke data, not the CJK web
   font.
3. The unpin control is hover/focus-revealed on pointer devices and
   always visible on touch devices.
4. The Filled/Traceable/Stroke order counts control exactly that many
   cells per pinned character, live, with no page reload.
5. A character's own page can jump to the grid with itself pre-pinned.
6. `npm run typecheck`, `npm run lint`, `npm run format:check`, and
   `npm test` all remain green; new logic has test coverage including the
   pinch/wheel/reset transform math and the row cell counts.
7. Verified in a real browser: pin two characters from both entry points,
   change all three counts, zoom via wheel, reset, with zero console
   errors throughout.

## Out of scope

- Per-character count configuration (counts are global to the page, applied
  identically to every pinned character's row) — a reasonable scoping
  choice given the added UI complexity of per-character controls wasn't
  requested.
- Persisting pinned characters or counts across a page reload — this
  remains a scratch practice surface, consistent with WO-017.
- Any change to `HanziPractice`'s or `HanziAnimation`'s own internal
  behaviour — both are reused completely unmodified as row cells.
- Real touch/stylus/pinch verification on physical hardware — this
  environment has none; see Notes.

## Notes

- Executed directly by Claude Code, per the owner's standing process
  change (see WO-015's Notes).
- Real device + stylus/pinch verification (roadmap M8 gate #2) is **not**
  something this environment can do. Wheel-based zoom was verified
  directly in a real browser; the two-pointer pinch path was verified via
  unit tests simulating two simultaneous Pointer Events, which is the
  closest approximation available without physical touch hardware.
