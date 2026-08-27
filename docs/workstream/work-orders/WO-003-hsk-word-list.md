---
id: WO-003
title: Select and pin the HSK 2.0 word list; own it thereafter
owner: Red
status: Ready
priority: MUST
milestone: M1
requirements: [FR-20, FR-21, FR-22]
depends_on: []
spec_refs:
  - engineering/data-pipeline.md#4-stage-1--4--the-hsk-word-lists
  - engineering/domain-model.md#9-scale
  - project/decision-log.md#dec-017--hsk-level-assignment-comes-from-the-official-syllabus-taken-as-a-level-tag-only
touches:
  - data/source/hsk/
review_required: [Red]
---

# WO-003 — Select and pin the HSK 2.0 word list

## Context

The application divides vocabulary into six HSK levels (CLAUDE.md §02). Something
must say which level each word belongs to, and that mapping has to come from
somewhere trustworthy.

[DEC-017](../../project/decision-log.md) settles the shape of the answer: the
mapping derives from the official HSK 2.0 syllabus (汉语水平考试词汇大纲) and is taken
as a **level tag only** — one fact per word, which level it is in. Every piece of
content a learner sees comes from CC-CEDICT, per CLAUDE.md §02. No text from the
word list is shipped.

What DEC-017 deliberately does not settle is *which* published list to use, because
that is a judgement about Chinese-language accuracy. That judgement is yours, and
the project owner has assigned you ongoing ownership of it.

This work order is on the critical path. Everything in M1 downstream of the word
list waits on it.

## Task

Select a machine-readable HSK 2.0 word list, verify it, and pin it.

**1. Identify candidates.** Publicly available HSK 2.0 lists in a parseable format.
Note for each: where it came from, whether it states a licence, what format it is
in, and — most importantly — **whether it carries Pinyin per word**.

**2. Prefer a list with Pinyin.** This is the single most valuable property
available. Without readings, homograph matching cannot be resolved automatically
and every ambiguous word falls to manual review
([RISK-3](../../project/risk-register.md)). The list's Pinyin is used as a
build-time matching key and then discarded; it is never shipped.

**3. Verify against the syllabus.** For your recommended list, confirm:
- it is **HSK 2.0** (six levels, ~5,000 words), not HSK 3.0 / the 2021 nine-band
  standard — these are different syllabi and using the wrong one would silently
  produce the wrong product;
- per-level counts are approximately 150 / 150 / 300 / 600 / 1300 / 2500
  ([domain-model](../../engineering/domain-model.md) §9). Flag any material
  deviation — it usually indicates a truncated or conflated file;
- entries are Simplified ([DEC-010](../../project/decision-log.md));
- cumulative levels are handled correctly, i.e. you know whether level N contains
  only its new words or everything up to N, and you say which;
- spot-check a sample against your own knowledge of the syllabus for words that are
  obviously misplaced.

**4. Record provenance.** Write `data/source/hsk/SOURCE.md`: origin and URL,
retrieval date, which HSK standard it claims to follow, stated licence if any,
format, checksum, and your assessment.

**5. Reduce to the mapping.** Specify the exact two- or three-column form Black's
pipeline should consume: simplified headword, level, and reading where available.
Nothing else.

**6. Flag anything encumbered.** If your preferred candidate carries terms that
cannot be satisfied even after the level-tag-only reduction in DEC-017, do not use
it — take the next candidate. The mapping is the same facts either way, which is
why this does not block. Only escalate if *every* candidate is encumbered, which
would be a genuine licensing matter ([charter](../../team/charter.md) §4.2).

## Acceptance criteria

1. At least three candidate lists assessed, with the properties in step 1 recorded
   for each.
2. One list recommended, with the reasoning stated — including whether it carries
   Pinyin and, if not, why the alternatives were worse.
3. All five checks in step 3 performed and their results recorded, including
   per-level counts as actually found.
4. `data/source/hsk/SOURCE.md` written and complete.
5. The mapping format specified precisely enough for Black to write a parser
   against it without asking a follow-up question.
6. Cumulative-versus-new-words semantics stated explicitly and unambiguously.
7. Any word in the list that you believe is misassigned is listed, with your
   correction.

## Out of scope

- Writing any pipeline code. Black implements; you specify and verify.
- CC-CEDICT itself — that is WO-002.
- Reviewing card content. That is WO-009, after decks are compiled.
- Choosing between HSK 2.0 and HSK 3.0. CLAUDE.md §02 fixes six levels; that is
  HSK 2.0 and is not open.

## Notes

- You own this area from here on. Later changes to the word list — corrections,
  a better source, a re-pin — come back to you and do not go through the owner.
- The list is committed and pinned by checksum. The build must be reproducible
  offline from a clean checkout years from now, so do not rely on a URL staying
  live ([data-pipeline](../../engineering/data-pipeline.md) §10).
- If the chosen list carries Pinyin in a different transcription convention from
  CC-CEDICT's numbered form, say so — Black needs to normalise before matching.
