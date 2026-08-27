---
id: LR-###
reviewer: Red
scope: <e.g. HSK 3, full — 300 cards>
sampling: full | random
seed: <RNG seed, required when sampling — makes the review reproducible>
deck_build: <dictionaryVersion + wordListVersion from DeckMeta>
date: YYYY-MM-DD
verdict: approved | approved with corrections | blocked
---

# LR-### — <scope>

## Method

What was checked, against what, and how cards were selected. If sampled, the seed
above must reproduce the same selection.

## Summary

| Verdict | Count |
| --- | --- |
| Approved as generated | |
| Corrected via override | |
| Flagged — must not ship | |
| Escalated to owner | |

## Corrections

One row per card. These become override entries
([data-pipeline](../../engineering/data-pipeline.md) §6) — Red never edits
generated files.

| Card id | Field | Generated | Corrected to | Rationale |
| --- | --- | --- | --- | --- |
| 行:hang2 | senses | … | … | … |

## Flagged

Cards that must not ship, and why. The data build enforces this mechanically
([testing-strategy](../../engineering/testing-strategy.md) §3.8).

## Homograph adjudications

| Group | Readings found | Readings kept | Rationale |
| --- | --- | --- | --- |

## Escalations

Disputes or judgement calls for the project owner
([charter](../../team/charter.md) §4.7).

## Observations

Patterns worth acting on beyond the individual corrections — a systematic parsing
error, a recurring gloss problem, a weakness in the source word list.
