---
id: WO-008
title: Validation gates, deck emission, and build report
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [FR-22, NFR-14]
depends_on: [WO-007, WO-010]
spec_refs:
  - engineering/data-pipeline.md#8-stage-8--validation
  - engineering/data-pipeline.md#9-stage-9--outputs
  - engineering/domain-model.md#3-card-schema
  - engineering/domain-model.md#6-deck-schema
  - engineering/domain-model.md#9-scale
  - engineering/testing-strategy.md#3-content-correctness-gates--automated
  - workstream/reviews/LR-001-pronunciation-annotation-brackets.md
touches:
  - pipeline/ (validation + emission module, `npm run build:data` entry point)
  - public/decks/ (six committed deck JSON files, generated)
  - data/build/ (build report, review queue, generated)
review_required: [Black]
---

# WO-008 — Validation gates, deck emission, and build report

## Context

WO-007 produces in-memory `Card[]` per level from CC-CEDICT, the HSK mapping,
homograph resolution, and overrides. This work order is the pipeline's final
two stages ([data-pipeline](../../engineering/data-pipeline.md) §2): **stage 8,
validate** (fail the build on any invariant violation — this is the gate that
makes content correctness a build property, not a hope) and **stage 9, emit**
(six deck JSON files, the build report, the review queue — all committed, so a
content change is visible in a diff). It is also where
[LR-001](../reviews/LR-001-pronunciation-annotation-brackets.md) — Red's ruling
on CC-CEDICT's pronunciation-annotation bracket family, routed here from
WO-004/WO-010 — actually gets implemented; WO-007 deliberately left sense text
untouched for this reason.

This is the milestone gate for M1. [Roadmap](../../project/roadmap.md) M1's
gate criteria 1–4 are checked directly against this work order's output:
`npm run build:data` succeeds from a clean checkout with no network access,
building twice is byte-identical, every gate in testing-strategy §3 passes,
and there are zero unmatched HSK words that aren't explicitly waived.

## Task

**1. Implement [LR-001](../reviews/LR-001-pronunciation-annotation-brackets.md)'s
sense-transformation rules** against the `Card[]` from WO-007, before running
any validation gate: the Mandarin-annotation-bracket conversion (§1.1–§1.3),
the one cross-reference-leak override (§2, `variant of 冈 [gang1]` →
`variant of 冈`), and the two square-bracket-punctuation overrides (§3). LR-001
also specifies a fail-loud rule (§1.4) for anything a future CC-CEDICT update
introduces that isn't covered — implement that as a thrown error, not a
silent pass-through.

