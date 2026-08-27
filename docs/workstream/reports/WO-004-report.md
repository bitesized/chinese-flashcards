---
id: WO-004
agent: Black
outcome: complete
date: 2026-08-24
---

# WO-004 — Work Report

## What was done

Branched `wo-004-cc-cedict-parser` from `main` (WO-004 depends only on
WO-002, already merged).

Implemented `pipeline/cedict.ts`:

- `parseCedict(raw: string): CedictParseResult` — pure, I/O-free, the same
  shape as `pipeline/pinyin.ts` (WO-005), for the same reason: it must be
  usable and testable in complete isolation. Splits on `/\r\n|\r|\n/` so
  CRLF (the pinned file's actual encoding, per WO-002's report), bare LF, or
  a mix all work, with no field left carrying a trailing `\r`.
- `loadCedict(filePath?): CedictParseResult` — a thin `fs.readFileSync(...,
  'utf-8')` shell around it, defaulting to the pinned committed path, for
  later pipeline stages to import without reimplementing file I/O.
- Header handling: `#!` metadata lines are parsed for `date=` (exposed as
  `dictionaryVersion`) and `entries=` (exposed as `sourceEntryCount`); plain
  `#` comment lines are skipped without capturing anything.
- Entry grammar `Traditional Simplified [reading] /sense1/sense2/.../`,
  verified to match all 124,903 non-comment lines in the pinned file before
  I trusted it (see Findings).
- `CL:` senses are extracted into `classifiers` and removed from `senses`;
  each classifier item may be `simp[reading]` or `trad|simp[reading]`.
- Non-Han headwords (checked on the **simplified** field, since that is
  what becomes `Card.headword` per domain-model.md §2) are routed to
  `excluded` with `reason: 'non-han-headword'` and a source line, not
  dropped.
- `readingNumeric` is the `[...]` block verbatim (trimmed, internal
  whitespace runs collapsed to one space) — erhua's `r5`, `u:`, and
  proper-noun capitalisation untouched, in exactly the token shape
  `numberedToDiacritic` (`pipeline/pinyin.ts`) expects as input, per WO-005's
  report note. This module never imports or calls it.
- `CedictParseError` carries the 1-based line number and offending line
  text, thrown (not swallowed) on a line that doesn't match the entry
  grammar or a malformed `CL:` item — "fail the build rather than warn."

**Extended the trad|simp normalisation beyond the letter of the spec's one
worked example** (see Findings for the full reasoning and corpus counts):
covers the bracket-less `trad|simp` form and the pipe-less `word[reading]`
form, not just the combined `trad|simp[reading]` form the spec's table
shows. All three are the same "point at another headword, optionally with a
reading" mechanism with one optional part missing in the other two. This is
a mechanical, non-linguistic substitution (always prefer the already-shipped
simplified form), so I made this call myself rather than escalating it —
but I flag the corpus counts below since it changes what "no leaked syntax"
means for this parser's actual output, which the next two work orders
should know.

`data/test-fixtures/cedict-entries.txt`: 17 real lines copied verbatim from
the pinned source (via a script, not hand-transcription, to avoid CJK
transcription errors), CRLF line endings, with a small header exercising
`#!` metadata capture. Covers all eleven cases named in
testing-strategy.md §2, plus all four register markers named explicitly in
data-pipeline.md §3 ((coll.), (lit.), (fig.), (dialect)), plus the real
`行` homograph group (a triple — hang2/heng2/xing2 — not just a pair,
exceeding the requirement). Every line's real source-file location is
recorded in `pipeline/cedict.test.ts`'s comments.

