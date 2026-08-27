---
id: WO-015
agent: Claude Code
outcome: complete
date: 2026-08-25
---

# WO-015 — Work Report

## What was done

First slice of M8 (DEC-035), scoped deliberately to lookup and viewing only
— see the work order's Context for why guided practice and the free-draw
grid are separate follow-on work, not partially built here.

- **Stroke data**: pinned `hanzi-writer-data@2.0.1` as a one-time
  extraction source (never a runtime dependency); `scripts/extract-strokes.mjs`
  extracted exactly the 2,619 individual characters used across the
  compiled HSK 1–6 decks into `public/strokes/*.json` (all 2,619 found, no
  gaps). Documented in `data/source/hanzi-writer-data/SOURCE.md`;
  `public/strokes/LICENSE` carries the Arphic Public License, mirroring
  `data/LICENSE`'s structure for CC-CEDICT.
- **Character dictionary**: `pipeline/hanzi-dictionary.ts` (pure) +
  `pipeline/build-hanzi.ts` (`npm run build:hanzi`) filter CC-CEDICT to
  single-character entries, apply the same content filter and bracket
  cleanup word-level cards get, and emit `public/hanzi/{char}.json` +
  `index.json`. A real edge case surfaced immediately: 儿's own CC-CEDICT
  entry for the bare erhua suffix (`r5`, no preceding syllable) isn't
  convertible to diacritic form by the existing `numberedToDiacritic`
  (correctly, for its original word-level purpose) — handled by skipping
  just that one reading with a warning, not crashing the build or the
  whole character.
- **UI**: `HanziList` (searchable index), `HanziDetail` (stroke animation +
  readings + speak control), `HanziAnimation` (the `hanzi-writer` wrapper).
  `charDataLoader` points at `public/strokes/`, never hanzi-writer's
  default CDN — this was a real, corrected misunderstanding earlier in the
  conversation that produced DEC-035, not an assumption carried through
  unchecked.
- Extracted `useSpeechAvailable` out of `StudySession.tsx` into its own
  module so the Hanzi section's speak control could reuse it without
  duplicating the subscription logic.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | All 2,619 characters look up correctly (stroke, Pinyin, English) | yes | `build:hanzi` reports 2619/2619 written; live-verified on 你 (two CC-CEDICT senses, both rendered) |
| 2 | Searchable by character or Pinyin substring | yes | `HanziList`'s filter checks both fields; live-verified narrowing 2619 → 1 on "你" |
| 3 | Animation plays on request, self-hosted data only | yes | `HanziAnimation`'s `charDataLoader` fetches `/strokes/{char}.json` exclusively; live-verified mid-animation screenshot showing the first stroke solid, remaining strokes still outlined |
| 4 | Reachable from Level Select, back-navigation works throughout | yes | Live-verified: Level Select → Hanzi → character → back to list → back to Level Select |
| 5 | typecheck/lint/format/test all green; new pipeline logic tested | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (376 tests, 8 new for `hanzi-dictionary.ts` incl. the 儿 edge case), `npm run license-check` (301 packages OK — `hanzi-writer` MIT, already allow-listed; `hanzi-writer-data` never installed as a project dependency, so it never reaches this gate) |
| 6 | Verified in a real browser | yes | See Browser verification below |

## Browser verification

Real Chromium (Playwright) against the Vite dev server:

- Navigated Level Select → Hanzi, searched "你", confirmed the count
  narrowed from 2619 to 1.
- Opened 你's page: stroke outline rendered, both CC-CEDICT senses shown
  correctly, speak control present.
- Clicked "Play stroke order": screenshot mid-animation shows the first
  stroke drawn solid while the rest of the character remains in outline —
  the expected stroke-by-stroke reveal.
- Confirmed back-navigation at both levels (character → list → Level
  Select).

Scratch verification script and screenshots removed after use.

## Not done

Nothing within WO-015's stated scope. Explicitly out of scope and
correctly not attempted: guided drawing practice with stroke feedback and
stylus support (FR-82/83), the free-drawing practice grid (FR-84), linking
a character to its HSK words (FR-86, MAY), CI wiring for `build:hanzi`, and
any change to the word-deck pipeline or `public/decks/*.json`.

## Findings

1. **Real device/stylus testing is not possible in this environment.**
   Flagged explicitly in the work order and repeated here: no physical
   touch or stylus hardware is available to this session. Roadmap M8 gate
   #2 (stroke-level practice verified on real touch/stylus hardware)
   cannot be closed by any browser-only testing this or a future work
   order does here — it needs the owner's own device.
2. **`hanzi-writer` binds classic `mousedown`/`touchstart` listeners, not
   the modern unified Pointer Events API.** Checked directly in the
   installed package's compiled source before committing to this library.
   In practice this is likely fine for stylus input — browsers are
   required to fire compatibility touch/mouse events for pen input unless
   a page explicitly suppresses them via Pointer Events, which
   `hanzi-writer` never touches — but "likely fine" is exactly the kind of
   claim finding #1 says can't be upgraded to "verified" without real
   hardware.
3. **`data/build/report.md`-style build reporting doesn't exist yet for
   `build:hanzi`** — it just logs a count to stdout. Fine for now given
   this pipeline has no review-status/override/waiver machinery to report
   on (unlike the word-deck pipeline), but worth reconsidering if this
   stage grows more complex.

## Follow-ups proposed

- A follow-on work order for guided practice (FR-82, FR-83): wiring
  `hanzi-writer`'s `quiz()` mode with mistake/completion feedback, and the
  real-hardware stylus verification finding #1 flags.
- A follow-on work order for the free-drawing practice grid (FR-84) —
  independent of the practice-mode work, can proceed in parallel.
- CI wiring for `npm run build:hanzi` once the Hanzi section's shape is
  more settled (Findings #3).
