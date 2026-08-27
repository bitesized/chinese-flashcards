---
id: WO-017
title: M8 — Free-drawing handwriting practice grid
owner: Black
status: Ready
priority: SHOULD
milestone: M8
requirements: [FR-84]
depends_on: [WO-015]
spec_refs:
  - product/requirements.md#h-hanzi-lookup-and-handwriting-practice
  - project/decision-log.md#dec-035--hanzi-lookup-and-handwriting-practice-added-to-v1-scope-stroke-data-licensed-under-the-arphic-public-license
  - project/roadmap.md#m8--hanzi-practice-character-lookup-stroke-order-and-handwriting
touches:
  - src/features/hanzi/PracticeGrid.tsx, PracticeGrid.module.css (new)
  - src/features/hanzi/HanziList.tsx, HanziList.module.css
  - src/app/App.tsx
review_required: [White]
---

# WO-017 — M8: Free-drawing handwriting practice grid

## Context

Third and final planned M8 slice (DEC-035), independent of both WO-015
(lookup/viewing) and WO-016 (guided per-character practice): a dedicated
page with a blank 田字格-style handwriting grid the user can draw on
freely, with no character selected and no stroke data involved (FR-84).
Reachable directly from the Hanzi section's own screen, per roadmap M8
gate #3 ("no character needs to be selected first").

## Task

### `PracticeGrid` component

`src/features/hanzi/PracticeGrid.tsx`: a tiled sheet of 田字格 guide cells
(solid cell border, dashed cross and diagonals — the same combined style
found on real practice books) rendered once as an SVG pattern, sized to
the container via `ResizeObserver`. A transparent `<canvas>` layered on
top is the only thing a "Clear" control ever touches, so clearing never
disturbs the guide lines.

Unlike `HanziAnimation`/`HanziPractice` (which hand all input handling to
`hanzi-writer`'s classic `mousedown`/`touchstart` listeners), this canvas
is ours to write, so it uses the Pointer Events API directly — one code
path for mouse, touch, and stylus, with real pressure data
(`event.pressure`) giving a pen thicker strokes than a mouse where the
browser reports it.

Reachable via a new "Practice grid" control on `HanziList`'s own top bar
(`onOpenPracticeGrid`), and a new `practice-grid` view in `App.tsx`.

## Acceptance criteria

1. A blank 田字格-style grid is shown and can be drawn on with mouse,
   touch, or stylus.
2. Reachable directly from the Hanzi section without selecting a
   character first (roadmap M8 gate #3).
3. A "Clear" control resets the drawing without affecting the guide
   lines.
4. Usable at a 360px viewport (NFR-5 gate #4) — verified, not assumed.
5. `npm run typecheck`, `npm run lint`, `npm run format:check`, and
   `npm test` all remain green; the new component has test coverage for
   drawing, clearing, and the guide-line rendering.
6. Verified in a real browser at both a small mobile width and a desktop
   width: draw a stroke, confirm it renders, confirm Clear removes it and
   nothing else.

## Out of scope

- Saving or exporting anything drawn — this is a scratch practice
  surface, not a persisted artifact.
- Preserving drawn content across a resize/orientation change — an
  accepted, documented limitation (the canvas pixel buffer is
  reallocated on resize).
- Any change to `HanziAnimation`, `HanziPractice`, or the character
  dictionary/stroke-data pipeline.

## Notes

- Executed directly by Claude Code, per the owner's standing process
  change (see WO-015's Notes).
- Real device + stylus verification (roadmap M8 gate #2, which also
  covers this slice's pressure-sensitivity touch) is **not** something
  this environment can do — no physical touch/stylus hardware is
  available here. Mouse-simulated drawing at multiple viewport widths in
  a real browser is the strongest verification available in this
  environment.