`pipeline/cedict.test.ts`: 35 table-driven Vitest tests — full structural
assertion of every fixture entry (exact `traditional`/`simplified`/
`readingNumeric`/`senses`/`classifiers`/`sourceLine`), the non-Han exclusion,
the homograph triple (asserting senses are never merged across readings),
header capture (including malformed-header tolerance), field-order
correctness, CRLF-vs-LF equivalence, malformed-input rejection (with
line-number/line-text assertions on the thrown error), and — the one test
in the suite that deliberately isn't fixture-only — an end-to-end pass over
the real pinned `data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt`, still
read from the committed path only, never fetched.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Reads the pinned file, handles CRLF, no field carries a trailing `\r` | yes | `pipeline/cedict.test.ts` "CRLF handling" describe block, both the fixture-level test and the full-corpus test asserting no `\r` in any field |
| 2 | Comments skipped; release date captured and exposed | yes | `parseCedict` "header metadata" tests; full-corpus test asserts `dictionaryVersion === '2026-08-23T06:21:07Z'` |
| 3 | Traditional-then-Simplified order preserved, asserted with a fixture that would fail if swapped | yes | `parseCedict — field order` test, explicit negative assertion (`.not.toBe('中国')`) as well as the positive one |
| 4 | Pinyin bracket captured verbatim, including `r5`, `u:`, capitalisation | yes | fixture rows for 一會兒 (`yi1 hui4 r5`), 綠 (`lu:4`), 中國 (`Zhong1 guo2`) all asserted exactly |
| 5 | Senses split on top-level `/` only, multi-sense entry yields correct ordered list | yes | 行/xing2 fixture row (9 senses), 一人得道 row (2 senses), etc. |
| 6 | `CL:` classifiers extracted and removed from senses; multi-classifier + `trad\|simp` sub-form parses | yes | 書 fixture row: 3 classifiers including the `冊\|册[ce4]` sub-form; `senses` for that row contains no `CL:` entry |
| 7 | `trad\|simp[reading]` inside an ordinary sense normalised to simplified only; no `\|`, `[`, `]` remain from that pattern | yes | 綠's second sense asserted exactly; full-corpus test asserts no shipped sense contains `\|` at all (see Findings for the one bracket family this doesn't cover, by design) |
| 8 | Register markers preserved verbatim | yes | `(coll.)`, `(dialect)`, `(lit.)`, `(fig.)` all present verbatim in fixture assertions |
| 9 | Cross-reference-shaped senses parse without error, as plain strings | yes | B格 (`variant of`), 行/heng2 (`used in`) fixture rows |
| 10 | Surname entries parse without special-casing or dropping | yes | 汪 and 王 fixture rows, both `/surname Wang/`, parsed identically to any other single-sense entry |
| 11 | Non-Han-headword entry excluded from `entries`, recorded in a warnings/excluded list | yes | `parseCedict — non-Han-headword exclusion` describe block; `excluded` array asserted exactly |
| 12 | Fixture coverage includes all eleven named cases | yes | See "What was done" — all eleven present, several fixture rows doing double duty (documented in each case's description string) |
| 13 | Full pinned file parses end-to-end without throwing; entry count sane vs. header's `entries=` | yes | `parseCedict — full pinned corpus, end-to-end` describe block: `entries=124903` in header; `124859` kept + `44` excluded reconciles exactly to `124903`, asserted with `toBe` on the exact reconciliation and a tolerance band on the absolute counts (see test comments for why exact-vs-tolerant is split that way) |
| 14 | Vitest unit tests, table-driven, pass | yes | `pipeline/cedict.test.ts`, `it.each` for the fixture table; `npx vitest run` — 35/35 pass |
| 15 | `npm run typecheck`, `npm run lint`, `npm test` all green | yes | Ran all three (plus `npm run format:check`) after this work — all clean; 149 tests total across the repo (114 pre-existing + 35 new) |

## Not done

Nothing outstanding within this work order's explicit scope. All fifteen
acceptance criteria are met.

One thing I chose to extend beyond the work order's literal text (see "What
was done" and Findings) rather than leave unmet or silently under-deliver:
the trad|simp normalisation rule as literally stated only names the
`trad|simp[reading]` shape. I implemented it to also cover the two
sibling shapes CC-CEDICT actually uses (bracket-less `trad|simp`, pipe-less
`word[reading]`), because otherwise ~751 senses in the real corpus would
still contain a raw `|` and the parser's own acceptance criterion 7 would be
technically satisfied by its letter while failing its stated purpose (no
leaked dictionary syntax). I judged this a mechanical/representational call
within my remit, not a linguistic one requiring Red — flagging it here in
case Claude Code or Red disagrees with that boundary.

## Findings

- **A second, unrelated bracket-annotation family survives normalisation,
  by design, and testing-strategy.md §3 gate 4 ("no leaked syntax") will
  need to account for it.** CC-CEDICT uses `[...]` for alternate- or
  non-standard-pronunciation annotations with no word directly adjacent to
  the bracket — `"also pr. [tou4]"`, `"pronounced [a4 pu5 zhu3]"`,
  `"Jyutping [bo1]"`, `"Taiwan pr. [xing4]"` (818 senses in the pinned
  corpus), plus two entries whose gloss is literally *about* square
  brackets as punctuation (`"square brackets [ ]"`, at simplified headword
  中括号/方括号). None of these are `trad|simp` references — there's a space
  between the preceding word and `[`, so `SENSE_REFERENCE_PATTERN`
  correctly doesn't touch them (confirmed: 0 remaining `|`, 818 remaining
  `[`/`]` across the full pinned corpus). I did not invent a normalisation
  for these, because collapsing "also pr. [tou4]" into something bracket-free
  is a content decision (drop the alternate pronunciation? inline it some
  other way?) that isn't mine to make unilaterally — it's either Red's call
  or WO-008's validation-gate design. **WO-008's implementer needs to know
  this before wiring up gate 4** ("no shipped sense contains `CL:`, `[`,
  `]`, or `\|`" — testing-strategy.md §3) or it will fail on ~818 real
  senses the day it's switched on. My fixture (`一會兒`/`行`/`xing2` rows)
  documents two live instances of this so it's visible in a unit test, not
  just this report.
- **The spec's stated `trad|simp[reading]` normalisation, taken literally,
  would still leave the pipeline non-compliant with its own stated
  purpose.** Verified against the full pinned corpus: 751 senses use `trad|
  simp` with no trailing `[reading]` at all (e.g. `"abbr. for
  三項全能|三项全能"`), and a smaller number use a bracket with no pipe at all
  because trad === simp for that word (e.g. `"erhua form of 一下[yi1
  xia4]"`). I extended the normalisation regex to cover both — see "What
  was done" for the reasoning — but wanted this decision visible rather
  than buried in a regex, since it's the kind of unilateral scope expansion
  CLAUDE.md's process asks me to surface.
- **WO-002's report substitution note is now itself doubly confirmed**: the
  spec's original cross-reference worked example
  (`甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/`) is genuinely
  absent from the pinned 2026-08-23 release (grepped directly, confirmed
  absent), and `B格` at line 61 (WO-002's substitution) is present and
  correctly shaped. Used it as the cross-reference fixture as instructed.
- **CJK-ideograph detection uses `\p{Script=Han}` (Unicode property
  escape)**, not a hand-rolled codepoint-range check. This correctly covers
  the full Han script including rare CJK Extension-A characters like `㞎`
  (U+385E, used in the `(dialect)` fixture row) without needing to
  enumerate BMP/astral ranges by hand. Worth reusing in WO-008 rather than
  re-deriving a range table.
- **The 行 fixture entry is a genuine triple, not a pair** (hang2/heng2/
  xing2 all share the headword 行 in the real corpus). I kept all three in
  the fixture rather than trimming to two, since it's real data and a
  stronger test of "never merge senses across readings" (data-pipeline.md
  §5.2 rule 3) than a synthetic pair would be. `homographGroup` assignment
  itself is WO-007's job, not mine — this fixture only proves the parser
  keeps all three as fully distinct `CedictEntry` records.
- **`readingNumeric` collapses internal whitespace runs to a single space**
  (`.trim().replace(/\s+/g, ' ')`) as a defensive normalisation; the real
  corpus never needed this (every reading block I checked already used
  single spaces), but it costs nothing and protects a downstream consumer
  from an invisible double-space bug if a future CC-CEDICT release ever
  introduces one.

## Follow-ups proposed

- **WO-008 (validation) should read this report before designing gate 4.**
  The 818-instance "pronunciation-annotation bracket" family above is real,
  common, and currently unresolved — someone (Red, most likely, since it's
  a content-shape decision) needs to decide whether these annotations are
  dropped, reformatted, or gate 4 is scoped to exclude them, before that
  gate can run cleanly against real output.
- **WO-007 (HSK matching / cross-reference resolution) should read the
  "Extended beyond the letter" note above.** Because this parser normalises
  cross-reference-shaped senses down to plain text (e.g. `"variant of
  逼格"`, with the reading dropped), WO-007's stage-5 resolver cannot recover
  the target's numbered reading from the sense string alone if it needs one
  to disambiguate a homograph target. It will need to re-derive the target
  via the simplified-headword index (stage 3) and its own homograph
  handling, not by re-parsing the sense text. Flagging this now since it
  wasn't obvious until I checked what the normalisation actually discards.
- No changes proposed to `data-pipeline.md` itself — out of my scope to
  edit — but if it's ever revised, the "trad|simp notation" row's single
  worked example undersells how common the two bracket-less/pipe-less
  variants are; worth a note there for whoever reads it next.
