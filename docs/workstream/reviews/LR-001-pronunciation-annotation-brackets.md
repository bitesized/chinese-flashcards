---
id: LR-001
reviewer: Red
scope: WO-010 — pre-build content ruling on CC-CEDICT's `[...]` pronunciation-annotation
  and square-bracket-punctuation sense families (not a card review; no decks exist
  yet). 818 sense-instances in the pinned corpus (816 pronunciation-annotation + 2
  square-bracket-punctuation), verified exhaustively against 100% of the pinned
  file, not sampled.
sampling: full — no RNG needed, 818 is the entire population and every instance
  was individually classified
deck_build: cedict_1_0_ts_utf-8_mdbg.txt, dictionaryVersion 2026-08-23T06:21:07Z
  (the file pinned as of WO-002/WO-004)
date: 2026-08-24
verdict: approved with corrections — a general transformation rule, plus five
  named individual overrides, precise enough for Black to implement in WO-008
  without a follow-up question
---

# LR-001 — Pronunciation-annotation and square-bracket-punctuation brackets

## Method

WO-004 (Black) found that CC-CEDICT uses `[...]` for a family of sense
annotations the parser's cross-reference normalisation correctly does not
touch: a bracketed romanised pronunciation with no word directly adjacent to
the bracket. 818 senses in the pinned corpus carry this shape (816) or a
lookalike — two entries whose gloss is literally about square brackets as
punctuation (2). Both leave raw `[`/`]` in parser output, which will fail
testing-strategy.md §3 gate 4 ("no leaked dictionary syntax") once WO-008
wires it up.

I pulled every instance from the pinned file directly (`loadCedict` from
`pipeline/cedict.ts`, filtering senses containing `[` or `]` that
`SENSE_REFERENCE_PATTERN` — the DEC-023 cross-reference normaliser — does not
already consume) rather than working from the work order's four examples,
because the shape of the general rule depends on the full distribution, not a
sample. This found 816 pronunciation-annotation instances, not 818 — the
work order's count of 818 is the sum of this family (816) and the two
square-bracket-punctuation entries, which is exactly what the WO-004 report
also states. I did not find any instances beyond those two totals.

I then wrote a reference implementation of the proposed transformation
(untracked scratch scripts, not committed — this document and its rule table
are the deliverable) and ran it against all 816 instances plus the 2
punctuation entries to verify the general rule actually closes cleanly: no
leaked `[`/`]`, no orphaned punctuation (`()`, dangling commas), no thrown
errors, before writing the rule down. Three instances needed one additional
clause in the general algorithm (hyphen-joined tone-sandhi pairs, part 1.3
below); one instance is a mis-parsed DEC-023-family cross-reference, not a
member of this family at all; two are the punctuation entries. All five are
listed individually per the work order's acceptance criterion 4.

## Summary

| Verdict | Count |
| --- | --- |
| Covered by the general Mandarin-annotation rule (§1.1–§1.3) | 815 |
| Covered by the general non-Mandarin-romanisation rule (§1.2) | 68 (subset of the 815 — see note) |
| Individual override — mis-parsed DEC-023 cross-reference, not this family | 1 |
| Individual override — square-bracket-punctuation entries | 2 |
| **Total** | **818** |

(The 815/68 rows overlap: 815 is every instance in the pronunciation-annotation
family after removing the one cross-reference leak; 68 of those 815 — 66
Tai-lo, 2 Jyutping — are the non-Mandarin subset handled by dropping the
clause rather than converting it. The remaining 747 convert to diacritic
Pinyin.)

## The core distinction

CC-CEDICT senses in this family take one of two forms, and they must be
treated oppositely:

1. **A Mandarin pronunciation variant** — "also pr.", "Taiwan pr.", "coll.
   pr.", "colloquial pr.", "Beijing pr.", "ancient pr.", "pronounced", or an
   unlabelled bracket in the same shape (e.g. `"often written as \"8+9\",
   [ba1 jia1 jiu3]"`). The bracket contains genuine numbered Mandarin Pinyin.
   This is real, useful information for a learner — CLAUDE.md frames Pinyin
   as existing specifically to help with pronunciation, and data-pipeline.md
   §3 already treats register markers as "meaning, not noise, preserve
   verbatim." A pronunciation-variant note is the same kind of content.
   **Rule: convert the bracket to diacritic Pinyin, keep everything else
   verbatim.**

