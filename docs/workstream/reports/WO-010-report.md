---
id: WO-010
agent: Red
outcome: complete
date: 2026-08-24
---

# WO-010 — Work Report

## What was done

Branched `wo-010-pronunciation-annotation-brackets` from `main` (WO-010 has no
dependencies; WO-007 is Black's separate in-progress branch and I left its
untracked WIP files — `pipeline/identifiers.ts`, `src/domain/card.ts` — alone).

Read the work order, data-pipeline.md §3 and §4, testing-strategy.md §3 and
§5, decision-log.md's DEC-023, and WO-004's report as directed. Then pulled
the full instance list myself from the pinned corpus
(`loadCedict` from `pipeline/cedict.ts`) rather than working only from the
work order's four examples, filtering every sense containing `[` or `]` that
`SENSE_REFERENCE_PATTERN` does not already consume — 816 pronunciation-annotation
instances plus the 2 square-bracket-punctuation instances, 818 total, matching
the work order's stated count exactly.

Classified all 818 by hand-inspection of the full list (not a sample):

- 747 are genuine Mandarin numbered-Pinyin pronunciation variants ("also pr.",
  "Taiwan pr.", "coll. pr.", "colloquial pr.", "Beijing pr.", "ancient pr.",
  "pronounced", and a few unlabelled instances of the same shape).
- 66 are Tai-lo (Taiwanese Southern Min / Hokkien) romanisation, always inside
  an etymological aside about a Taiwanese-origin word — not Mandarin Pinyin,
  confirmed by inspecting all 66, not just the work order's none-given example.
- 2 are Jyutping (Cantonese romanisation), the case the work order named
  explicitly — both for 波 "ball," a Cantonese loanword from English.
- 3 are a variant Mandarin shape (hyphen-joined tone-sandhi pairs,
  `[yi1mo2-yi1yang4]` and two similar) that breaks the straightforward
  "insert space, call `numberedToDiacritic`" version of the general rule and
  needed one additional algorithm step (split on `-`, convert each side
  independently, rejoin with `-`).
- 1 is not a member of this family at all — a DEC-023-family cross-reference
  (`variant of 冈 [gang1]`) that leaked past the existing normalisation
  because CC-CEDICT wrote a space between the target word and the bracket,
  which `SENSE_REFERENCE_PATTERN` doesn't match (it requires no-space
  adjacency).
- 2 are the square-bracket-punctuation entries (中括号/方括号), ruled on
  separately per the work order's instruction.

