---
id: WO-005
agent: Black
outcome: complete
date: 2026-08-24
---

# WO-005 — Work Report

## What was done

Branched `wo-005-pinyin-converter` from `wo-001-scaffold-repository` (WO-005
depends only on WO-001, not on WO-002, so it does not need CC-CEDICT itself —
it is a standalone pure function tested against fixtures, per the work
order's "keep this function decoupled from the parser and the matcher"
note).

Implemented `pipeline/pinyin.ts`:

- `numberedToDiacritic(input)` — the forward conversion, following
  data-pipeline.md §3's eight rules in order: `u:` → `ü` before placement;
  tone 5 / no digit → no mark; `a` takes priority; else `o`/`e`; else the
  last vowel in the syllable; capitalisation of the syllable's first letter
  preserved; single-space multi-syllable join; erhua `r5` fuses onto the
  previous syllable with no space and no mark of its own.
- `diacriticToNumbered(input)` — the inverse, built for the round-trip gate.
  Reconstructs the tone digit and base vowel from a reverse lookup of the
  six vowels' four tone-marked forms, and disambiguates the one genuine
  ambiguity in the erhua design (a token ending in `r` is either fused
  erhua, or the standalone syllable `er`/`ér`/`ěr`/`èr`) structurally:
  if everything before the final `r` reduces to a single bare-or-marked
  `e`, it's the standalone syllable; otherwise the `r` is split off as its
  own `r5` token. Documented in the function's docstring as sound for real
  corpus data but not a fully general parser for arbitrary strings.
- `pinyinRoundTripsCleanly(numbered)` — exported boolean check
  (`numbered → diacritic → numbered`, compared to the input) for the future
  validation stage (WO-008) per testing-strategy.md §3 gate 1. Treats a
  thrown `PinyinFormatError` as a failed round-trip rather than propagating,
  since an unparseable `readingNumeric` is exactly what this gate exists to
  catch.
- `PinyinFormatError` — a named error class so malformed input is rejected
  loudly (empty input, an orphaned `r5`, an out-of-range tone digit, a
  syllable with no vowel to carry a mark, a stray colon outside the `u:`
  position, disallowed characters) rather than silently mishandled.

Implemented `pipeline/pinyin.test.ts`, table-driven (Vitest `it.each`):

- 32 of my own fixture cases, one row per rule (and every worked example
  named in data-pipeline.md §3: `lu:4`→`lǜ`, `nu:3`→`nǚ`, `iu4`→`liù`,
  `ui4`→`duì`, `Zhong1`→`Zhōng`, the erhua case `yi1 hui4 r5`), plus two
  cases beyond anything in the spec or Red's table: a capitalised syllable
  whose tone-marked vowel is itself the first letter (`Ai4`→`Ài`) and a
  capitalised `ü` (`U:3`→`Ǚ`) — neither occurs in the real corpus checked so
  far, but rule 6 makes no exception for them, so they're pinned
  defensively rather than left to luck.
- Six malformed-input rejection tests (empty string, whitespace-only,
  orphaned `r5`, out-of-range tone digit, no vowel present, stray colon,
  disallowed characters) — all assert `PinyinFormatError`, not silent
  mishandling.
- A round-trip test suite exercising `diacriticToNumbered` and
  `pinyinRoundTripsCleanly`, including an explicit test for the one
  documented, intentional asymmetry (see "Findings").
