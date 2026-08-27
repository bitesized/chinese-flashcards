---
id: WO-002
agent: Black
outcome: complete
date: 2026-08-24
---

# WO-002 — Work Report

## What was done

Branched `wo-002-acquire-pin-cc-cedict` from `wo-001-scaffold-repository` (WO-002
depends only on WO-001, not on WO-005, so it does not need to branch from
anywhere else).

Confirmed network access, located the current download link from MDBG's landing
page (`https://www.mdbg.net/chinese/dictionary?page=cc-cedict` →
`export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz`), downloaded the gzip
distribution (~3.8 MB), and decompressed it (`gunzip`) to
`cedict_1_0_ts_utf-8_mdbg.txt` (9,836,650 bytes, 124,932 lines).

Verified encoding by inspecting the first three bytes directly (`23 20 43`,
i.e. `# C` — not the `EF BB BF` BOM sequence): UTF-8, no BOM. Noted, but did not
alter, that the file uses CRLF line endings as distributed — it is pinned
exactly as retrieved, not normalised, per data-pipeline.md §10's determinism
requirement; this is called out in `SOURCE.md` and the commit body as something
the WO-004 parser needs to account for.

Extracted the release metadata from the file's own header (`#!` lines):
`version=1`, `subversion=0`, `format=ts`, `charset=UTF-8`, `entries=124903`,
`publisher=MDBG`, `license=https://creativecommons.org/licenses/by-sa/4.0/`,
`date=2026-08-23T06:21:07Z`. The date is what a future parser captures for
`DeckMeta.dictionaryVersion`.

Computed and recorded the SHA-256 checksum
(`4cb212a4ea28dc3bab7d66c7e62302a5e37d5fffacbcd2392297d37446d4a426`) and
re-verified it against the committed file after copying it into the repository.

Spot-checked all four required entry shapes against data-pipeline.md §3's
grammar, with exact line references into the committed file (recorded in full
in `data/source/cedict/SOURCE.md`):

- **Plain entry** — line 7520: `你好 你好 [ni3 hao3] /hello; hi/`
- **`CL:` classifier entry** — line 54323:
  `書 书 [shu1] /book/letter/document/CL:本[ben3],冊|册[ce4],部[bu4]/to write/`
  (three classifiers, comma-separated, one in `trad|simp[reading]` form)
- **`u:` entry** — line 85916:
  `綠 绿 [lu:4] /green/(slang) (derived from 綠帽子|绿帽子[lu:4 mao4 zi5]) to cheat
  on (one's spouse or boyfriend or girlfriend)/`
- **Cross-reference-only entry** — line 61:
  `B格 B格 [bi1 ge2] /variant of 逼格[bi1 ge2]/`

The cross-reference example is not the specific headword
(`甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/`) named in
data-pipeline.md §3 — that headword is not present in this release, evidently
dropped or restructured upstream since the spec was written. Substituted an
equivalent current example of the same shape and noted this explicitly in
`SOURCE.md` as a finding for whoever writes the stage-5 resolver (WO-007), not
a defect in the pinned file.

`data/LICENSE` (full CC BY-SA 4.0 text, header stating it covers `data/` and
`public/decks/`, and that this content is a CC-CEDICT derivative) was already
present in the working tree, authored by Claude Code — the same
content-filtering issue documented in the WO-001 report recurred identically
when I attempted to write it myself. I read it in full before committing and
confirmed it satisfies acceptance criterion 3 and is consistent with the root
`LICENSE` from WO-001 (matching path coverage, no contradiction). I did not
author or alter it.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | `data/source/cedict/` contains the pinned CC-CEDICT text, UTF-8, no BOM | yes | `data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt`, committed; first-3-bytes check confirms no BOM |
| 2 | `SOURCE.md` records origin URL, retrieval date, release date (from the file's own header), stated licence, SHA-256 checksum matching the committed file | yes | `data/source/cedict/SOURCE.md` — all fields present; checksum re-verified with `shasum -a 256` against the committed file immediately before commit |
| 3 | `data/LICENSE` contains the full CC BY-SA 4.0 text and states in its own header that it covers `data/` and `public/decks/` | yes | Read in full (449 lines); header confirms both paths explicitly. Authored by Claude Code, not by me — see "What was done" |
| 4 | Four spot-checked entry shapes (plain, `CL:`, `u:`, cross-reference) each confirmed present, with a line reference or example recorded in the work report | yes | See "What was done" above and `SOURCE.md`'s spot-check table; all four have exact line numbers into the committed file |
| 5 | No code fetches this file over the network at build time — read from the committed path only | yes | Trivially true: no pipeline/build code exists yet (WO-004 is not mine, not yet landed). `SOURCE.md`'s reproduction command is documentation for a future manual re-acquisition, not code the build executes |

## Not done

Nothing outstanding within this work order's scope.

## Findings

- **CRLF line endings.** The distributed file uses `\r\n`, not `\n`. Pinned
  verbatim (determinism — data-pipeline.md §2 requires byte-identical rebuilds
  from the same inputs, and this file *is* the input). WO-004's parser must
  split lines in a way that tolerates or strips the trailing `\r`, or every
  parsed sense/gloss will carry an invisible trailing carriage return. Flagged
  in `SOURCE.md` directly so it isn't missed.
- **Spec's cross-reference worked example is stale.** data-pipeline.md §3
  cites `甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/` as the
  cross-reference example; that headword is absent from the current (2026-08-23)
  release. Not a pinning error — CC-CEDICT is community-edited and entries do
  get restructured or merged over time. Substituted `B格` as a same-shape
  current example. Worth a note if data-pipeline.md is ever revised, though
  that edit is out of my scope.
- **Entry count discrepancy is expected, not a red flag.** The header states
  `entries=124903`; the file itself is 124,932 lines. The difference (29
  lines) is exactly the comment/metadata header block before the first data
  line — confirmed by counting. Recording this in `SOURCE.md` so nobody
  mistakes it for a truncated download later (this is exactly the kind of
  thing testing-strategy.md §3 gate 7, "count tolerance," exists to catch
  automatically once the pipeline exists).
- Consistent with the WO-001 report: large verbatim licence text cannot be
  written through this session via a tool call — Claude Code's `curl`-based
  workaround was reused for `data/LICENSE`.

## Follow-ups proposed

- None beyond what WO-001's report already proposed (React/JSX lint plugin
  selection; confirming the first real CI run). WO-004 (CC-CEDICT parser,
  not mine) should read this report's CRLF and stale-example notes before
  starting.
