---
id: WO-005
title: Pinyin numbered→diacritic converter
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [FR-12]
depends_on: [WO-001]
spec_refs:
  - engineering/data-pipeline.md#numbered-pinyin--diacritics-stage-7
  - engineering/testing-strategy.md#3-content-correctness-gates--automated
touches:
  - pipeline/ (the pure conversion function and its round-trip check)
  - tests/ (unit tests for it)
review_required: [Black, Red]
---

# WO-005 — Pinyin numbered→diacritic converter

## Context

CC-CEDICT stores Pinyin as numbered syllables (`ni3 hao3`); FR-12 requires the
application to display tone diacritics (`nǐ hǎo`). This conversion happens at
build time, in the pipeline, per stage 7 of
[data-pipeline](../../engineering/data-pipeline.md) §3 — the browser never does
this work. The function is pure and small but has several genuinely sharp edges
(`ü`, erhua, multi-vowel finals, proper-noun capitalisation), which is why
[data-pipeline](../../engineering/data-pipeline.md) §3 spells out eight explicit
rules and why Red is separately producing a test table (WO-006) rather than this
being left to a single implementer's judgement of what "looks right."

## Task

Implement the numbered-Pinyin → diacritic conversion **exactly** per the eight
rules in [data-pipeline](../../engineering/data-pipeline.md) §3 ("Numbered Pinyin
→ diacritics (stage 7)"):

1. Replace `u:` with `ü` first.
2. Tone 5 (or no digit): no mark.
3. If the syllable contains `a`, the mark goes on the `a`.
4. Otherwise, if it contains `o` or `e`, the mark goes there.
5. Otherwise the mark goes on the **last** vowel (produces `iù` for `iu4`, `uì` for
   `ui4`).
6. Preserve capitalisation (`Zhong1` → `Zhōng`).
7. Join syllables with a single space, matching CC-CEDICT's grouping.
8. Erhua `r5` joins the preceding syllable without a mark.

Write it as a pure function taking a numbered Pinyin string (one syllable or a
space-separated sequence, as it appears inside CC-CEDICT's `[...]` block) and
returning the diacritic form. Also implement the inverse direction (diacritic →
numbered, or an equivalent round-trip check) — this is what
[testing-strategy](../../engineering/testing-strategy.md) §3 gate 1 uses to catch
vowel and `ü` errors across the whole corpus at build time; wire it as an exported
check the future validation stage (WO-008) can call.

Cover, with your own fixtures now, every worked example already given in the spec:
`lu:4`→`lǜ`, `nu:3`→`nǚ`, `iu4`→`liù`, `ui4`→`duì`, `Zhong1`→`Zhōng`, and an erhua
case (`yi1 hui4 r5`).

**Reconciling with Red's test table (WO-006).** WO-006 is being produced in
parallel and will land as a fixture file. You are not blocked on it to start or to
implement — the rules above are complete on their own — but this work order is not
`Done` until every row of Red's table passes against your implementation
unmodified (fixture additions are fine; changes to the conversion logic itself, if
needed, should be reported as a finding). If Claude Code has not yet supplied
WO-006's output when you finish, say so explicitly in your work report as "blocked
on WO-006 for final reconciliation" rather than marking this criterion met.

## Acceptance criteria

1. A pure `numberedToDiacritic` function exists in `pipeline/`, with no side
   effects and no I/O.
2. `u:` → `ü` is applied before tone placement (rule 1), verified by a test where
   getting the order wrong would visibly produce the wrong output.
3. Tone placement follows the a > o/e > last-vowel precedence exactly, verified
   against `lu:4`→`lǜ`, `nu:3`→`nǚ`, `iu4`→`liù`, `ui4`→`duì`.
4. Capitalisation is preserved: `Zhong1`→`Zhōng`.
5. Erhua `r5` joins the preceding syllable with no mark of its own.
6. Multi-syllable input joins with a single space, matching CC-CEDICT's grouping.
7. Neutral tone (digit `5` or no digit) produces no diacritic mark.
8. A round-trip check (diacritic → numbered, or equivalent) exists and is
   exported for use by the future validation stage.
9. Unit tests (Vitest) are table-driven and cover every rule above plus every
   worked example, including failure cases (e.g. malformed input rejected rather
   than silently mishandled).
10. Reconciliation against WO-006's full test table is either complete and passing,
    or explicitly reported as blocked/pending in the work report — never silently
    skipped.

## Out of scope

- The CC-CEDICT parser that extracts the numbered Pinyin block in the first place
  (WO-004).
- HSK matching and homograph resolution (WO-007).
- Any UI rendering of Pinyin (M2, White) — this work order produces the pipeline
  function only.
- Authoring the test table itself — that is WO-006, Red's.

## Notes

- The `j`/`q`/`x`/`y` + `u` convention (where CC-CEDICT writes plain `u` rather
  than `u:` because the vowel is unambiguously `ü` after those initials) is a
  known convention worth defending against in a fixture, even though it requires
  no special-case code — confirm your implementation does *not* need one, and note
  the reasoning in the work report. Red's table (WO-006) will include an explicit
  case for this; use it to double-check once available.
- Keep this function decoupled from the parser (WO-004) and the matcher (WO-007)
  — it should be usable and testable in complete isolation, since it is the
  highest-value unit to get exhaustively right early.
