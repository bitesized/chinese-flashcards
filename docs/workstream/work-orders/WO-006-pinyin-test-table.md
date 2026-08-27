---
id: WO-006
title: Pinyin conversion test table
owner: Red
status: Ready
priority: MUST
milestone: M1
requirements: [FR-12]
depends_on: []
spec_refs:
  - engineering/data-pipeline.md#numbered-pinyin--diacritics-stage-7
  - engineering/testing-strategy.md#2-the-rule-for-the-pipeline
touches:
  - data/test-fixtures/pinyin-conversion.json (or your chosen equivalent path —
    state it in the work report)
review_required: [Red]
---

# WO-006 — Pinyin conversion test table

## Context

Black is implementing the numbered-Pinyin → diacritic conversion (WO-005) against
the eight rules in [data-pipeline](../../engineering/data-pipeline.md) §3. Rules on
paper are not the same as a linguist confirming the output is actually correct
Mandarin Pinyin — tone-mark placement on multi-vowel finals and `ü` handling are
exactly the kind of thing that reads as plausible and is wrong
([data-pipeline](../../engineering/data-pipeline.md) §3 calls tone marks on `ü` "the
most commonly botched case"). Your test table is the authority Black's
implementation is checked against, and the fixture set that later protects the
whole corpus via the round-trip gate
([testing-strategy](../../engineering/testing-strategy.md) §3.1).

## Task

Produce a table of numbered-Pinyin → correct diacritic-form pairs. Cover, at
minimum:

- **`ü` via `u:`**, all four tones: e.g. `lu:1`/`lu:2`/`lu:3`/`lu:4` or equivalent,
  producing `ǖ ǘ ǚ ǜ`.
- **The `j`/`q`/`x`/`y` + `u` convention** — confirm explicitly whether CC-CEDICT
  writes these with a bare `u` (no colon) because the vowel is unambiguously `ü`
  after those initials, and give at least one example (e.g. a `qu`/`ju`/`xu`/`yu`
  syllable). This is a convention Black needs confirmed, not guessed.
- **Erhua**, both forms: the `r5` suffix joining a preceding syllable (e.g.
  `yi1 hui4 r5`), and a standalone `儿 er2` word, showing they are not the same
  case.
- **Proper-noun capitalisation** (e.g. `Zhong1 guo2` → `Zhōng guó`).
- **Neutral tone**, digit `5` and the no-digit form if CC-CEDICT uses both, showing
  no mark is produced.
- **`a`-priority** syllables (mark goes on `a`).
- **`o`/`e`-priority** syllables with no `a` present.
- **Last-vowel-wins** multi-vowel finals with none of `a`/`o`/`e` first, including
  the two cases already named in the spec (`iu4`→`liù`, `ui4`→`duì`) plus at least
  one more of the same shape.
- **Single-vowel syllables** and **syllables with no initial** (e.g. a vowel-only
  onset).
- **Multi-syllable words**, to confirm space-joining is correct.

## Acceptance criteria

1. At least 40 rows, collectively covering every case listed in Task.
2. Each row states: the numbered input, the correct diacritic output, and a
   one-line note of which rule or case it exercises.
3. All four `ü` tone marks (`ǖ ǘ ǚ ǜ`) are represented.
4. At least one erhua-suffix case and one standalone-`儿` case are both present and
   distinguished from each other.
5. At least one proper-noun capitalisation case is present.
6. The `j`/`q`/`x`/`y` + `u` convention is explicitly stated as confirmed (with an
   example) or corrected, in the table's notes — not left implicit.
7. The table is delivered in a form Black can consume directly as test fixtures —
   a machine-readable format (JSON or a TypeScript array literal) is preferred; a
   clearly structured Markdown table is acceptable only if every column is
   unambiguous to parse.
8. Committed under `data/test-fixtures/`, path stated in the work report.

## Out of scope

- Implementing the conversion function (WO-005, Black).
- Reviewing HSK word list content (WO-003, your other work order — keep them
  separate; this one is Pinyin mechanics only, independent of any word list).
- Reviewing compiled card content — that is WO-009, after decks exist.

## Notes

- This table is reusable beyond WO-005: it is the fixture set the build-time
  round-trip gate ([testing-strategy](../../engineering/testing-strategy.md) §3.1)
  runs against the full corpus, so completeness here pays off for the life of the
  project, not just this one work order.
- You do not need the CC-CEDICT file itself for this — the input space is Pinyin
  syllables, not headwords. Work from your own knowledge of the syllabary and the
  rules document.