2. **A non-Mandarin romanisation cited for etymology** — Jyutping (Cantonese)
   or Tai-lo (Taiwanese Southern Min / Hokkien), always appearing inside a
   parenthetical explaining a word's dialectal or loanword origin, e.g. `"(from
   Taiwanese 齧書, Tai-lo pr. [khè-su], ...)"`. Feeding this through
   `numberedToDiacritic` would be actively wrong — Tai-lo uses hyphens and
   precomposed vowel diacritics with no tone digits at all, and Jyutping's
   tone-number placement and phoneme inventory differ from Pinyin's, so a
   token that is coincidentally digit-shaped (`bo1`) would silently produce a
   plausible-looking but false Mandarin reading. **Rule: drop the labelled
   clause entirely (the label word, "pr." if present, and the bracket(s));
   keep the rest of the etymological aside, which is real content in its own
   right and contains no brackets.**

The two are told apart by an explicit label, not by the shape of the bracket
content — this matters because Jyutping romanisation can be
letter-plus-digit-shaped exactly like Pinyin (`bo1` is valid-looking as
either). Shape alone cannot distinguish them; the label must be checked
first, before any conversion is attempted.

## 1. Transformation rules — the pronunciation-annotation family (816 → 815 after removing §2's cross-reference leak)

Apply in this order to every sense containing `[`/`]` that survives
`SENSE_REFERENCE_PATTERN` (i.e. the bracket is not directly adjacent to a
bare word — that case is DEC-023's, already handled).

### 1.1 Non-Mandarin romanisation — drop the clause

If the text immediately before a bracket group, within the same sense,
contains (case-insensitive) `Jyutping` or `Tai-lo`, remove the whole clause:
the label, `pr.` if present, and the bracket group(s) (including any
`or`/`,`-chained repeats — see §1.3), plus the comma that introduces it.
Nothing is converted.

Pattern (verified against every one of the 68 real instances — 66 Tai-lo, 2
Jyutping — in the pinned corpus, with no exceptions and no leftover `[`/`]`,
`()`, or dangling punctuation):

```
,\s*(Tai-lo pr\.|Jyutping)\s*(\[[^\]]*](\s*(?:or|,)\s*\[[^\]]*])*)
```
→ delete the entire match.

Worked examples (both Jyutping instances in the pinned corpus, in full):

| Headword | Before | After |
| --- | --- | --- |
| 世界波 | `(soccer slang) spectacular, world-class goal; wonder goal (originally Cantonese: 波 is borrowed from English "ball", Jyutping [bo1])` | `(soccer slang) spectacular, world-class goal; wonder goal (originally Cantonese: 波 is borrowed from English "ball")` |
| 波鞋 | `(dialect) sports shoes; sneakers (originally Cantonese: 波 is borrowed from English "ball", Jyutping [bo1])` | `(dialect) sports shoes; sneakers (originally Cantonese: 波 is borrowed from English "ball")` |

Representative Tai-lo examples (from the 66):

| Headword | Before | After |
| --- | --- | --- |
| K書 | `(Tw) to cram; to study (from Taiwanese 齧書, Tai-lo pr. [khè-su], lit. to gnaw a book, similar to Mandarin 啃书)` | `(Tw) to cram; to study (from Taiwanese 齧書, lit. to gnaw a book, similar to Mandarin 啃书)` |
| A菜 | `(Tw) A-choy, or Taiwanese lettuce (Lactuca sativa var. sativa) (from Taiwanese 萵仔菜, Tai-lo pr. [ue-á-tshài] or [e-á-tshài])` | `(Tw) A-choy, or Taiwanese lettuce (Lactuca sativa var. sativa) (from Taiwanese 萵仔菜)` |
| 下港 | `(Tw) southern Taiwan (from Taiwanese, Tai-lo pr. [ē-káng])` | `(Tw) southern Taiwan (from Taiwanese)` |

**Rationale for dropping rather than keeping the romanisation as plain text:**
keeping `Jyutping bo1` (brackets removed, letters kept) would present a
Cantonese-shaped token in a position and format indistinguishable from a
Mandarin Pinyin annotation to a learner who has no reason to know the
difference — exactly the mis-reading risk the work order flags. The
surrounding etymological prose (loanword origin, dialect source word,
literal meaning) survives untouched and is the part with genuine value to an
English-speaking learner of Mandarin; the specific non-Mandarin phonetic
transcription is not decodable by this app's audience and is safer omitted
than mis-presented.

### 1.2 Mandarin pronunciation variant — convert to diacritic

For any bracket not caught by §1.1: treat the content as numbered Mandarin
Pinyin and convert with the existing `numberedToDiacritic`
(`pipeline/pinyin.ts`, WO-005), then remove the brackets. Two corpus-specific
steps are needed first, because these secondary brackets are less
disciplined than the primary `[...]` reading field:

1. **Recover syllable boundaries.** Unlike the primary reading field (always
   space-separated, data-pipeline.md §3), roughly 15% of these annotation
   brackets concatenate syllables with no space at all — `[si4de5]`,
   `[zhong1pei4]`, `[ga1li3]`. Before calling `numberedToDiacritic`, insert a
   space after every tone digit (`1`–`5`) that is immediately followed by a
   letter: regex `([1-5])(?=[A-Za-z])` → `$1 `. This is a pure
   syllable-boundary recovery step; it does not change any digit or letter.
2. **Multiple bracket groups in one sense**, chained with `,` or `or` (10
   instances — e.g. `"Taiwan pr. [pang2], [bang1], [bang4]"`, `"also pr.
   [ga1 ga5], [ga2 ga5] etc"`), are each converted independently and rejoined
   with their original joining text (`,`, ` or `, trailing `etc`, all
   preserved verbatim).

**Output convention: syllables in the converted result are always
single-space-separated**, regardless of whether the source bracket used a
space — this matches the primary reading field's own convention
(data-pipeline.md §3 rule 7) and removes an otherwise arbitrary
preserve-original-spacing judgement call for no benefit (the source's
occasional missing space is CC-CEDICT inconsistency, not a meaningful
distinction).

Worked examples (a representative spread, not exhaustive — the full 815-item
set was verified programmatically, zero failures after §1.3's extension):

| Headword | Before | After |
| --- | --- | --- |
| 㕻 | `also pr. [tou4]` | `also pr. tòu` |
| 下頦 | `Taiwan pr. [xia4hai2]` | `Taiwan pr. xià hái` |
| 似地 | `Taiwan pr. [si4de5]` | `Taiwan pr. sì de` — corrected from an earlier draft's `shì de`: the literal corpus text is `si4de5`, not `shi4de5` (the entry's own primary reading is `shi4 de5`/shì de); this annotation is citing the well-documented Taiwan-Mandarin retroflex/non-retroflex merger (sh→s), so mechanical conversion of the literal bracket content is also the linguistically correct output here, not something to "correct" toward the primary reading — verified against `data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt` line 7046 |
| 傍 | `Taiwan pr. [pang2], [bang1], [bang4]` | `Taiwan pr. páng, bāng, bàng` |
| 咖哩 | `colloquial pr. [ga1li3] or [ga1li2]` | `colloquial pr. gā lǐ or gā lí` |
| 待會兒 | `also pr. [dai1 hui3 r5] or [dai1 hui5 r5]` | `also pr. dāi huǐr or dāi huir` |
| 的 | `also pr. [di4] or [di5] in poetry and songs` | `also pr. dì or di in poetry and songs` |
| 亞 (reading Ya4) | `Taiwan pr. [Ya3]` | `Taiwan pr. Yǎ` |
| 八家將 | `... often written as "8+9", [ba1 jia1 jiu3]` | `... often written as "8+9", bā jiā jiǔ` |
| 讀破 | `nonstandard pronunciation of a Chinese character, e.g. the reading [hao4] in 爱好 rather than the usual [hao3]` | `nonstandard pronunciation of a Chinese character, e.g. the reading hào in 爱好 rather than the usual hǎo` |

### 1.3 Extension needed for three instances — hyphen-joined tone-sandhi pairs

Three instances (of the 815) represent a colloquial reading of a four-syllable
idiom as two hyphen-joined disyllabic "feet," with syllables inside each foot
concatenated: `[yi1mo2-yi1yang4]`, `[zhu1yun2-she2jian4]`,
`[zhuo2zhuo2-shi1bai4]`. Feeding these directly to §1.2's algorithm throws —
`numberedToDiacritic` (correctly) rejects the embedded hyphen as an invalid
character once the digit-then-letter space-insertion has run on the whole
string, because the hyphen sits between two digits that both trigger
insertion, producing a token that still contains a bare `-`.

**Extension**: split the bracket content on `-` first, apply §1.2's two steps
to each hyphen-delimited segment independently, then rejoin with `-`.

| Headword | Before | After |
| --- | --- | --- |
| 一模一样 | `also pr. [yi1mo2-yi1yang4]` | `also pr. yī mó-yī yàng` |
| 朱云折槛 | `also pr. [zhu1yun2-she2jian4]` | `also pr. zhū yún-shé jiàn` |
| 着着失败 | `Taiwan pr. [zhuo2zhuo2-shi1bai4]` | `Taiwan pr. zhuó zhuó-shī bài` |

I judged this worth folding into the general algorithm (one extra
hyphen-split step) rather than three standalone overrides, since it is a
single, mechanical, well-understood extension and not a case where I am
exercising linguistic judgement beyond what §1.2 already establishes. Listed
here individually per the work order's acceptance criterion 4 because they
do not work under the *un-extended* general rule and I want that fact
visible, not buried in a passing test.

### 1.4 Failure mode for anything not covered above

This ruling is exhaustive against the pinned corpus (dictionaryVersion
2026-08-23T06:21:07Z) — every one of the 816 pronunciation-annotation
instances is accounted for by §1.1, §1.2, or §1.3, and I verified this
programmatically, not by inspection of a sample. CC-CEDICT updates
periodically (data-pipeline.md §2 stage 1), and a future release could in
principle introduce a bracket shape none of these rules recognise — a new
romanisation-system label, or a syllable-boundary irregularity
`numberedToDiacritic` cannot parse even after §1.2's space-recovery step.

**Rule: if `numberedToDiacritic` throws on a bracket that is not caught by
the §1.1 non-Mandarin-label check, the build must fail on it, the same as
any other pipeline invariant violation (data-pipeline.md §8) — never
silently drop the annotation, never silently ship the raw bracket, never
guess.** Route it to Red for a new individual ruling, the same as an
unmatched HSK word (data-pipeline.md §5.3). This keeps the "fail the build
rather than warn" posture consistent and means a dictionary update cannot
silently introduce either leaked syntax or a mistranslated pronunciation.

## 2. Individual override — the one cross-reference leak

One instance is not a member of this family at all, and must not be run
through §1's rules:

| Headword | Reading | Sense (as parsed) | Call |
| --- | --- | --- | --- |
| 崗 (simp 岗) | gang1 | `variant of 冈 [gang1]` | This is a DEC-023-family cross-reference (`variant of` + target word + reading) that leaked past `SENSE_REFERENCE_PATTERN` because CC-CEDICT wrote a space between the target word and the bracket (`冈 [gang1]`) instead of the pattern's assumed no-space adjacency (`冈[gang1]`). Apply DEC-023's existing rule: normalise to the simplified target word only, drop the reading. **Corrected sense: `variant of 冈`.** |

**Note to Black, not a new content decision**: this is a parser gap in the
existing DEC-023 normalisation, not a new bracket family — `SENSE_REFERENCE_PATTERN`
assumes the cross-referenced word sits directly against `[` with no space,
and this is the one instance in the pinned corpus where CC-CEDICT didn't
follow that convention. Whether you fix it by widening the regex to tolerate
an optional single space before the bracket (my mild preference, since it is
the more general and self-maintaining fix against future dictionary updates
that might contain more of these) or by a one-off override keyed to this
card id is an implementation choice for WO-008 — either is linguistically
correct as long as the shipped sense reads `variant of 冈`. I checked: this is
the *only* instance in the pinned corpus where a recognised cross-reference
verb (`variant of`, `see`, `abbr. for`, `old variant of`, `also written`) is
followed by a space and then `word[reading]` or `word` — I searched for the
general pattern, not just this one headword.

## 3. Individual override — square-bracket-punctuation entries

| Headword | Reading | Sense (as parsed) | Call |
| --- | --- | --- | --- |
| 中括号 (trad 中括號) | zhong1 kuo4 hao4 | `square brackets [ ]` | Reword to drop the literal glyphs: **`square brackets`**. |
| 方括号 (trad 方括號) | fang1 kuo4 hao4 | `square brackets [ ]` | Reword to drop the literal glyphs: **`square brackets`**. |

**Rationale.** These two glosses are not pronunciation annotations at all —
the sense is *about* the punctuation mark, illustrated with the mark itself,
and gate 4 cannot tell the difference between that and leaked syntax (nor
should it have to: the gate's whole purpose is "the UI must never see raw
CC-CEDICT notation," and `[ ]` shown as a literal example is exactly the kind
of thing a learner could mistake for a rendering bug). Dropping the
illustrative `[ ]` costs nothing — "square brackets" is a complete, correct
gloss for the headword on its own; a punctuation mark's own gloss doesn't
need to render the glyph inline any more than 句号 ("period; full stop")
needs to show a literal `.` or 逗号 ("comma") a literal `,` — and neither of
those does, in the corpus.

**Scope note, stated per the work order's invitation to say so if it doesn't
matter**: I checked whether either headword appears in the pinned HSK list
(`data/source/hsk/hsk-1.json` through `hsk-6.json` — grepped both simplified
forms across all six files). **Neither appears.** These are advanced,
technical typography vocabulary, not HSK 1–6 syllabus items, so under the
current word list this override will most likely never actually apply to a
shipped card. I am ruling on it anyway, as asked, both because CC-CEDICT
could in principle be matched against a different or updated list later
(data-pipeline.md §4 notes the list is a one-file swap) and because leaving
it silently unruled would fail the work order's acceptance criterion 2. The
override should still be added to `data/overrides/` so it is ready and
inert rather than becoming a fresh question if either word is ever pulled
in.

## Homograph adjudications

None. Nothing in this ruling touches homograph resolution — it is entirely
about sense-text shape within already-identified entries.

## Escalations

None. All four families (§1.1, §1.2/§1.3, §2, §3) resolve to a rule I am
confident is correct without needing the owner's input.

## Observations

- **Sense ordering, not corrected here.** In 14 of 696 standalone
  "also pr./Taiwan pr./..." annotation senses, the annotation is not the
  last sense in the entry's `senses` array (e.g. 帆's `senses` are `[...,
  "Taiwan pr. [fan2]", "except 帆布 canvas"]` — the annotation sits
  mid-list because CC-CEDICT split what reads as one qualified statement
  into two senses). This is a minor presentation nicety, not a leaked-syntax
  or correctness problem, and I am not mandating a reorder — it would be
  scope creep into WO-008's array-shape decisions for a 2% cosmetic case.
  Flagging it here in case White or Black wants to consider
  annotation-sense placement when designing how the back-of-card sense list
  renders.
- **Genuine linguistic content, not noise.** Worth restating since it
  shapes the whole ruling: these 815 senses (excluding the two Jyutping/§1.1
  cases within them, and now-reworded per §1.2/§1.3) are not dictionary
  clutter to be swept away — "Taiwan pr." and "also pr." annotations are
  exactly the kind of pronunciation-variance information CLAUDE.md asks this
  app to help learners with. A learner who later encounters Taiwanese media
  or speakers benefits from knowing 下頦 is also read `xià hái` there. I
  considered and rejected a blanket "strip the whole annotation" rule for
  this reason — it would silently discard real content across ~750 senses
  for no gain over the modest engineering cost of converting it properly.
- **This ruling produces no code and touches no committed data.** Per the
  work order's scope, implementation is WO-008 (Black's). The rules above
  are written to be directly implementable — regexes and worked
  before/after pairs are given precisely so there is no follow-up
  linguistic question, per acceptance criterion 3.
