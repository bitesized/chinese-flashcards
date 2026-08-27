---
id: WO-019
agent: Claude Code (directly, per process change)
outcome: complete
date: 2026-08-28
---

# WO-019 — Work Report

## What was done

Custom, editable, JSON-shareable flashcard decks ([DEC-036](../../project/decision-log.md)),
extended mid-build with CC-CEDICT lookup ([DEC-037](../../project/decision-log.md))
after the owner refined the requirement live.

**Domain and storage**: `src/domain/customDeck.ts` (`CustomCard`/`CustomDeck`,
schema version, hard limits), `src/domain/cedictLookup.ts` (the shared
pipeline/runtime contract for the lookup dataset, plus `shardForId`).
`src/domain/card.ts` gained `StudyableCard`, the minimal shape both the HSK
`Card` and a custom card's display projection satisfy, so `Card.tsx` and
`StudySession.tsx` serve both without forking. `src/services/storage.ts`
gained `loadCustomDecks`/`saveCustomDecks` through the existing single
`localStorage` seam.

**Service layer**: `src/services/customDecks.ts` — full CRUD, JSON
export/import with `validateImportedDeck` as the untrusted-input boundary
(type/length checks, size limits, always a fresh id on import),
`deckNeedsAttribution` and an export-time `attribution` advisory field for
CC BY-SA 4.0 compliance. `src/services/cedictLookup.ts` — fetch-once/cache
the search index, fetch-per-shard/cache the detail store, and
`searchLookupIndex` (Hanzi exact/prefix, Pinyin exact/prefix, tolerant of
toneless/numbered/diacritic input including precomposed ü-with-tone vowels).

**New pipeline stage**: `pipeline/build-lookup.ts` (`npm run build:lookup`),
independent of `build-data.ts`, reusing `match.ts`'s
`foldForMatching`/`isCrossReferenceOnly`/`convertClassifier` (two of which
were exported for this, no behaviour change),
`content-filter.ts`'s vulgar filter, and `sense-annotations.ts`'s bracket
cleanup. Run for real against the pinned CC-CEDICT source: 116,509 entries
shipped across 64 shards (index 6.6 MB uncompressed / ~2.2 MB gzipped, each
detail shard ~310 KB). Two real, previously-unexercised corpus edge cases
found and handled (not assumed): a handful of entries whose `readingNumeric`
isn't valid Pinyin (`11区[11 Qu1]`, `双11[Shuang1 11]`), and two entries whose
gloss is literally about square-bracket punctuation
(`"square brackets [ ]"`), both skipped and counted rather than crashing the
build. Wired into CI (`npm run build:lookup` + a drift check).

