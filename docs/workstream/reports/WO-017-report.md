---
id: WO-017
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-017 — Work Report

## What was done

Third and final planned M8 slice (DEC-035) — the free-drawing handwriting
practice grid (FR-84), independent of both WO-015 and WO-016.

- **`PracticeGrid`** (`src/features/hanzi/PracticeGrid.tsx`): a tiled
  sheet of 田字格 guide cells — solid cell borders, dashed cross and
  diagonal guide lines, matching the combined style found on real
  practice books — drawn once as an SVG `<pattern>` sized to the
  container via `ResizeObserver`. A transparent `<canvas>` is layered on
  top; "Clear" only ever touches the canvas, so the guide grid is never
  disturbed.
- **Pointer Events, not `hanzi-writer`'s classic listeners**:
  `HanziAnimation`/`HanziPractice` delegate all input handling to
  `hanzi-writer`, which binds classic `mousedown`/`touchstart`. This
  canvas is entirely this app's own code, so it uses the modern, unified
  Pointer Events API directly instead — one code path for mouse, touch,
  and stylus, and a pen's real pressure (`event.pressure`) gives a
  visibly thicker stroke than a default mouse line where the browser
  reports it.
- **Navigation**: a new "Practice grid" control on `HanziList`'s own top
  bar, and a `practice-grid` view in `App.tsx` — reachable with no
  character selected first, satisfying roadmap M8 gate #3 directly.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Blank grid shown, drawable with mouse/touch/stylus | yes | `PracticeGrid.test.tsx` — pointer down/move draws via the canvas 2D context; live-verified with a mouse-drawn 十 shape in a real browser |
| 2 | Reachable without selecting a character first | yes | `HanziList`'s new "Practice grid" button navigates directly; live-verified: Hanzi → Practice grid, no character page visited |
| 3 | Clear resets drawing, not the guide lines | yes | `PracticeGrid.test.tsx` — `Clear` calls `ctx.clearRect` on the canvas only, SVG guide layer untouched (separate element); live-verified: post-clear screenshot shows an intact grid with the drawn stroke gone |
| 4 | Usable at 360px | yes | Live-verified at a 360×740 viewport — grid tiles correctly, canvas fills the sheet, no console errors, no horizontal overflow |
| 5 | typecheck/lint/format/test green; new component tested | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (413 tests, up from 404 — 8 new for `PracticeGrid`, 1 new for `HanziList`'s new control), `npm run license-check` (301 packages OK, no new dependency) |
| 6 | Verified in a real browser at mobile and desktop widths | yes | See Browser verification below |

## Browser verification

Real Chromium (Playwright) against a production build served via
`vite preview`, at three viewports (420×860, 360×740, 1280×900):

- Navigated Hanzi → Practice grid directly (no character page visited).
- Confirmed the tiled 田字格 grid renders correctly at every width,
  including the narrowest (360px) — cell borders and dashed cross/
  diagonal guides all visible, no overflow.
- Drew a rough 十 (cross) shape with the simulated mouse at each
  viewport: the stroke rendered as expected, on top of the guide grid.
- Clicked Clear: the drawn stroke disappeared, the guide grid remained
  fully intact.
- No console or page errors at any point, at any viewport.

Scratch verification script and screenshots removed after use.

## Not done

Nothing within WO-017's stated scope. Explicitly out of scope and
correctly not attempted: saving/exporting drawings, preserving drawn
content across a resize, and any change to `HanziAnimation`,
`HanziPractice`, or the stroke-data/character-dictionary pipeline.

## Findings

1. **Real device/stylus testing is still not possible in this
   environment**, the same limitation noted in WO-015 and WO-016. This
   slice's pressure-sensitivity code path (`event.pressure` widening a
   pen's stroke) is exercised only via a synthetic `pointerType: 'pen'`
   event in the unit test — it has never received input from an actual
   stylus. Roadmap M8 gate #2 stays open until the owner verifies on
   real hardware.
2. **jsdom has no `ResizeObserver`, `HTMLCanvasElement.getContext`, or
   `setPointerCapture`/`releasePointerCapture` implementation.** Handled
   without weakening the component: `ResizeObserver` and `getContext` are
   stubbed per-test (a small fake 2D context recording calls, exactly the
   level of fidelity needed to assert drawing behaviour); the pointer
   capture calls are made via optional chaining
   (`canvas.setPointerCapture?.(...)`) in the component itself, since
   real browsers always have this method but a defensive call costs
   nothing and sidesteps the jsdom gap entirely rather than special-casing
   the test environment.

## Follow-ups proposed

- Owner verification of both practice surfaces (`HanziPractice` and
  `PracticeGrid`) on real touch/stylus hardware — the one remaining open
  item for M8 gate #2, and now the only thing separating M8 from a
  complete gate pass (all deliverables are shipped).
