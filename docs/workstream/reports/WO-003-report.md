---
id: WO-003
agent: Red
outcome: complete
date: 2026-08-24
---

# WO-003 — Work Report

## What was done

Selected, verified, and pinned an HSK 2.0 word list per DEC-017. Four candidates
were assessed (one more than the acceptance-criterion minimum of three); one is
recommended and pinned.

**Recommended and pinned:** `drkameleon/complete-hsk-vocabulary`
(`wordlists/exclusive/old/{1..6}.json`, commit `7ac65bf1a6387d35f1ade478906172a19311c7f9`,
MIT licence). Committed to `data/source/hsk/hsk-1.json` … `hsk-6.json`, unmodified
from upstream, with checksums recorded.

Full candidate comparison, verification results, data-quality notes, and the
exact extraction spec for Black are all in
`data/source/hsk/SOURCE.md` — that document is the primary deliverable of this
work order; this report summarises it against the acceptance criteria and does
not repeat its content in full.

**Done differently from the brief:** none materially. I verified the list
programmatically (Python over the raw JSON) rather than by eye alone, which let
me check all 4,991 headwords for non-Han content and cross-level duplication
rather than sampling — a stronger check than the brief required, offered because
it was cheap given machine-readable input.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | At least three candidates assessed, properties recorded | yes | SOURCE.md §1 — four candidates: drkameleon/complete-hsk-vocabulary, clem109/hsk-vocabulary, glxxyz/hskhsk.com, plaktos/hsk_csv |
| 2 | One list recommended, reasoning stated, Pinyin status addressed | yes | SOURCE.md §1 recommendation paragraph and §2 |
| 3 | All five checks in step 3 performed and recorded, including actual per-level counts | yes | SOURCE.md §4, items 1–5. Counts found: 150/147/298/598/1,298/2,500 against expected 150/150/300/600/1,300/2,500 |
| 4 | `data/source/hsk/SOURCE.md` written and complete | yes | `data/source/hsk/SOURCE.md` |
| 5 | Mapping format specified precisely enough for Black to parse without a follow-up | yes | SOURCE.md §6 ("Extraction spec for Black") — exact column list, exact source fields, exact discard list, exact per-form flattening rule |
| 6 | Cumulative-vs-new-words semantics stated explicitly | yes | SOURCE.md §3 — `exclusive` (new-words-only) is pinned and the reason is stated; `inclusive` variant exists upstream if ever needed and is not what's committed |
| 7 | Any misassigned word listed, with correction | yes (vacuous) | SOURCE.md §4 item 5 — spot-checked HSK 1 in full (150/150 words) plus 40-word samples at HSK 3 and HSK 6 against my own knowledge of the syllabus; no misassignment found in the samples checked. I did not hand-check all 4,991 entries — noted as impractical and covered instead by count-tolerance plus per-card review in WO-009 |

## Not done

- **Exhaustive (all-4,991-word) manual verification against the syllabus.**
  Acceptance criterion 3's fifth check asks for a spot-check, which is what was
  done (150 words in full + two 40-word samples). A full hand check of every
  entry is not what a spot-check is, would take days, and duplicates work that
  100% HSK 1–3 review and per-level count tolerance already do downstream
  (testing-strategy.md §5, §3.7). Flagged here rather than silently scoped down.
- **Pinning the `inclusive` (cumulative) variant.** Deliberately not committed —
  see SOURCE.md §3. Only `exclusive` is needed for `Card.levels`; `inclusive` is
  a derivable computation if ever wanted later, not a second source to maintain.

## Findings

1. **Transcription-convention mismatch with CC-CEDICT (needs normalisation, not
   escalation).** The pinned list's `numeric` Pinyin field writes ü as the
   literal character with a trailing tone digit (`lü4`), not CC-CEDICT's `u:`
   colon convention (`lu:4`). Capitalisation and tone-digit conventions
   otherwise match CC-CEDICT exactly. Full detail and the recommended fold (both
   sides to `v` before comparing) in SOURCE.md §5.1.

2. **One inconsistent erhua entry.** `纽扣儿` in `hsk-6.json` is written
   `niu3 kou4 er` (bare `er`, no digit) instead of the expected `niu3 kou4 r5`.
   Checked programmatically across all six files; it is the only such case.
   SOURCE.md §5.2 gives the specific fix (treat trailing `er` and `r5` as
   equivalent) and the fallback if a match still fails.

3. **A polyphonic headword's bundled readings are not all necessarily HSK-level-
   intended — this is a review-process point, not a source defect.** The source
   nests every reading it knows for a character under one entry. Example: 都 in
   `hsk-1.json` carries three forms — `dōu` ("all", plainly the real HSK 1 item),
   `dū` ("capital city"), and `Dū` ("surname Du"). The surname sense is almost
   certainly not part of the official 150-word HSK 1 syllabus item; the source
   appears to enrich the headword with every known pronunciation of the
   character rather than only the pronunciation the syllabus intended. I found
   the same pattern on 还 at HSK 2 (`hái`/`huán` plus a `Huán` surname form).

   This does not change the level tag (都 does belong somewhere in HSK 1, which
   is all DEC-017 takes), but it means a reading the source list supplies and
   that successfully auto-matches against CC-CEDICT must **not** be treated as
   pre-approved — it needs the same review as any other homograph-derived card.
   I could not confirm from the spec documents alone whether the pipeline's
   matcher treats a source-supplied-reading match as skipping or short-cutting
   review. **This is the one thing in this work order I'd ask Claude Code to
   confirm with Black before HSK 1–2 cards are built**: that `review` starts
   `'unreviewed'` regardless of whether the match came from an explicit source
   reading or fell through to the ambiguous-homograph path. If it already does,
   no action needed — the existing 100% HSK 1–3 review coverage catches this
   correctly either way. Full detail in SOURCE.md §5.3.

4. **Upstream provenance beyond this repository is thin.** The pinned repo
   credits its old-HSK-2.0 data to `clem109/hsk-vocabulary`, which credits
   `gigacool/hanyu-shuiping-kaoshi`, which states no specific edition year or
   original document. I did not treat this as blocking — I independently
   verified content and counts against the syllabus rather than relying on the
   provenance chain (SOURCE.md §4) — but it's recorded honestly rather than
   overstated. This is a licensing/provenance nuance, not the "every candidate
   is encumbered" scenario in WO-003 step 6 / charter §4.2, so it does not
   escalate.

## Follow-ups proposed

- Confirm with Black (per Finding 3) whether source-supplied-reading matches
  bypass or short-cut review status. If they do, that's a one-line pipeline fix
  before any HSK 1–3 content is built, not after.
- When WO-009 (card content review) reaches HSK 1–2, I will specifically check
  the surname/rare-reading pattern described in Finding 3 rather than assuming
  the level tag implies every bundled reading belongs.
