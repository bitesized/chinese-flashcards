---
id: WO-013
title: Linguistic review — HSK 2 and HSK 3 at 100%
owner: Red
status: Ready
priority: MUST
milestone: M3
requirements: [NFR-14]
depends_on: [WO-009]
spec_refs:
  - engineering/testing-strategy.md#5-linguistic-validation--reds-gate
  - engineering/data-pipeline.md#6-stage-6--overrides
  - project/roadmap.md#m3--level-selection
  - project/decision-log.md#dec-025--ship-hsk-1-first-build-the-app-against-it-add-remaining-levels-incrementally
touches:
  - docs/workstream/reviews/ (the LR record)
  - data/overrides/ (new override files — never edit generated files directly)
review_required: [Red]
---

# WO-013 — Linguistic review: HSK 2 and HSK 3 at 100%

## Context

Per [DEC-025](../../project/decision-log.md), M3 (Level selection) requires
Red's 100% linguistic review of HSK 2 and HSK 3 before either level is
exposed in Level Select — a level becomes reachable only once it has
cleared this bar, same principle as HSK 1's M1 gate
([WO-009](WO-009-hsk1-linguistic-review.md), [LR-002](../reviews/LR-002-hsk1-review.md)).
This is the linguistic half of M3; the UI half (multi-level sessions,
last-level memory) is a separate work order (WO-014) Claude Code is
building directly and does not depend on this one completing first — they
can proceed in parallel, but M3's gate needs both.

Current state, from the latest `npm run build:data`
(`data/build/report.md`):

| Level | Cards | Unreviewed |
| --- | --- | --- |
| 2 | 187 | 187 |
| 3 | 337 | 337 |

**Ten HSK 2/3 words currently have no card at all**, tracked as waived
gaps (`data/overrides/waived-words.json`) rather than silently missing:

- **HSK 2** (5): 打篮球 (unmatched), 千/qian1, 它/ta1, 玩/wan2, 药/yao4 (all
  `conflicting-entries`)
- **HSK 3** (5): 才/cai2, 刚才/gang1cai2, 刮/gua1, 伞/san3, 腿/tui3 (all
  `conflicting-entries`)

The build report also lists five further HSK-3 `conflicting-entries` words
(冬/dong1, 花/hua1, 秋/qiu1, 云/yun2, 只/zhi1) that are **not** in the waived
list — meaning the specific conflicting reading failed to match, but the
level's coverage requirement for that word was apparently satisfied some
other way (a different resolvable sense/reading, most likely). Verify this
is actually true for each rather than assuming it — WO-009 found this
exact "one reading ships, a different one doesn't" pattern to be systemic
at HSK 1, not a coincidence, and it's worth confirming these five are
genuinely fine rather than a second, unflagged gap.

This review is roughly 3x WO-009's size (524 cards vs. 184) — budget
accordingly. WO-009's own findings (systemic homograph-artifact gaps,
surname/bound-form/archaic-register content bundled under common
headwords, the vulgar-content pattern now handled project-wide by DEC-029)
are very likely to recur at this scale; you do not need to re-litigate
policy questions DEC-025 to DEC-029 already settled, but do flag anything
that looks like a genuinely new pattern rather than assuming it's already
covered.

## Task

**1. Review all cards in `public/decks/hsk-2.json` and `public/decks/hsk-3.json`**
against every check in [testing-strategy](../../engineering/testing-strategy.md)
§5: correct, well-formed Simplified headword; correct reading and tones for
that specific sense (citation form); glosses that correspond to the
headword and aren't misleading out of context, ordered sensibly for a
learner; any merged/split/dropped senses defensible; homograph splits
correct; the word genuinely belongs at that HSK level; any classifier
correct. Record a verdict per card — `approved`, `corrected`, or `flagged`.

**2. Adjudicate the ten named gap words** above (five per level). For each:
supply a correction (a manual card via override, `source: 'manual'`,
following the mechanism [DEC-028](../../project/decision-log.md) added —
`pipeline/overrides.ts`'s `synthesizeCardFromOverride` accepts a complete
manual override with no matching existing card), or a `conflicting-entries`
adjudication deciding which CC-CEDICT candidate the HSK item intends, or an
explicit, reasoned decision to leave it unresolved. Do not leave any of the
ten silently un-adjudicated.

**3. Verify the five unflagged HSK-3 `conflicting-entries` words**
(冬, 花, 秋, 云, 只) named in Context — confirm each word's HSK-3 coverage
requirement is genuinely satisfied by a different, correct card already in
the deck, not accidentally gapped. If any turns out to actually be a gap,
adjudicate it the same way as task 2.

**4. Express every correction as a committed override** in
`data/overrides/*.json`, keyed by the card's id. Never edit
`public/decks/hsk-2.json`/`hsk-3.json` directly.

**5. Write the Linguistic Review record** at
`docs/workstream/reviews/LR-004-hsk2-3-review.md`, per
[communication-protocol](../../team/communication-protocol.md) §5:
per-card verdicts (a clear summary structure for the bulk of
approved-as-is cards is fine, same as LR-002's approach — full detail is
for every `corrected`/`flagged` card and the ten-plus-five adjudicated
words), corrections and rationale, and any homograph adjudications.

## Acceptance criteria

1. All cards in both `public/decks/hsk-2.json` and `hsk-3.json`
   individually reviewed against every check in testing-strategy.md §5,
   with a recorded verdict per card.
2. Every correction is a `data/overrides/*.json` entry — zero direct edits
   to either deck file.
3. Each of the ten named gap words is individually adjudicated: a specific
   correction, or an explicit and reasoned decision to leave it unresolved
   — never silently skipped.
4. The five unflagged HSK-3 conflicting-entries words are individually
   confirmed genuinely non-gapped, or adjudicated if they turn out not to
   be.
5. Any card marked `flagged` is accompanied by a clear statement of what's
   wrong and what needs to happen next.
6. The LR record is committed at `docs/workstream/reviews/LR-004-hsk2-3-review.md`
   and cites every override file it authorises.
7. A seeded RNG and its seed are recorded if any sampling is used;
   otherwise state explicitly that no sampling was used (this is 100%
   coverage, not a sample).

## Out of scope

- HSK 1 (already done, [LR-002](../reviews/LR-002-hsk1-review.md)) and
  HSK 4–6 (sampled review before M7, per DEC-025 — not this work order).
- Running `npm run build:data` yourself or merging your overrides into
  `main` — Claude Code re-runs the build and verifies your overrides apply
  cleanly once you report back.
- Editing any generated file (`public/decks/*.json`, `data/build/*`) or any
  pipeline code (`pipeline/*.ts`) — report a suspected pipeline bug as a
  finding rather than fixing it yourself (charter.md).
- Recording level-tag corrections in `data/source/hsk/` — a word's
  HSK-level assignment is one of the seven checks above, but the fix is a
  card-level override or a note back to WO-003's ownership, not an edit to
  the pinned source list.
- Any UI or session work (WO-014's job, not yours).

## Notes

- Read [LR-002](../reviews/LR-002-hsk1-review.md) and
  [WO-009's report](../reports/WO-009-report.md) in full before starting —
  the mechanisms you'll use (manual card synthesis, exclusion, waiver
  removal) were built specifically in response to that review's findings,
  and its systemic-pattern observations (Findings #3 especially) are very
  likely to recur here at larger scale.
- `data/build/review-queue.json` lists every currently-`unreviewed` card as
  a working checklist.
- Per the owner's 2026-08-25 instruction, you should be resumed in your
  existing session rather than started fresh — if you are being resumed,
  treat this brief as fully self-contained regardless of what you were
  doing before.
