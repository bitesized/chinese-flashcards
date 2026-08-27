---
id: WO-013
agent: Red
outcome: complete
date: 2026-08-25
---

> **Integration update, Claude Code, 2026-08-25**: rebuilding with these
> overrides applied surfaced the same gap WO-009/LR-002 had — the 443
> "approved as generated" cards (defined mechanically in LR-004's Summary
> rather than enumerated) need an actual `review: 'approved'` override to
> take effect; nothing marks a card approved just because a review happened
> "around" it. Generated `data/overrides/lr-004-hsk2-3-approved.json`
> mechanically (every HSK-2/HSK-3 card id left `unreviewed` after the other
> three override files apply), following LR-002's approved-file precedent
> exactly. Count matched Red's own figure exactly (443) before I'd looked at
> it, confirming the mechanical definition and my derivation agree. Also
> fixed, in the same pass ([DEC-034](../../project/decision-log.md)): the
> `只:zhi3`/`只:zhi1` homograph-linking gap Red's Findings #1 identified —
> `homographGroup` is now recomputed from scratch over the final card set
> rather than only ever cleared, so a newly-synthesized card sharing a
> headword with an existing one is linked automatically; no override schema
> change needed after all. Rebuilt and verified: HSK 1/2/3 all close at
> `unreviewed: 0, flagged: 0` (154/155/310 cards respectively), manifest
> shows all three `reviewed: true`, and a real (not simulated) combined
> HSK 1+2+3 session in a real browser produced a correct 619-card queue
> (154+155+310, no unexpected overlap). **M3's content-review prerequisite
> is met.** Full test suite green (368 tests). Red's own work needed no
> correction — this integration gap is structurally the same one WO-009 hit,
> not a defect in this review.

# WO-013 — Work Report

## What was done

Performed a full, 100%-coverage linguistic review of all 524 cards across
`public/decks/hsk-2.json` (187) and `public/decks/hsk-3.json` (337) against
every check in [testing-strategy.md](../../engineering/testing-strategy.md)
§5, individually adjudicated all ten HSK-2/3 words named in the work order as
having no card at all, verified the five named `conflicting-entries` words
WO-013 believed were already correctly covered by a different resolved
reading, and — going beyond the work order's explicit scope, per its own
instruction to "flag anything that looks like a genuinely new pattern" — ran
a full-deck scan that found a sixth masked gap (向, HSK-2) the work order did
not name. Full method, per-card verdicts, rationale, and homograph
adjudications are in [LR-004](../reviews/LR-004-hsk2-3-review.md), which this
report summarises against the work order's acceptance criteria.

Four override files were authored or updated, none of which edit any
generated file directly:

- `data/overrides/lr-004-hsk2-3-corrections.json` — 7 entries, content
  corrections to existing, otherwise-correct cards (all sense removals —
  vulgar/slang/misleading content found on manual review that DEC-029's
  marker-based filter does not catch; see LR-004 Observations/Escalations).
- `data/overrides/excluded-cards.json` — extended with 74 new entries
  (`excludedBy: "Red"`), added directly alongside the 38 already there from
  LR-002. Unlike LR-002, DEC-028's exclusion mechanism was already live, so
  these are authored as direct, immediately-functional exclusions — no
  interim `flagged`-and-wait step was needed this time.
- `data/overrides/lr-004-hsk2-3-manual-cards.json` — 15 entries, resolving 9
  of the 10 named gap words (千, 它, 玩, 药, 才, 刚才, 刮, 伞, 腿) and all 6
  masked gaps found in the five-word verification task plus the one
  additionally discovered (冬, 花, 秋, 云, 只, 向). The 10th named word
  (打篮球) is adjudicated with an explicit, reasoned decision to escalate
  rather than resolve — detailed in LR-004.
- `data/overrides/waived-words.json` — 15 resolved entries removed (千, 它,
  玩, 药, 才, 刚才, 刮, 伞, 腿, 冬, 花, 秋, 云, 只, 向), per DEC-027. 打篮球's
  entry is kept, with its `detail` field updated to record this review's
  finding and escalation. 累's entry (a harmless, unrelated extraneous
  surname-reading artifact for a word already correctly covered) is
  deliberately left untouched, as it is out of this work order's named scope.

**A correction to the work order's own premise, found during task 3**: WO-013
states that 冬, 花, 秋, 云, and 只 are "not in the waived list." I found all
five (plus 向, not named) were in fact already present in
`waived-words.json` as `conflicting-entries` waivers when this review began —
the work order's text was simply stale relative to the file's actual state.
This did not change what task 3 asked me to do, and the substantive finding is
unaffected: all five (plus 向) turned out to be genuine masked gaps, exactly
the risk task 3 asked me to rule out.

