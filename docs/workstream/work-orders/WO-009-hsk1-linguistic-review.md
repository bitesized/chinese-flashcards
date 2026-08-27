---
id: WO-009
title: Linguistic review — HSK 1 at 100%
owner: Red
status: Ready
priority: MUST
milestone: M1
requirements: [NFR-14]
depends_on: [WO-008]
spec_refs:
  - engineering/testing-strategy.md#5-linguistic-validation--reds-gate
  - engineering/data-pipeline.md#6-stage-6--overrides
  - project/roadmap.md#m1--data-foundation-next
  - project/decision-log.md#dec-025--ship-hsk-1-first-build-the-app-against-it-add-remaining-levels-incrementally
touches:
  - docs/workstream/reviews/ (the LR record)
  - data/overrides/ (new override files — never edit generated files directly)
review_required: [Red]
---

# WO-009 — Linguistic review: HSK 1 at 100%

## Context

Per [DEC-025](../../project/decision-log.md), M1's gate now requires only HSK 1
to pass Red's full linguistic review before app development (M2) begins —
narrowed from the original HSK 1–3 specifically so the application gets built
against a small, complete, trustworthy slice of vocabulary rather than
waiting on review of the whole ~5,000-word corpus. This is the last thing
blocking M1's gate.

[WO-008](WO-008-validation-gates-build-report.md) has produced a green,
committed build: `public/decks/hsk-1.json` (184 cards), `data/build/report.md`,
and `data/build/review-queue.json`. Every HSK-1 card currently carries
`review: 'unreviewed'` — that is what this work order changes.

**Twelve HSK-1 words currently have no card at all**, recorded honestly as
tracked gaps rather than silently missing or guessed at
([DEC-027](../../project/decision-log.md), `data/overrides/waived-words.json`):
ten are `conflicting-entries` (你, 和, 回, 几, 家, 了, 里, 年, 岁, 喂 — CC-CEDICT
has two or more distinct, substantive entries sharing the identical headword
and reading, and the pipeline correctly refuses to guess which is intended),
and two are `unresolved-cross-reference` (大/dai4 "see 大夫", 那/na3 "variant of
哪"). [WO-008's report](../reports/WO-008-report.md)'s Findings section has the
full detail, including which of the *other* build-report entries are benign
(a word with a correct card already, via a different source-list form) versus
genuine — the twelve above are all genuine gaps at HSK 1.

## Task

**1. Review all 184 cards in `public/decks/hsk-1.json`** against every check
in [testing-strategy](../../engineering/testing-strategy.md) §5: correct,
well-formed Simplified headword; correct reading and tones for that specific
sense (citation form, not tone-sandhi-adjusted); glosses that correspond to
the headword and aren't misleading out of context, ordered sensibly for a
learner; any merged/split/dropped senses defensible; homograph splits correct
(right number of readings, right senses assigned to each); the word genuinely
belongs at HSK 1; any classifier correct. Record a verdict per card —
`approved`, `corrected`, or `flagged` — not a blanket pass.

**2. Adjudicate all twelve currently-unresolved HSK-1 words** named above.
For each: either supply a correction — a manual gloss/reading via an override
with `source: 'manual'` (data-pipeline.md §5.3), or, for a
`conflicting-entries` case, decide which candidate CC-CEDICT entry the HSK
syllabus item actually intends and override accordingly — or make an
explicit, reasoned decision to leave it unresolved for now, stating why. Do
not leave any of the twelve silently un-adjudicated.

**3. Express every correction as a committed override** in
`data/overrides/*.json`, keyed by the card's id (or, for the twelve words
with no card yet, following the same override schema once your correction
gives them an id — coordinate the exact mechanism with what
`pipeline/overrides.ts` already expects if you're unsure; ask Claude Code
rather than guessing at a new schema). Never edit `public/decks/*.json`
directly — it is regenerated and your correction would be silently
discarded.

**4. Write the Linguistic Review record** at
`docs/workstream/reviews/LR-002-hsk1-review.md`, per
[communication-protocol](../../team/communication-protocol.md) §5: per-card
verdicts (or a clear summary structure for the 172+ approved-as-is cards,
with full detail for every `corrected` or `flagged` one and for all twelve
adjudicated gap words), corrections and their rationale, and any homograph
adjudications.

## Acceptance criteria

1. All 184 HSK-1 cards individually reviewed against every check in
   testing-strategy.md §5, with a recorded verdict per card.
2. Every correction is a `data/overrides/*.json` entry — zero direct edits to
   `public/decks/hsk-1.json`.
3. Each of the twelve named gap words is individually adjudicated: a specific
   correction, or an explicit and reasoned decision to leave it unresolved —
   never silently skipped.
4. Any card marked `flagged` is accompanied by a clear statement of what's
   wrong and what needs to happen next — a flag blocks the build
   (testing-strategy.md §3 gate 8) and must not be a dead end.
5. The LR record is committed at `docs/workstream/reviews/LR-002-hsk1-review.md`
   and cites every override file it authorises.
6. A seeded RNG and its seed are recorded if any sampling is used for
   anything in this work order (expected not to be needed — this is 100%
   coverage, not a sample — but state explicitly that no sampling was used
   rather than leaving it ambiguous).

## Out of scope

- HSK 2–6 — their review is resequenced to before M3 (2–3) and M7 (4–6) per
  DEC-025, not this work order.
- Running `npm run build:data` yourself or merging your overrides into
  `main` — Claude Code re-runs the build and verifies your overrides apply
  cleanly once you report back.
- Editing any generated file (`public/decks/*.json`, `data/build/*`) or any
  pipeline code (`pipeline/*.ts`) — if you find what looks like a pipeline
  bug rather than a content question, report it as a finding; Black's code
  is not yours to change (charter.md).
- Recording level-tag corrections in `data/source/hsk/` — that source is
  already pinned and verified (WO-003); a word's HSK-level assignment is
  itself one of the seven checks above, but the fix for a wrong assignment
  is a card-level override or a note back to your own WO-003 ownership, not
  an edit to the pinned source list.

## Notes

- Read [WO-008's report](../reports/WO-008-report.md) in full before
  starting, especially its Findings section — it distinguishes genuine gaps
  from benign duplicate-form artefacts among the build report's "unmatched"
  entries, so you don't spend adjudication effort on words that already have
  a correct card.
- `data/build/review-queue.json` lists every currently-`unreviewed` card —
  useful as a working checklist, though it does not include the twelve words
  with no card at all (task 2 covers those separately).
- Per the owner's 2026-08-25 instruction, you should be dispatched once and
  kept available for this and future Red work, rather than a fresh session
  per work order — if you're being resumed rather than freshly started,
  treat this brief as fully self-contained regardless.
