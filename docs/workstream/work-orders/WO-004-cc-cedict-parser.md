---
id: WO-004
title: CC-CEDICT parser with full fixture coverage
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [FR-22]
depends_on: [WO-002]
spec_refs:
  - engineering/data-pipeline.md#2-stages
  - engineering/data-pipeline.md#3-stage-2--parsing-cc-cedict
  - engineering/domain-model.md#3-card-schema
  - engineering/domain-model.md#6-deck-schema
  - engineering/testing-strategy.md#2-the-rule-for-the-pipeline
  - engineering/testing-strategy.md#3-content-correctness-gates--automated
touches:
  - pipeline/ (the parser module and its fixture-driven test suite)
  - data/test-fixtures/ (CC-CEDICT parsing fixtures)
review_required: [Black]
---

# WO-004 — CC-CEDICT parser with full fixture coverage

## Context

CC-CEDICT is a ~125,000-line, plain-text dictionary with an idiosyncratic
grammar, and it is the sole source of every Hanzi, Pinyin, and English gloss the
application ever ships (CLAUDE.md §02, [data-pipeline](../../engineering/data-pipeline.md)
§1). WO-002 has pinned the release this work order parses:
`data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt` (124,903 entries, see its
`SOURCE.md` for provenance and two findings you must account for — see Notes).
This is stage 2 of the nine-stage pipeline in
[data-pipeline](../../engineering/data-pipeline.md) §2. Its output is an
intermediate `CedictEntry[]` — **not yet a `Card`** — consumed later by HSK
matching (WO-007) and validation (WO-008), neither of which is written yet.

## Task

Implement a parser for the CC-CEDICT text format, following every rule in the
"Parsing rules Black must implement" table in
[data-pipeline](../../engineering/data-pipeline.md) §3. In summary, per line:

- Skip comment/header lines (`#`); capture the release date from the header for
  later use as `DeckMeta.dictionaryVersion` ([domain-model](../../engineering/domain-model.md) §6).
- Preserve Traditional-then-Simplified field order.
- Capture the Pinyin bracket block **verbatim**, as the raw numbered reading —
  do not attempt diacritic conversion here; that is stage 7, already implemented
  in `pipeline/pinyin.ts` (WO-005), and is wired in by a later work order, not
  this one.
- Split senses on the top-level `/` delimiters only.
- Extract `CL:` classifier annotations into a separate field, removed from
  `senses`; handle multiple comma-separated classifiers and the
  `trad|simp[reading]` sub-form.
- Normalise a `trad|simp[reading]` reference occurring **inside an ordinary
  sense** (not a classifier) to display the simplified form only — no raw `|`,
  `[`, or `]` should remain in a sense string. This is what keeps the pipeline
  honest against testing-strategy §3 gate 4 ("no leaked dictionary syntax")
  before that gate is even written.
- Preserve register markers (`(coll.)`, `(lit.)`, `(fig.)`, `(dialect)`, etc.)
  verbatim.
- Let cross-reference-shaped senses (`see …`, `variant of …`, `old variant of
  …`, `abbr. for …`, `also written …`) parse as ordinary sense strings without
  error — **resolving** them is stage 5, a later work order, out of scope here.
- Let surname entries (`/surname Wang/`) parse normally, no special-casing.
- Exclude any entry whose headword contains no CJK ideograph (Latin letters,
  digits, or punctuation only) from the `CedictEntry[]` output, but record it
  somewhere visible (a warnings/excluded list on the parse result) rather than
  silently dropping it. Full invariant enforcement is WO-008's job
  ([domain-model](../../engineering/domain-model.md) §3 invariant 5); this is a
  first line of defence, not the gate itself.
- Read the file as UTF-8 explicitly; handle its CRLF line endings (see Notes)
  so no field carries a trailing `\r`.

Design the `CedictEntry` type and the parser's module boundary yourself —
`domain-model.md` deliberately does not define this intermediate shape, since it
is internal to the pipeline. At minimum it needs to carry enough to build a
`Card` later: both headword forms, the raw numbered reading, ordered senses,
any classifiers, and enough provenance (e.g. source line) to debug a parsing
failure.

## Acceptance criteria

1. The parser reads the pinned CC-CEDICT file and handles its CRLF line
   endings — no parsed field contains a trailing `\r`.
2. Comment lines are skipped; the release date is captured from the header and
   exposed on the parser's result.
3. Traditional-then-Simplified field order is preserved and asserted against
   known fixtures (a deliberately swapped-order fixture would fail).
4. The Pinyin bracket block is captured verbatim as the raw numbered reading,
   including erhua's `r5`, `u:`, and proper-noun capitalisation exactly as
   written — unconverted.
5. Senses are split on top-level `/` delimiters only; a multi-sense entry
   yields the correct ordered list.
6. `CL:` classifiers are extracted to a separate field and removed from
   `senses`; a multi-classifier entry parses every classifier, including the
   `trad|simp[reading]` sub-form.
7. A `trad|simp[reading]` reference inside an ordinary sense is normalised to
   the simplified form only; no `|`, `[`, or `]` remains in any sense string
   produced by the parser.
8. Register markers are preserved verbatim in sense text.
9. Cross-reference-shaped senses parse without error, as plain sense strings.
10. Surname entries parse without being dropped or special-cased.
11. A non-Han-headword entry is excluded from `CedictEntry[]` output and
    recorded in a warnings/excluded list, not silently dropped.
12. Fixture coverage in `data/test-fixtures/` includes at least the eleven
    cases named in [testing-strategy](../../engineering/testing-strategy.md) §2:
    a plain entry, a multi-sense entry, a `CL:` entry, a multi-classifier
    entry, a `u:` entry, an erhua entry, a capitalised proper noun, a
    cross-reference-only entry, a homograph pair (same headword, two entries,
    different readings), a surname entry, and a non-Han-headword entry.
13. The full pinned CC-CEDICT file parses end-to-end without throwing; the
    resulting entry count is sane relative to the file's own `entries=` header
    count (WO-002's report explains the expected line-count/entry-count
    delta).
14. Unit tests (Vitest) are table-driven against the criterion-12 fixtures and
    pass.
15. `npm run typecheck`, `npm run lint`, and `npm test` all remain green with
    this work included.

## Out of scope

- Matching against the HSK word list or applying overrides (WO-007).
- Resolving cross-reference-only entries to their target's senses (stage 5,
  WO-007).
- Numbered→diacritic Pinyin conversion — already implemented in
  `pipeline/pinyin.ts` (WO-005). This work order captures the raw numbered
  block only; it does not call the converter.
- Schema/invariant validation and the build report (WO-008). This work order's
  non-Han-headword exclusion is a courtesy, not the enforcement mechanism.
- Building `Card` or `Deck` objects. Output is the intermediate `CedictEntry[]`
  only, per [data-pipeline](../../engineering/data-pipeline.md) §2.

## Notes

- WO-002's report flagged two things this work order must account for:
  1. The pinned file uses **CRLF** line endings, pinned verbatim for
     determinism — strip the trailing `\r`, don't assume `\n`-only splitting.
  2. The worked cross-reference example named in
     [data-pipeline](../../engineering/data-pipeline.md) §3
     (`甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/`) is **absent**
     from the pinned 2026-08-23 release. Use the substituted example recorded
     in `data/source/cedict/SOURCE.md` (`B格`, line 61) for your
     cross-reference fixture instead.
- Keep this module decoupled from `pipeline/pinyin.ts` (WO-005) and from HSK
  matching (WO-007) — it should be usable and testable in complete isolation,
  the same pattern WO-005 followed successfully.
