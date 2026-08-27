---
id: WO-002
title: Acquire and pin CC-CEDICT; write SOURCE.md; set up data/LICENSE
owner: Black
status: Ready
priority: MUST
milestone: M1
requirements: [FR-22, NFR-11]
depends_on: [WO-001]
spec_refs:
  - engineering/data-pipeline.md#1-principle
  - engineering/data-pipeline.md#3-stage-2--parsing-cc-cedict
  - engineering/data-pipeline.md#7-licensing-and-attribution--mandatory
  - engineering/data-pipeline.md#10-repository-layout-for-data
touches:
  - data/source/cedict/
  - data/LICENSE
review_required: [Black]
---

# WO-002 — Acquire and pin CC-CEDICT

## Context

Every card the application ever shows derives from CC-CEDICT (CLAUDE.md §02,
[data-pipeline](../../engineering/data-pipeline.md) §1). The pipeline that will
parse it (WO-004) needs a committed, checksummed source file to parse — the build
must never fetch it live, so that it stays reproducible offline from a clean
checkout years from now
([data-pipeline](../../engineering/data-pipeline.md) §10). CC-CEDICT is licensed
CC BY-SA 4.0, which is a binding obligation on everything derived from it
([data-pipeline](../../engineering/data-pipeline.md) §7), and that obligation has
to be recorded in the repository from the moment the source file lands, not
retrofitted later.

## Task

**1. Acquire the current CC-CEDICT release.** The canonical distribution is MDBG's
`cedict_1_0_ts_utf-8_mdbg.txt` (gzip-distributed), published from
www.mdbg.net/chinese/dictionary?page=cc-cedict. Download it, decompress, and
verify it is UTF-8 without a BOM ([data-pipeline](../../engineering/data-pipeline.md)
§3).

**2. Pin it.** Commit the plain-text file under `data/source/cedict/`. Record its
checksum (SHA-256).

**3. Write `data/source/cedict/SOURCE.md`**, recording: origin and URL, retrieval
date, the release/version date as stated in the file's own comment header (the
line the future parser will capture for `DeckMeta.dictionaryVersion` —
[data-pipeline](../../engineering/data-pipeline.md) §3), the stated licence, and
the checksum.

**4. Spot-check the file** against the grammar in
[data-pipeline](../../engineering/data-pipeline.md) §3 — confirm a plain entry, a
`CL:` classifier entry, a `u:` entry, and a cross-reference entry are all present
and match the documented format. This is not full parsing (WO-004); it is
confirming you pinned the right kind of file.

**5. Write `data/LICENSE`** with the full CC BY-SA 4.0 (Attribution-ShareAlike 4.0
International) licence text, with a header stating it covers `data/` and
`public/decks/` and that this content is a derivative of CC-CEDICT
([data-pipeline](../../engineering/data-pipeline.md) §7, point 3 — ShareAlike
applies to the compiled decks too, not just the raw source). If the root `LICENSE`
from WO-001 already exists, confirm the two are mutually consistent; if WO-001 has
not landed, this file stands on its own and WO-001 points to it.

## Acceptance criteria

1. `data/source/cedict/` contains the pinned CC-CEDICT text file, UTF-8, no BOM.
2. `data/source/cedict/SOURCE.md` records origin URL, retrieval date, the release
   date parsed from the file's own header, stated licence, and a SHA-256 checksum
   that matches the committed file.
3. `data/LICENSE` contains the full CC BY-SA 4.0 text and states, in its own
   header, that it covers `data/` and `public/decks/`.
4. The four spot-checked entry shapes (plain, `CL:`, `u:`, cross-reference) are
   each confirmed present in the committed file, with a line reference or example
   recorded in the work report.
5. No code fetches this file over the network at build time — it is read from the
   committed path only.

## Out of scope

- Parsing CC-CEDICT into structured entries (WO-004).
- The HSK word list — that is WO-003, owned by Red.
- Root `LICENSE` authorship (WO-001) — this work order only ensures `data/LICENSE`
  is correct and consistent with it.
- Any in-app attribution UI (M6, White) — this work order only establishes the
  repository-level licence record required before any derived data is committed.

## Notes

- CC-CEDICT updates periodically. This work order pins *a* release; updating it
  later is explicitly its own work order with its own diff review
  ([conventions](../../engineering/conventions.md) §7) — do not build any
  auto-update mechanism here.
- If MDBG's distribution is unreachable, any mirror must still be traceable back to
  the canonical CC-CEDICT project and must carry the same licence; record the
  provenance chain in `SOURCE.md` if a mirror is used.
