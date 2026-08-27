---
id: WO-007
title: HSK matching, homograph resolution, and overrides
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [FR-20, FR-22]
depends_on: [WO-003, WO-004, WO-005]
spec_refs:
  - engineering/data-pipeline.md#2-stages
  - engineering/data-pipeline.md#4-stage-1--4--the-hsk-word-lists
  - engineering/data-pipeline.md#5-stage-5--resolution
  - engineering/data-pipeline.md#6-stage-6--overrides
  - engineering/domain-model.md#3-card-schema
  - engineering/domain-model.md#4-homographs--the-central-modelling-problem
  - engineering/domain-model.md#5-identifiers
  - project/decision-log.md#dec-004--homographs-are-separate-cards
  - project/decision-log.md#dec-005--deterministic-card-identifiers-from-headword-and-reading
  - project/decision-log.md#dec-022--a-homograph-cards-review-status-does-not-depend-on-how-its-reading-was-resolved
touches:
  - pipeline/ (the matching/resolution/override module and its tests)
  - data/overrides/ (the mechanism only — no real override content yet)
review_required: [Black]
---

# WO-007 — HSK matching, homograph resolution, and overrides

## Context

Three of M1's pieces now exist independently: WO-004 parses CC-CEDICT into
`CedictEntry[]`; WO-003 pinned the HSK 2.0 level mapping
(`data/source/hsk/hsk-{1..6}.json`, with an exact extraction spec Red wrote for
you in `data/source/hsk/SOURCE.md` §6); WO-005 built the numbered→diacritic
Pinyin converter (`pipeline/pinyin.ts`). This work order is stages 3–6 of the
pipeline ([data-pipeline](../../engineering/data-pipeline.md) §2): build a
headword index, match the HSK mapping against it, resolve homographs and
cross-references and absent words, apply any committed overrides, and produce
fully-populated `Card` objects ([domain-model](../../engineering/domain-model.md)
§3). **Output is in-memory `Card[]` per level.** Writing `public/decks/*.json`,
enforcing invariants, and failing the build on violations is
[WO-008](WO-004-cc-cedict-parser.md), not this one — matching the pattern that
worked well for WO-004/WO-005: a pure function first, integration later.

## Task

1. **Extract the HSK mapping** per `data/source/hsk/SOURCE.md` §6's spec
   exactly: one `(headword, level, readingNumeric)` row per form. Apply the
   `ü`/`u:` fold documented in SOURCE.md §5.1 so it compares correctly against
   CC-CEDICT's own `u:` convention, and treat a trailing bare `er` as
   equivalent to `r5` per SOURCE.md §5.2 (the one known inconsistent entry,
   纽扣儿).
2. **Build a headword → `CedictEntry[]` index** from WO-004's parsed entries
   (stage 3).
3. **Match** each HSK mapping row against the index (stage 4):
   - If the row supplies a reading, match on headword **and** reading
     ([data-pipeline](../../engineering/data-pipeline.md) §5.2 rule 1).
   - If no entry matches even after normalisation retries (whitespace,
     variant characters, punctuation — §5.3), record it as unmatched in a
     structured way WO-008 can turn into a build-failing report. Do not throw
     or abort the whole run for one unmatched word.
4. **Resolve homographs** per §5.2: if a headword has multiple CC-CEDICT
   readings and the source list didn't disambiguate, emit **all** of them as
   separate cards sharing a `homographGroup`
   ([domain-model](../../engineering/domain-model.md) §4,
   [DEC-004](../../project/decision-log.md)). Never merge senses across
   readings. **Every homograph-derived card gets `review: 'unreviewed'`
   regardless of which path resolved it**
   ([DEC-022](../../project/decision-log.md)) — this is a fixed rule from a
   prior decision, not a judgement call.
5. **Resolve cross-reference-only entries** per §5.1: if a matched entry's
   only senses are cross-reference pointers, follow the reference (via your
   own headword index) and adopt the target's senses, recording
   `source: 'cc-cedict+override'`. **Note from WO-004's report**: the parser
   normalises cross-reference senses to plain text with the reading stripped,
   so you cannot recover the target's reading from the sense string — re-derive
   the target via the index, not by re-parsing the sense. If a reference can't
   be resolved, record it for Red's attention; do not invent a gloss yourself.