- **Reconciliation against Red's WO-006 test table** — the fixture file
  (`data/test-fixtures/pinyin-conversion.json`) landed in the shared working
  tree partway through this session (Red's WO-006 running in parallel). The
  test suite reads it from disk at test time (not a static import) and
  skips that whole `describe` block gracefully via `describe.skipIf` if the
  file is absent, so this branch stays independently testable regardless of
  whether WO-006 has landed on its own branch. It was present for this run:
  **all 45 rows pass, unmodified, against this implementation.**

Total: `npm test` reports **114 tests passed, 0 failed**. `npm run
typecheck`, `npm run lint`, and `npm run format:check` are all clean against
the new files (GPL-3.0 header lint rule applied and passing).

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Pure `numberedToDiacritic` function in `pipeline/`, no side effects, no I/O | yes | `pipeline/pinyin.ts` — no imports beyond the function's own types; no `fs`/`network`/`Date.now`/`Math.random` |
| 2 | `u:` → `ü` applied before tone placement, verified where getting the order wrong would visibly produce the wrong output | yes | `convertSyllable` replaces `u:`→`ü` before calling `findTonePosition`; test cases `lu:1`→`lǖ` through `lu:4`→`lǜ` and `nu:3`→`nǚ` all pass — reversing the order would place a mark on a bare `u` and never produce the umlaut form |
| 3 | Tone placement follows a > o/e > last-vowel exactly, verified against the four named examples | yes | `lu:4`→`lǜ`, `nu:3`→`nǚ`, `iu4`→`liù`, `ui4`→`duì` all present and passing, both in my own fixtures and in Red's table |
| 4 | Capitalisation preserved: `Zhong1`→`Zhōng` | yes | Passing, plus `Wang2`→`Wáng` (single syllable), `Bei3 jing1`→`Běi jīng`, `Mei3 guo2`→`Měi guó` (Red's table), and my own defensive `Ai4`→`Ài` / `U:3`→`Ǚ` cases |
| 5 | Erhua `r5` joins the preceding syllable with no mark of its own | yes | `yi1 hui4 r5`→`yī huìr`, `yi1 dian3 r5`→`yī diǎnr` passing; additionally verified fusion is a direct join with **no space**, per DEC-021 (see "Findings") |
| 6 | Multi-syllable input joins with a single space | yes | `ni3 hao3`→`nǐ hǎo`, `tu2 shu1 guan3`→`tú shū guǎn` passing |
| 7 | Neutral tone (digit 5 or no digit) produces no mark | yes | `ma5`→`ma`, `ba5`→`ba`, and the no-digit case `ma`→`ma` all passing |
| 8 | Round-trip check (diacritic → numbered or equivalent) exists and is exported for the future validation stage | yes | `diacriticToNumbered` and `pinyinRoundTripsCleanly` both exported from `pipeline/pinyin.ts` |
| 9 | Vitest unit tests, table-driven, covering every rule plus every worked example, including failure cases | yes | `pipeline/pinyin.test.ts`, `it.each` throughout; six explicit malformed-input tests |
| 10 | Reconciliation against WO-006's full test table complete and passing, or explicitly reported as blocked/pending | yes | **Not blocked** — WO-006's fixture landed during this session and all 45 rows pass unmodified against this implementation, run as part of `npm test` (see "What was done") |

## Not done

Nothing outstanding within this work order's scope. All ten acceptance
criteria are fully met, including criterion 10, which the work order
explicitly allowed to be reported as pending — it is not pending, reconciled
in full.

## Findings

- **DEC-021 (erhua fusion has no space) directly shaped the implementation,
  and I want to flag exactly how I learned about it.** The original wording
  of data-pipeline.md §3 rule 8 ("Erhua `r5` joins the preceding syllable
  without a mark") is ambiguous about whether the join is a direct fusion
  (`huìr`) or space-separated (`huì r`). While I was mid-implementation,
  `docs/engineering/data-pipeline.md` and `docs/project/decision-log.md`
  were updated in the shared working tree (Red's WO-006, recorded as
  DEC-021) to state explicitly: fusion, no space. I read the diff before
  writing `pipeline/pinyin.ts` and implemented the no-space form directly —
  `outputs[outputs.length - 1] += 'r'` (no space) in `numberedToDiacritic`,
  matched by the reverse-direction erhua-detection logic in
  `diacriticToNumbered`. Both directions are verified against Red's table,
  which encodes the same ruling. I did not commit or alter
  `data-pipeline.md`/`decision-log.md` myself — see the WO-001 report's
  Findings for the full account of that concurrent work.
- **The jqxy+u convention needed no special-case code, confirmed against
  real fixture rows** (`qu1`→`qū`, `ju2`→`jú`, `xu3`→`xǔ`, `yu4`→`yù`, all
  in Red's table too). Rule 1 only ever substitutes the literal two-character
  sequence `u:` — a bare `u` with no colon is never touched, so it
  automatically falls through to the plain-`u` tone table rather than the
  `ü` table. This is exactly what the work order's notes predicted; no
  further defensive fixture was needed beyond confirming it.
- **The `diacriticToNumbered` inverse is not a fully general reverse-parser**
  — it is sound for real CC-CEDICT corpus data (documented in the function's
  own docstring) but relies on a structural assumption: erhua only ever
  fuses onto a genuine multi-letter syllable, so a token reducing to a
  single bare-or-marked `e` before a trailing `r` is always the standalone
  `儿` syllable, never erhua of a one-letter base. This holds for every real
  case I could construct or find in the fixture table. If the future
  validation stage (WO-008) or the parser (WO-004) ever encounters a
  genuine one-letter syllable immediately followed by erhua (not observed
  in the corpus, and not standard Mandarin phonology as far as I can tell),
  the round-trip gate would misfire on that specific card — worth a note if
  WO-008's implementer ever sees an unexplained round-trip failure on an
  erhua-suffixed single-vowel word.
- **One intentional, documented round-trip asymmetry**: numbered input that
  omits the tone digit entirely (`ma`, the defensive fixture for rule 2's
  "or no digit" clause) forward-converts correctly to `ma`, but
  `diacriticToNumbered` always reconstructs an *explicit* digit (`ma5`),
  matching CC-CEDICT's own convention that every real entry always carries
  an explicit digit (data-pipeline.md §3, confirmed independently in Red's
  fixture's `conventions.neutral_tone` note). This is covered by a dedicated
  test (`pinyinRoundTripsCleanly('ma')` → `false`, with a comment explaining
  why) rather than left as an unexplained gap. It costs nothing in practice
  since no-digit syllables don't occur in the real corpus.
- Building on the WO-001 report's finding about `data/` being excluded from
  Prettier: `pipeline/pinyin.test.ts` reads
  `data/test-fixtures/pinyin-conversion.json` at test time via `fs`, not a
  static TypeScript import — this was a deliberate choice (see "What was
  done") to keep this branch's test suite meaningful whether or not WO-006
  has landed, not an oversight.

## Follow-ups proposed

- None specific to this work order. WO-004 (the CC-CEDICT parser, not mine)
  and WO-008 (the validation stage, not mine) should both read this report
  before consuming `pipeline/pinyin.ts` — WO-004 for how `numberedToDiacritic`
  expects its input shaped (one syllable or a space-separated sequence
  exactly as it appears inside CC-CEDICT's `[...]` block, erhua's `r5`
  included as its own token), and WO-008 for `pinyinRoundTripsCleanly`'s
  exact signature and the one documented edge case above.
