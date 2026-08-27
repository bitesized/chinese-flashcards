---
id: WO-010
title: Decide handling of embedded pronunciation-variant bracket annotations
owner: Red
status: Ready
priority: MUST
milestone: M1
requirements: [NFR-14]
depends_on: []
spec_refs:
  - engineering/data-pipeline.md#3-stage-2--parsing-cc-cedict
  - engineering/testing-strategy.md#3-content-correctness-gates--automated
  - project/decision-log.md#dec-023--tradsimp-sense-normalisation-covers-all-three-shapes-cc-cedict-actually-uses
touches: none — this work order produces a ruling, not code or committed data
review_required: [Red]
---

# WO-010 — Decide handling of embedded pronunciation-variant bracket annotations

## Context

Building the CC-CEDICT parser ([WO-004](WO-004-cc-cedict-parser.md)), Black
found that CC-CEDICT uses `[...]` for two genuinely different things inside a
sense string. One is a cross-reference to another headword
(`繁體|繁体[fan2 ti3]` and its two sibling shapes) — already handled,
[DEC-023](../../project/decision-log.md). The other, **not yet handled and not
Black's to decide**, is a bracketed pronunciation-variant annotation with no
word directly adjacent to the bracket: `"also pr. [tou4]"`,
`"Taiwan pr. [xing4]"`, `"pronounced [a4 pu5 zhu3]"`, `"Jyutping [bo1]"`. This
occurs in **818 senses** in the pinned corpus
(`data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt`). None of these are touched
by the parser's existing normalisation, correctly — they are not cross-references
to another headword, so collapsing them the same way would be wrong.

This matters because [testing-strategy](../../engineering/testing-strategy.md)
§3 gate 4 will fail the build on any shipped sense containing `[`, `]`, or `|`.
Someone has to decide what a learner actually sees for these 818 senses before
[WO-008](../../docs/workstream/board.md) (validation gates) can be designed
against real data, and this is a content-shape decision — what does the app
show, not a syntax question — so it is yours, not Black's or Claude Code's to
make unilaterally.

**A second, smaller, separate case**: two entries whose gloss is literally
*about* square brackets as punctuation (e.g. `"square brackets [ ]"`, headwords
around 中括号/方括号). These are not pronunciation annotations at all — the
brackets are the meaning. They need their own ruling, distinct from the 818.

## Task

**1. Rule on the 818 pronunciation-annotation senses.** Decide how the bracketed
content should be handled before shipping. Things worth weighing (not an
exhaustive list — this is your call):

- Convert any embedded **numbered Mandarin Pinyin** to diacritic form using the
  already-built `numberedToDiacritic` (`pipeline/pinyin.ts`, WO-005), so
  `"also pr. [tou4]"` becomes `"also pr. tòu"` — preserves the information,
  removes the raw syntax, consistent with how the rest of the pipeline already
  treats Pinyin.
- **Watch out for non-Mandarin content inside these brackets.** At least one
  example (`"Jyutping [bo1]"`) is **Cantonese romanisation, not Mandarin
  Pinyin** — running it through `numberedToDiacritic` would silently produce a
  meaningless or wrong result, since Jyutping's tone-number placement rules
  differ from Pinyin's. Any ruling that says "convert to diacritics" needs an
  explicit carve-out for these, or a different treatment for them entirely
  (e.g. drop, or keep as plain romanisation text).
- Alternatively: strip the annotation clause entirely, or some other treatment
  you judge more correct for a learner-facing flashcard. This is genuinely your
  call to make, not a default we're steering you toward.

**2. Rule on the two "square brackets [ ]" punctuation-description entries**
separately. Whether they're kept (reworded to avoid the literal brackets),
excluded, or something else, and why. (These may never actually surface in HSK
1–6 content — if you judge them irrelevant to this project's scope for that
reason, that is itself a valid ruling; say so rather than leaving it silent.)

**3. Write the ruling down precisely enough for Black to implement without a
follow-up question** — a short set of transformation rules or a small table,
not prose alone. If any individual instances resist a clean general rule,
list them with your specific call for each, following the same override
precedent as [data-pipeline](../../engineering/data-pipeline.md) §6.

You can pull the full 818-instance list yourself the same way Black did (parse
the pinned corpus and filter senses matching the "word gap then `[`" shape) if
you want to see the full picture rather than working from the examples above.

## Acceptance criteria

1. A definitive ruling for the pronunciation-annotation family, stating exactly
   how bracketed content is transformed for shipping, with the Mandarin-numbered-Pinyin
   case and any non-Mandarin-romanisation case (Jyutping etc.) addressed
   separately and explicitly.
2. A definitive ruling for the two square-brackets-as-punctuation entries.
3. Both rulings are precise enough for Black to implement in WO-008 without a
   follow-up linguistic question.
4. Any instance that resists a clean general rule is listed individually with
   your specific call.
5. Committed as a written record — a Linguistic Review-style document under
   `docs/workstream/reviews/`, or a ruling Claude Code can fold into
   `data-pipeline.md` directly, whichever you judge appropriate. Not left only
   in conversation (conventions.md §6).

## Out of scope

- Implementing the transformation in code — that is WO-008, Black's.
- Re-deciding the ordinary `trad|simp` cross-reference cases — already settled,
  [DEC-023](../../project/decision-log.md).
- Anything about classifiers, homographs, or HSK level assignment.

## Notes

- This blocks WO-008's gate-4 design, which is on M1's critical path — please
  prioritise it, though it does not block WO-007 (HSK matching), which is
  proceeding in parallel and does not touch sense text shape.
- Full detail and corpus counts are in
  `docs/workstream/reports/WO-004-report.md`'s Findings section and in
  `pipeline/cedict.ts`'s module docstring, both worth reading before you start.