6. **Apply overrides** from `data/overrides/*.json`, keyed by `Card.id`
   ([data-pipeline](../../engineering/data-pipeline.md) §6), after
   matching/resolution. There is no real override content yet — Red hasn't
   reviewed anything (that's WO-009, downstream of WO-008). Build the
   mechanism and prove it with a synthetic fixture; do not author or apply any
   real content correction yourself.
7. **Compute `Card.id`** exactly per
   [domain-model](../../engineering/domain-model.md) §5:
   `<headword>:<readingNumeric normalised>`, normalisation = lowercase, spaces
   removed, `u:` folded to `v`.
8. **Populate `Card.reading`** by calling `numberedToDiacritic` from
   `pipeline/pinyin.ts` (WO-005) on the card's `readingNumeric`. Do not
   reimplement or duplicate that logic.
9. **Populate every other `Card` field** per
   [domain-model](../../engineering/domain-model.md) §3: `headword`,
   `headwordTraditional` (only when it differs from the simplified headword),
   `senses`, `classifiers`, `levels`, `homographGroup` where applicable,
   `source`, `review`.

## Acceptance criteria

1. HSK mapping extraction matches SOURCE.md §6's spec exactly, including the
   ü/`u:` fold and the `er`/`r5` equivalence.
2. A headword → `CedictEntry[]` index is built and used for matching.
3. A source-supplied-reading match resolves to the correct single card.
4. An ambiguous headword (no source reading, multiple CC-CEDICT readings)
   emits all readings as separate cards sharing one `homographGroup`, with
   senses never merged across readings.
5. A test proves a **source-supplied-reading match still gets
   `review: 'unreviewed'`** — not pre-approved — per DEC-022. This must be an
   explicit, named test, not incidental coverage.
6. At least one real cross-reference-only entry (e.g. a `variant of …` case
   from WO-004's fixtures) resolves to its target's senses, recorded with
   `source: 'cc-cedict+override'`.
7. An unresolvable cross-reference and an unmatched HSK word are both handled
   without crashing the run, and both are recorded in a structured form WO-008
   can consume — never silently dropped.
8. The override mechanism is proven with a synthetic fixture override that
   visibly changes a card's output; no real override content is authored.
9. `Card.id` is computed exactly per DEC-005, including the `u:`→`v` fold, and
   two different readings of the same headword produce two different ids.
10. `Card.reading` is populated via `pipeline/pinyin.ts`'s
    `numberedToDiacritic`, not a reimplementation.
11. The real 行 homograph triple (hang2/heng2/xing2, present in WO-004's
    fixtures) produces three distinct cards, distinct ids, un-merged senses.
12. Classifiers carry through from `CedictEntry` to `Card` unchanged.
13. Output is `Card[]` grouped or keyed by level, in a shape WO-008 can
    directly consume to emit six deck files.
14. No file I/O beyond reading the already-committed source files — pure
    matching/resolution/override logic, with a thin I/O shell, matching the
    WO-004/WO-005 pattern.
15. `npm run typecheck`, `npm run lint`, and `npm test` all remain green with
    this work included.

## Out of scope

- Validating domain-model invariants and failing the build on violation
  (WO-008).
- Writing `public/decks/*.json`, the build report, or the review queue
  (WO-008 — stage 9, "emit").
- Deciding or authoring any real manual override content — Red hasn't
  reviewed anything yet. Your mechanism must work; you don't populate it.
- The pronunciation-annotation-bracket content decision
  ([WO-010](WO-010-pronunciation-annotation-brackets.md), routed to Red) —
  that affects sense-string *shape* when WO-008's gate 4 runs, not matching or
  resolution here. Carry senses through unchanged from WO-004's output.
- Font subsetting (M6, not M1).

## Notes

- Read `docs/workstream/reports/WO-004-report.md` and
  `docs/workstream/reports/WO-005-report.md` in full before starting — both
  document exact input/output shapes and known gotchas you'll need
  (`readingNumeric`'s token shape, the cross-reference-normalisation caveat,
  the `\p{Script=Han}` CJK regex if you need it again).
- Read `data/source/hsk/SOURCE.md` in full — §5 (data-quality notes) and §6
  (extraction spec) were written specifically for this work order.
- Keep this module's core logic as pure functions (data in, `Card[]` out),
  with a thin I/O shell for the real committed files — the same pattern
  WO-004 and WO-005 both used successfully. WO-010 is running in parallel with
  this work order and does not block it.
