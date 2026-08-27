# CC-CEDICT — source record

Owner: **Black**. Pinned per [data-pipeline](../../../docs/engineering/data-pipeline.md)
§10: the build must never fetch this live, and must be reproducible offline from
a clean checkout regardless of whether the origin URL still resolves.

## Provenance

| Field | Value |
| --- | --- |
| Origin | MDBG's canonical CC-CEDICT distribution |
| Download URL | `https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz` |
| Landing page | `https://www.mdbg.net/chinese/dictionary?page=cc-cedict` |
| Upstream project | `https://cc-cedict.org/` (CC-CEDICT), based on CEDICT, Copyright (C) 1997, 1998 Paul Andrew Denisowski |
| Retrieved | 2026-08-24 |
| Committed file | `cedict_1_0_ts_utf-8_mdbg.txt` (decompressed from the `.gz` distribution) |

## Release, as stated in the file's own header

```
#! version=1
#! subversion=0
#! format=ts
#! charset=UTF-8
#! entries=124903
#! publisher=MDBG
#! license=https://creativecommons.org/licenses/by-sa/4.0/
#! date=2026-08-23T06:21:07Z
```

`date=2026-08-23T06:21:07Z` is the value the future parser captures for
`DeckMeta.dictionaryVersion` ([data-pipeline](../../../docs/engineering/data-pipeline.md)
§3). `entries=124903` is the count as stated by MDBG in the header; the file's
own line count is 124932, the difference being the 29 header/comment lines
before the first data line.

## Licence

CC-CEDICT is licensed **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike
4.0 International), stated identically in the file's own header
(`https://creativecommons.org/licenses/by-sa/4.0/`) and confirmed on the landing
page. This obligation is recorded at the repository level in
[`data/LICENSE`](../../LICENSE), which covers `data/` and `public/decks/` in
full — see [data-pipeline](../../../docs/engineering/data-pipeline.md) §7.

## Integrity

| Field | Value |
| --- | --- |
| File | `cedict_1_0_ts_utf-8_mdbg.txt` |
| Size | 9,836,650 bytes |
| SHA-256 | `4cb212a4ea28dc3bab7d66c7e62302a5e37d5fffacbcd2392297d37446d4a426` |
| Encoding | UTF-8, **no BOM** — confirmed by inspecting the first three bytes (`23 20 43`, i.e. `# C`, not the `EF BB BF` BOM sequence) |
| Line endings | **CRLF** (`\r\n`), as distributed by MDBG — preserved verbatim rather than normalised, since this file is pinned exactly as retrieved. The stage-2 parser (WO-004) must account for this when splitting lines |

Re-verify with:

```sh
shasum -a 256 data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt
```

## Spot-check against the grammar in data-pipeline.md §3

Confirms the pinned file is the expected kind of file — not full parsing
(WO-004's job). All four required shapes are present, each with a direct line
reference into the committed file:

| Shape | Line | Example |
| --- | --- | --- |
| Plain entry | 7520 | `你好 你好 [ni3 hao3] /hello; hi/` |
| `CL:` classifier entry | 54323 | `書 书 [shu1] /book/letter/document/CL:本[ben3],冊\|册[ce4],部[bu4]/to write/` (three classifiers, comma-separated, one using the `trad\|simp[reading]` form) |
| `u:` entry | 85916 | `綠 绿 [lu:4] /green/(slang) (derived from 綠帽子\|绿帽子[lu:4 mao4 zi5]) to cheat on (one's spouse or boyfriend or girlfriend)/` |
| Cross-reference-only entry | 61 | `B格 B格 [bi1 ge2] /variant of 逼格[bi1 ge2]/` |

Note for whoever writes the stage-5 resolver (WO-007): the specific
cross-reference example historically cited in data-pipeline.md §3
(`甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/`) is **not present** in
this release — the headword has apparently been dropped or restructured
upstream since that document was written. The shape itself (a sense that is
purely `variant of X[reading]` with no substantive gloss) is still common in
the corpus; `B格` above is one of many current examples. This is not a defect
in this release, just a note that the specific worked example in the spec is
now stale and the general case, not the specific characters, is what matters.

## Reproducing

```sh
curl -o cedict_1_0_ts_utf-8_mdbg.txt.gz \
  https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz
gunzip cedict_1_0_ts_utf-8_mdbg.txt.gz
shasum -a 256 cedict_1_0_ts_utf-8_mdbg.txt
# compare against the checksum above
```

The build itself never runs this — it reads the committed file at
`data/source/cedict/cedict_1_0_ts_utf-8_mdbg.txt` only. This is provided so a
future update (its own work order, per
[conventions](../../../docs/engineering/conventions.md) §7) can re-acquire and
diff against what is pinned here.