**One departure from a fully mechanical execution, and why**: 打篮球 (HSK-2)
has no CC-CEDICT entry at all (verified directly), unlike every other
adjudication in this review, which chose between existing CC-CEDICT
candidates. Producing a card would require writing English prose not sourced
from any single CC-CEDICT line, which touches DEC-017's content-sourcing
principle (every shipped word comes from CC-CEDICT) closely enough that I
judged it needed the project owner's decision, not mine alone. Escalated in
LR-004 rather than guessed at; the word remains waived.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | All cards in both decks individually reviewed against every check in testing-strategy.md §5, with a recorded verdict per card | yes | [LR-004](../reviews/LR-004-hsk2-3-review.md) — 443 approved (defined precisely as "every id not in Corrections or Excluded", verified against the real deck files), 7 corrected (tabulated with rationale), 74 excluded (tabulated with rationale); 443+7+74=524, the full corpus |
| 2 | Every correction is a `data/overrides/*.json` entry — zero direct edits to either deck file | yes | `lr-004-hsk2-3-corrections.json`, `excluded-cards.json`, `lr-004-hsk2-3-manual-cards.json`, `waived-words.json`; neither `hsk-2.json` nor `hsk-3.json` written to |
| 3 | Each of the ten named gap words individually adjudicated: a specific correction, or an explicit and reasoned decision to leave it unresolved | yes | LR-004's "Gap-word adjudications" — 9 resolved (千,它,玩,药,才,刚才,刮,伞,腿), 1 explicitly escalated with stated reasoning (打篮球) |
| 4 | The five unflagged HSK-3 conflicting-entries words individually confirmed genuinely non-gapped, or adjudicated if not | yes | LR-004 — all five (冬, 花, 秋, 云, 只) found to be genuinely gapped (contrary to the work order's premise — see above) and resolved via manual override; a sixth instance (向, HSK-2) found via the same verification method and resolved too |
| 5 | Any card marked `flagged`/excluded accompanied by a clear statement of what's wrong and what needs to happen next | yes | Every one of the 74 new `excluded-cards.json` entries has a specific `reason`; LR-004's "Excluded" section states the general patterns; nothing needs to "happen next" for these (DEC-028's mechanism handles them without a build-breaking state) |
| 6 | The LR record committed at `docs/workstream/reviews/LR-004-hsk2-3-review.md` and cites every override file it authorises | yes | Committed; cites all four override files by path throughout |
| 7 | A seeded RNG and its seed recorded if sampling used; otherwise state explicitly no sampling was used | yes | LR-004 front matter and Method both state explicitly: no sampling, 100% coverage |

All seven acceptance criteria are met. Outcome: **complete** — unlike WO-009,
nothing in this submission depends on a pipeline mechanism that doesn't exist
yet; DEC-028's card synthesis and exclusion mechanisms were already live and
verified working (LR-002's batch), so every override authored here should
take effect on the next `npm run build:data` with no further engineering work
required.

## Not done

Nothing within WO-013's stated scope was left undone. Explicitly out of scope
and correctly not attempted: running `npm run build:data`, merging anything
into `main`, editing `pipeline/*.ts`, editing `public/decks/*.json` or
`data/build/*`, recording level-tag corrections in `data/source/hsk/`, and any
UI/session work (WO-014). Two items were escalated rather than decided
unilaterally (打篮球's content-sourcing question; the scope of DEC-029's
vulgar-content filter) — both detailed in LR-004's Escalations, not silently
skipped.

## Findings

1. **A new, concrete gap in card-synthesis/override mechanics**:
   `CardOverride` has no way to set `homographGroup`, and this review is the
   first time that has mattered for a genuinely *new* pair rather than a
   *cleared* one — 只:zhi3 (already shipped) and the new 只:zhi1 (this
   review) are a real homograph pair with no way to link them. Recommend
   either an optional `homographGroup` field on `CardOverride`, or having
   `pipeline/build-cards.ts` recompute group membership by headword across
   the final, post-override card set. See LR-004 Findings for detail.
2. **DEC-029's vulgar-content filter has a real, demonstrated coverage gap**:
   it matches only the literal `(vulgar)` string, and this review found two
   cards (比:bi1, 鸟:diao3) carrying the same category of content phrased as
   "euphemistic variant of X"/"variant of X" instead, which the filter
   cannot catch by construction. Not recommending the filter be expanded
   (risk of false-positiving on legitimate content, per DEC-029's own
   verification) — flagging so the owner knows every future level's review
   needs to budget the same manual scanning this one did, per LR-004
   Escalations §2.
3. **The masked-gap pattern (wrong card ships, real word missing, no
   `homographGroup` tag to signal it) is not confined to words a work order
   happens to name.** Found a sixth instance (向) purely from a full-deck
   scan for bare-proper-noun-only cards. Recommend this scan become a
   standing step in every future level's review rather than something
   re-discovered by chance.
4. **This review's exclusion rate (~15%, 81/524 counting both corrections'
   dropped-sense cards loosely and full exclusions) is proportionally similar
   to, slightly lower than, HSK-1's (~21%)** — consistent with, not a
   surprise relative to, WO-009's prediction that this pattern would recur at
   a comparable scale.

## Follow-ups proposed

- A small Black work order (or a note on the board) to close Finding 1
  (`homographGroup` on override/synthesis) before HSK-4–6's sampled review
  (M7) runs into the same case again — it is likely to recur given HSK-4-6's
  much larger corpus.
- The two escalations in LR-004 (打篮球's content-sourcing question; DEC-029's
  filter scope) should reach the project owner before HSK-4–6 review, since
  both are the kind of recurring per-word judgement call that scales badly if
  left unanswered.
- Once Claude Code re-runs `npm run build:data` and confirms these overrides
  apply cleanly, HSK-2 and HSK-3 should close at `unreviewed: 0, flagged: 0`,
  clearing M3's content-review prerequisite ([DEC-025](../../project/decision-log.md)).
