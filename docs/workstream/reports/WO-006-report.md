---
id: WO-006
agent: Red
outcome: complete
date: 2026-08-24
---

# WO-006 — Work Report

## What was done

Produced a 49-row numbered-Pinyin → diacritic test table covering every case
named in the work order, plus a `conventions` block that states, in writing,
the four judgement calls the task asked me not to leave implicit (ü-colon
folding, the j/q/x/y+u convention, erhua fusion, neutral-tone handling, and
proper-noun capitalisation scope).

Committed to **`data/test-fixtures/pinyin-conversion.json`** (JSON, not
Markdown — chosen for direct machine consumption per acceptance criterion 7).

**One judgement call worth flagging explicitly:** the erhua fixture. Rule 8 in
data-pipeline.md §3 says the r5 suffix "joins the preceding syllable without a
mark" but doesn't say whether that join is a direct fusion (`huìr`) or a
space-separated token (`huì r`). I ruled it is fusion, no space — standard
Pinyin orthographic practice never sets the -r suffix off with a space, and
`data-pipeline.md`'s own general space-joining rule (rule 7) is explicitly
about ordinary syllable-to-syllable joins, so it doesn't contradict a fusion
special-case at rule 8. I've stated this as the ruling (not a question) in the
fixture's `conventions.erhua` field, since WO-006 frames the test table as
authoritative. If Black's implementation or Claude Code reads rule 8
differently, that's a one-fixture disagreement to raise with me, not a guess to
make silently.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | At least 40 rows, covering every case in Task | yes | 49 rows in `data/test-fixtures/pinyin-conversion.json`, `cases` array. Groups: ü/u: (5), j/q/x/y+u (4), erhua (3), proper-noun capitalisation (4), neutral tone (4), a-priority (7), o/e-priority (6), last-vowel-wins (6), single-vowel (3), no-initial (4), multi-syllable joining (3, plus reuse of the neutral-tone multi-syllable row) |
| 2 | Each row states numbered input, correct diacritic output, one-line rule/case note | yes | Every entry has `input`, `expected`, `rule`, `note` |
| 3 | All four ü tone marks represented | yes | `lu:1→lǖ`, `lu:2→lǘ`, `lu:3→lǚ`, `lu:4→lǜ` (plus `nu:3→nǚ`) — verified programmatically that ǖ ǘ ǚ ǜ all appear in `expected` values |
| 4 | At least one erhua-suffix case and one standalone-儿 case, both present and distinguished | yes | `yi1 hui4 r5→yī huìr` and `yi1 dian3 r5→yī diǎnr` (suffix) vs. `er2→ér` (standalone); each row's `note` states explicitly why it is or isn't the erhua case |
| 5 | At least one proper-noun capitalisation case | yes | Four: `Zhong1 guo2`, `Bei3 jing1`, `Wang2` (single-syllable surname), `Mei3 guo2` |
| 6 | j/q/x/y + u convention explicitly confirmed or corrected, with example, in notes | yes | `conventions.jqxy_u_convention` states it is confirmed (bare `u`, no colon, plain tone mark not umlaut) and four worked examples (`qu1`, `ju2`, `xu3`, `yu4`) cover all four tones |
| 7 | Machine-readable format Black can consume directly | yes | JSON, uniform row shape, validated with `python3 -m json.load` |
| 8 | Committed under `data/test-fixtures/`, path stated | yes | `data/test-fixtures/pinyin-conversion.json` |

## Not done

Nothing scoped out. All eight acceptance criteria are fully met.

## Findings

1. **Rule 8 (erhua) is underspecified in data-pipeline.md §3 as written** — it
   doesn't say fusion vs. space-joined. I've resolved it as fusion and recorded
   the reasoning in the fixture's `conventions.erhua` field and above. Worth a
   one-line addition to data-pipeline.md §3 itself so a future reader doesn't
   have to reconstruct the ruling from the fixture file — I'd suggest Claude
   Code fold "no space" into rule 8's wording when that document is next
   touched, but I haven't edited it myself since it isn't mine to own.
2. **CC-CEDICT never actually omits the tone digit** (confirmed from my own
   knowledge of the source format, consistent with what data-pipeline.md §3
   documents). Rule 2's "(or no digit)" clause is therefore defensive rather
   than load-bearing against this specific corpus. I kept one fixture row for it
   (`ma` with no digit) since the rule as written invites it and a converter
   used only against this corpus should still behave sensibly if ever fed
   something else, but flagged in the fixture's own notes that it's not an
   observed CC-CEDICT case, so nobody mistakes it for evidence CC-CEDICT does
   this.

## Follow-ups proposed

- Once WO-005 (the conversion function) is implemented, run it against this
  fixture file directly as its unit test source rather than hand-porting the
  cases into TypeScript literals — keeps the authority (this file) and the test
  in sync by construction.
- Consider having Claude Code fold the erhua fusion-vs-space ruling into
  data-pipeline.md §3 rule 8's text (Finding 1) so it's not only discoverable
  via the fixture file.