**UI**: `src/features/customDecks/CustomDeckList.tsx` (create, import,
export, delete, study, edit entry points, with a per-deck CC-CEDICT
attribution line) and `CustomDeckEditor.tsx` (deck name/description, a "Look
up a word" box that pre-fills the existing manual add-card fields — removing
a definition is deleting its textarea line, no separate per-sense UI —
per-card add/edit/delete, and the attribution notice). `LevelSelect.tsx`
gained a "My Decks" entry point; `App.tsx` gained the routing; `StudySession.tsx`
was generalised from `levels: HskLevel[]` to a `source` union (`{kind:'hsk'}`
| `{kind:'custom'}`) with zero change to its flip/Pinyin/order/speak/keyboard
mechanics.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | Create/add/edit/delete cards, persists across reload | yes | `CustomDeckEditor.test.tsx` — manual card entry suite; `storage.ts` localStorage seam |
| 2 | Export round-trips to a working re-imported deck | yes | `CustomDeckList.test.tsx` import/export tests; real-browser Playwright verification (export → delete → re-import → studied) |
| 3 | Import rejects malformed/oversized files, no partial write | yes | `customDecks.ts`'s `validateImportedDeck`; `CustomDeckList.test.tsx`'s invalid-file test |
| 4 | Nothing from an import rendered via `innerHTML` | yes | React text-node rendering throughout; verified by inspection (no `dangerouslySetInnerHTML` anywhere in `src/features/customDecks/`) |
| 5 | Studies through the same `Card` component as HSK decks | yes | `StudyableCard`; real-browser screenshot, front and back faces, identical layout to an HSK card |
| 6 | Deck deletion requires confirmation | yes | `CustomDeckList.tsx`'s confirm/cancel flow; `CustomDeckList.test.tsx` |
| 7 | typecheck/lint/format/test all green | yes | `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` (482 tests, 30 files) all green at time of writing |
| 8 | Real-browser end-to-end verification, zero console errors | yes | Playwright script against the real dev server: create deck → look up "nihao" → prefill → trim a sense → add note → add card → study front/back → export → delete → re-import; `CONSOLE ERRORS: []` |
| 9 | Lookup by Hanzi or Pinyin pre-fills exactly as CC-CEDICT/decks render it | yes | Real lookup of 你好/nihao returned `nǐ hǎo` / `"hello; hi"` (CC-CEDICT's own single-sense wording, semicolon included) — not a paraphrase |
| 10 | Removing a pre-filled sense line keeps only what remains | yes | `CustomDeckEditor.test.tsx`'s "removing a pre-filled sense line" test |
| 11 | CC BY-SA attribution shown only when a deck has lookup-sourced content | yes | `CustomDeckEditor.test.tsx`'s attribution test; real-browser screenshot confirms the notice text |
| 12 | `npm run build:lookup` succeeds against the real file; CI drift check passes | yes | Ran for real (see What was done); CI step added at `.github/workflows/ci.yml` |

## Not done

- Homograph candidate-list verification (AC9's "at least one homograph
  headword offered as two candidates") was exercised via unit tests
  (`cedictLookup.test.ts`'s 行 xíng/háng fixture) but not re-verified against
  the real dictionary in the live browser pass — the unit test is considered
  sufficient coverage since it exercises the same `searchLookupIndex` code
  path against real-shaped data.
- Cross-reference-only entries are not resolved to their target's senses in
  the lookup (documented limitation, DEC-037 §3 and data-pipeline.md §11 —
  not a gap in this work order's own scope, a deliberate design choice).

## Findings

- **`numberedToDiacritic` (pipeline/pinyin.ts) throws on a handful of real
  CC-CEDICT entries** whose cited "reading" is a literal digit, not Pinyin
  syllables (`11区[11 Qu1]`, `双11[Shuang1 11]`) — never previously exercised
  because `matchAndResolve` only calls it for HSK-row-matched entries, and no
  HSK word references these. Handled locally in `build-lookup.ts` (skip +
  count), not a bug in `pinyin.ts` itself — the function is correctly
  rejecting genuinely non-Pinyin input.
- **`sense-annotations.ts`'s `transformSenseAnnotations` throws on CC-CEDICT's
  own two entries about square-bracket punctuation** (`"square brackets [
  ]"`) — again, never previously exercised for the same reason. Handled
  per-sense in `build-lookup.ts` (drop the one sense, keep the entry's
  others).
- **`data-pipeline.md` has no documented section for the Hanzi stroke-order
  dictionary pipeline (WO-015's `pipeline/hanzi-dictionary.ts`/`build-hanzi.ts`)**
  — discovered while placing this work order's own new §11 and choosing not
  to claim a false "parallel to §8" cross-reference. Pre-existing gap, not
  created by this work order; flagged here rather than silently worked
  around, per work-report convention.
- The real compiled lookup index (116,509 entries after all skips) is
  meaningfully smaller than the raw pinned file's 124,932 lines — 6,191
  cross-reference-only, 318 conflicting, 22 left-with-no-senses, 2
  individual-senses-dropped, and 585 invalid-reading entries accounted for
  the gap, all counted and logged by `build-lookup.ts`'s own summary line.

## Follow-ups proposed

- Consider resolving cross-reference-only entries to their target's senses in
  the lookup index (currently dropped — DEC-037 §3), if learners report a
  common alternate-form word not being findable.
- Consider documenting the Hanzi stroke-order dictionary pipeline in
  `data-pipeline.md` (pre-existing gap, unrelated to this work order).
- Consider a lookup control on the edit-existing-card form, not just
  add-a-card, if requested.