Wrote a reference implementation of the proposed transformation as untracked
scratch scripts (not committed — deleted before finishing; the ruling
document's rule table is the actual deliverable) and ran it against **all**
818 instances to verify the rules close cleanly before writing anything down:
zero leaked `[`/`]`, zero orphaned punctuation, zero thrown errors, across
the full corpus, using the pinned `dictionaryVersion 2026-08-23T06:21:07Z`
file — not a sample, not the work order's four examples alone.

Wrote the ruling as `docs/workstream/reviews/LR-001-pronunciation-annotation-brackets.md`,
a Linguistic-Review-style document (per the work order's own suggestion of
this form) adapted for a pre-build content-shape ruling rather than a
per-card review, since no decks or card ids exist yet for this to attach to.
It contains:

1. The core Mandarin-vs-non-Mandarin distinction and why it must be decided
   by explicit label (Jyutping/Tai-lo), not by bracket-content shape — a
   Jyutping token like `bo1` is indistinguishable in shape from valid Pinyin.
2. A precise, regex-level general rule for the non-Mandarin case (drop the
   labelled clause), verified against all 68 real instances with worked
   examples for both Jyutping cases and three representative Tai-lo cases.
3. A precise general rule for the Mandarin case (recover syllable boundaries
   where CC-CEDICT omitted spaces, then call the existing
   `numberedToDiacritic`), with ten worked before/after examples spanning
   single-bracket, multi-bracket-chained, and erhua-bearing instances.
4. The one extension needed for the three hyphenated tone-sandhi-pair
   instances, with all three worked in full.
5. An explicit fail-loud rule for anything a future CC-CEDICT update
   introduces that isn't covered by 1–4, consistent with the pipeline's
   existing "fail the build rather than warn" posture (data-pipeline.md §8).
6. The individual override for the one cross-reference leak (§2), including
   a note to Black that this is a DEC-023 parser gap, not a new content
   family, and that I found no other instance of the same leak shape in the
   corpus (checked, not assumed).
7. The individual override for the two square-bracket-punctuation entries
   (§3), including confirmation that neither headword appears in any of the
   six pinned HSK level files, so under the current word list this override
   is inert but present, as the work order invited me to determine and state.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Definitive ruling for the pronunciation-annotation family, with the Mandarin-numbered-Pinyin case and non-Mandarin-romanisation case addressed separately and explicitly | yes | LR-001 §1.1 (non-Mandarin: Jyutping/Tai-lo, drop-clause rule) and §1.2–§1.3 (Mandarin: convert-to-diacritic rule plus the hyphen extension), with the distinguishing principle stated up front under "The core distinction" |
| 2 | Definitive ruling for the two square-bracket-punctuation entries | yes | LR-001 §3 — reword to `square brackets`, plus the HSK-list-absence finding |
| 3 | Both rulings precise enough for Black to implement without a follow-up linguistic question | yes | Every rule in §1–§3 is given as an exact regex or algorithm step plus worked before/after examples; §1.4 gives an explicit, unambiguous instruction for anything outside the ruled set (fail the build, route to Red) rather than leaving a gap |
| 4 | Any instance resisting a clean general rule is listed individually with a specific call | yes | LR-001 §1.3 (the 3 hyphen instances, with the specific extension needed), §2 (the 1 cross-reference leak, with the specific corrected sense and a note on why it isn't this family), §3 (the 2 punctuation entries, with the specific reworded sense for each) |
| 5 | Committed as a written record, not left only in conversation | yes | `docs/workstream/reviews/LR-001-pronunciation-annotation-brackets.md`, committed on this branch |

## Not done

Nothing outstanding within this work order's scope. All five acceptance
criteria are met. Per the work order's explicit exclusions, I did not
implement the transformation in code (WO-008, Black's), did not re-decide
the ordinary `trad|simp` cross-reference cases (DEC-023, already settled —
though see the Findings note on the one leaked instance, which is a gap in
that existing rule's regex coverage, not a re-decision of the rule itself),
and did not touch classifiers, homographs, or HSK level assignment.

## Findings

- **The 818 figure is exact and fully accounted for**, not approximate.
  Reconciliation: 816 raw pronunciation-annotation-shaped senses = 747
  Mandarin numbered-Pinyin instances (of which 3 are the hyphenated
  tone-sandhi pairs needing LR-001 §1.3's extension — a subset of the 747,
  not additional to it) + 66 Tai-lo + 2 Jyutping (both non-Mandarin,
  drop-clause) + 1 cross-reference leak that is not a member of this family
  at all. 816 + the 2 square-bracket-punctuation entries = 818 overall,
  matching the work order's stated count exactly.
- **A second parser gap, same shape as the one this work order asked me to
  rule on, but belonging to DEC-023 rather than to this family**: the
  `variant of 冈 [gang1]` leak (LR-001 §2). I searched the full corpus for the
  same shape (a recognised cross-reference verb, followed by a space, followed
  by a bracket) and found exactly one instance — not a pattern Black needs to
  worry is widespread, but real and currently still leaking `[`/`]` past
  DEC-023's normalisation.
- **The non-Mandarin romanisation families (Tai-lo, Jyutping) are more
  numerous than the work order's examples suggested** — the work order named
  one Jyutping example and no Tai-lo example at all, but Tai-lo turned out to
  be 66 instances, nearly a tenth of the whole 816-instance family, and
  consistently well-formed (all 66 match one regular pattern with a leading
  comma, verified programmatically rather than assumed). This is worth
  knowing for WO-008: the non-Mandarin carve-out is not a rare edge case,
  it's a real, sizeable, and thankfully very regular chunk of the corpus.

## Follow-ups proposed

- **WO-008 should implement LR-001's rules directly** — the ruling is written
  at the level of exact regexes and algorithm steps specifically so this can
  happen without a round-trip back to me. The one open implementation choice
  (LR-001 §2: widen `SENSE_REFERENCE_PATTERN` to tolerate a single space
  before the bracket, vs. a one-off override) is Black's call, not a
  linguistic one — either produces the same shipped text.
- **The two square-bracket-punctuation overrides (中括号/方括号) should still be
  added to `data/overrides/` once that file exists**, even though neither
  word is in the pinned HSK list today, so the ruling is inert-but-ready
  rather than becoming a fresh question if the word list is ever swapped or
  extended (data-pipeline.md §4 notes this is a one-file change).
- No changes proposed to data-pipeline.md or testing-strategy.md themselves —
  out of my scope to edit — but if data-pipeline.md's §3 table is ever
  revised, its "trad|simp notation" row could usefully cross-reference LR-001
  the same way it already cross-references WO-010, now that the ruling exists
  and is committed.