**2. Implement every gate in
[testing-strategy](../../engineering/testing-strategy.md) §3** against the
transformed `Card[]`, each failing the build (not warning) on violation:
round-trip Pinyin (reuse `pinyinRoundTripsCleanly` from `pipeline/pinyin.ts`,
WO-005 — do not reimplement), id uniqueness, non-empty senses, no leaked
`CL:`/`[`/`]`/`|` (this is the gate LR-001's transform exists to satisfy —
confirm it actually does, across the full real corpus, not just fixtures),
headword sanity (CJK present, no Latin letters — reuse the `\p{Script=Han}`
approach from `pipeline/cedict.ts`, WO-004), level coverage (every HSK-list
word resolves to a card or is explicitly waived — WO-007's unmatched-word
output feeds this), count tolerance against
[domain-model](../../engineering/domain-model.md) §9, nothing `flagged`
(there is nothing to flag yet at M1 — this gate exists for later, but must be
wired now), and determinism (building twice from the same inputs produces
byte-identical output — prove this, don't just assert it).

**3. Emit six deck files**, `public/decks/hsk-{1..6}.json`, matching the
`Deck` schema in [domain-model](../../engineering/domain-model.md) §6 exactly,
including a fully-populated `DeckMeta` (`cardCount`, `dictionaryVersion` and
`wordListVersion` — both must be real, traceable values, not placeholders;
`builtAt`; `reviewSummary`, a count per `ReviewStatus`).

**4. Write the build report** to `data/build/report.md`
([data-pipeline](../../engineering/data-pipeline.md) §9): unmatched words (by
level), homograph groups awaiting review, applied and orphaned overrides
(there are none of either yet beyond LR-001's — say so plainly rather than
omitting an empty section), per-level counts, and source versions
(`dictionaryVersion`, `wordListVersion`).

**5. Write the review queue** to `data/build/review-queue.json`
([data-pipeline](../../engineering/data-pipeline.md) §9): every card with
`review: 'unreviewed'`. Given DEC-022, this includes every homograph-derived
card regardless of match path — expect this to be a substantial list. This
file is what WO-009 (Red's HSK 1–3 review) will work from.

**6. Wire `npm run build:data`** as the single command running the full
pipeline end to end (stages 1–9): acquire (already-pinned files, no network),
parse (WO-004), index/match/resolve/override (WO-007), transform (WO-005 +
this work order's LR-001 implementation), validate (this work order), emit
(this work order). Running it twice from a clean checkout must produce
byte-identical `public/decks/*.json` — this is the determinism gate and also
roadmap M1's gate criterion 2.

## Acceptance criteria

1. LR-001's Mandarin-annotation conversion is applied and produces zero
   leaked `[`/`]` from that family across the full real corpus (not a
   fixture subset).
2. LR-001's cross-reference-leak override (`岗`/`variant of 冈 [gang1]`) and
   both square-bracket-punctuation overrides are applied correctly.
3. LR-001's fail-loud rule (§1.4) is implemented: an annotation bracket that
   doesn't match any known rule throws, it doesn't silently pass through.
4. Round-trip Pinyin gate passes across the full corpus using
   `pinyinRoundTripsCleanly` (WO-005), not a reimplementation.
5. No duplicate `Card.id` anywhere across all six decks combined.
6. No card ships with zero senses.
7. No shipped sense contains `CL:`, `[`, `]`, or `|`, verified across the
   full corpus after LR-001's transform (not just DEC-023's).
8. Every headword contains a CJK ideograph and no Latin letters.
9. Every word in the pinned HSK source list resolves to a card or is recorded
   as an explicit, named waiver — none silently missing.
10. Per-level card counts are within tolerance of
    [domain-model](../../engineering/domain-model.md) §9's expected figures.
11. `npm run build:data` run twice from a clean checkout (no `node_modules`
    persisted between runs is not required, but no stale build output should
    be) produces byte-identical `public/decks/*.json` files.
12. `npm run build:data` succeeds with no network access (simulate this —
    e.g. temporarily block outbound requests or confirm no fetch/network API
    is called anywhere in the pipeline).
13. Six deck files are written to `public/decks/`, matching the `Deck` schema
    exactly, with `DeckMeta` fully and correctly populated.
14. `data/build/report.md` is written and contains all five required
    sections (unmatched words, homograph groups, overrides applied/orphaned,
    per-level counts, source versions), with empty sections stated plainly
    rather than omitted.
15. `data/build/review-queue.json` is written and contains every
    `review: 'unreviewed'` card.
16. A card whose only defect is being homograph-derived (per DEC-022) is
    NOT flagged or excluded — it ships as `unreviewed`, which is correct at
    this stage; only `flagged` cards are build-blocking.
17. `npm run typecheck`, `npm run lint`, and `npm test` all remain green.

## Out of scope

- Any of Red's actual card-by-card linguistic review (WO-009) — this work
  order makes the review queue exist; it does not populate `approved` or
  `corrected` statuses.
- Font subsetting (M6, not M1) — `public/fonts/` is untouched by this work
  order.
- Deciding new content overrides beyond LR-001's four already-ruled cases —
  if this work order's implementer finds a *new* content ambiguity while
  wiring gates against real data, that is a new finding to report, not
  something to decide unilaterally (the same boundary WO-004 correctly
  respected for the pronunciation-annotation family).
- CI wiring beyond what WO-001 already stubbed — this work order fills in
  the "data build" slot WO-001 left commented, it doesn't redesign CI.

## Notes

- Read `docs/workstream/reports/WO-007-report.md` in full before starting —
  it documents `Card[]`'s exact shape as WO-007 actually produced it, and any
  findings from matching/resolution that affect validation design.
- Read [LR-001](../reviews/LR-001-pronunciation-annotation-brackets.md) in
  full — it is written at the level of exact regexes and worked examples
  specifically so it can be implemented without a follow-up question.
- Determinism (criterion 11) is the gate most likely to fail silently if
  anything in the pipeline touches wall-clock time, object-key iteration
  order, or an unseeded random source anywhere upstream — check WO-007's
  homograph-emission order and this work order's own report-writing for
  either.
