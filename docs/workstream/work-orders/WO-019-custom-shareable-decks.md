---
id: WO-019
title: Custom, editable, JSON-shareable flashcard decks, with CC-CEDICT lookup
owner: Claude Code (directly, per process change)
status: Done
priority: MUST
milestone: none — owner-instructed priority feature, out of band
requirements:
  [FR-90, FR-91, FR-92, FR-93, FR-94, FR-95, FR-96, FR-97, FR-98, FR-99, FR-100, FR-101]
depends_on: []
spec_refs:
  - product/requirements.md#i-custom-decks
  - engineering/domain-model.md#10-customdeck-and-customcard
  - engineering/data-pipeline.md#11-cc-cedict-lookup-dataset-dec-037--a-second-independent-pipeline
  - project/decision-log.md#dec-036--custom-editable-json-shareable-flashcard-decks-added-to-v1-scope
  - project/decision-log.md#dec-037--full-cc-cedict-lookup-for-custom-deck-card-creation-customcardsource-and-attribution
touches:
  - src/domain/customDeck.ts (new)
  - src/domain/card.ts (StudyableCard)
  - src/domain/cedictLookup.ts (new)
  - src/services/storage.ts
  - src/services/customDecks.ts (new)
  - src/services/cedictLookup.ts (new)
  - src/features/customDecks/ (new)
  - src/features/study/Card.tsx
  - src/features/study/StudySession.tsx
  - src/features/levels/LevelSelect.tsx
  - src/app/App.tsx
  - pipeline/build-lookup.ts (new)
  - pipeline/match.ts (two exports added, no behaviour change)
  - scripts/run-build-lookup.mjs (new)
  - public/cedict-lookup/ (new)
  - .github/workflows/ci.yml
  - data/LICENSE
review_required: [White]
---

# WO-019 — Custom, editable, JSON-shareable flashcard decks, with CC-CEDICT lookup

## Context

Owner-instructed priority feature, requested for immediate public release,
outside the current milestone sequence (M5–M7 not yet started, M8 already
shipped — see [board](../board.md)). Learners can currently only study the
compiled CC-CEDICT/HSK decks. This adds decks a learner builds themselves,
which can be exported to a `.json` file and imported from one, so two learners
can hand a deck to each other outside the app. Recorded as
[DEC-036](../../project/decision-log.md).

**Scope refined mid-build ([DEC-037](../../project/decision-log.md)), the same
sequence-of-live-feedback pattern WO-018's Notes describes**: a custom card
must be addable by typing its Hanzi or Pinyin, with CC-CEDICT's own reading and
definitions filled in automatically so it "appear[s] exactly as they do in the
preexisting decks," while still letting the learner remove any definition they
don't want and add their own notes. The owner chose full-dictionary lookup
(~124,900 CC-CEDICT entries) over an HSK-only-scoped one when the tradeoff was
put to them directly — see DEC-037's context.

This is a real departure from [architecture](../../engineering/architecture.md)
§8's "no user-generated content in v1" assumption, corrected in the same
change. Custom decks are a parallel entity to the HSK `Deck`/`Card` model, not
a variant of it — see [domain-model](../../engineering/domain-model.md) §10 —
because the fields that exist to serve CC-CEDICT provenance and Red's review
workflow (`levels`, `review`, `homographGroup`) don't apply to content nobody
sourced from a dictionary; `source` is the one exception DEC-037 adds back, for
attribution purposes only, when a card *is* CC-CEDICT-sourced via the lookup.
Red's review loop is still out of scope: this exposes the same, already-trusted
CC-CEDICT corpus the HSK pipeline already ships from, through the same
formatting logic (`pipeline/match.ts`/`content-filter.ts`/`sense-annotations.ts`,
reused not reimplemented), with no HSK-specific curation happening — see
DEC-037's rationale for why that's a different, lower-risk category from Red's
actual adjudication job.

## Task

1. **Domain model** (`src/domain/customDeck.ts`): `CustomCard` and
   `CustomDeck` types, a schema version constant, and hard limits on deck
   count, cards per deck, and every free-text field's length (domain-model.md
   §10 states the exact figures — this file is where they're enforced).
2. **`StudyableCard`**: the minimal shape `Card.tsx` actually reads
   (`id`, `headword`, `reading`, `senses`, `classifiers?`). Widen
   `Card.tsx`'s prop type to this shape (structurally satisfied by both the
   HSK `Card` and a custom card's display projection) so the study UI is
   reused, not forked.
3. **Storage** (`src/services/storage.ts`): `loadCustomDecks`/
   `saveCustomDecks`, `localStorage`-backed, through the existing single
   storage seam — nothing else touches `localStorage` directly. `saveCustomDecks`
   reports success/failure (quota exhaustion is a real, visible-to-the-user
   possibility for this feature, unlike Settings) rather than swallowing every
   error silently.
4. **Service layer** (`src/services/customDecks.ts`): deck/card CRUD,
   `exportDeckToJson`, and `validateImportedDeck` — the last one is the
   untrusted-input boundary (DEC-036): every field type- and length-checked
   before it touches storage or the UI, never passed through `innerHTML` or
   any HTML-parsing sink. A successful import always mints a fresh local id.
5. **UI** (`src/features/customDecks/`): `CustomDeckList` (create, import
   from a `.json` file, export, delete, study, edit) and `CustomDeckEditor`
   (deck name/description, add/edit/delete cards) — styled to match the
   existing Ink & Paper direction, no new visual language introduced.
6. **Integration**: a "My Decks" entry point from Level Select;
   `StudySession` generalised to accept either an HSK level set (existing,
   unchanged fetch path) or a pre-loaded `CustomDeck` (no fetch — cards are
   already in memory), sharing every other mechanic (flip, Pinyin toggle,
   shuffle/sequential order, speak, keyboard nav) unmodified.
7. **CC-CEDICT lookup pipeline** (DEC-037, `pipeline/build-lookup.ts`,
   `npm run build:lookup`): compiles the full pinned CC-CEDICT release into
   `public/cedict-lookup/index.json` (compact search index) and
   `public/cedict-lookup/detail-{0..63}.json` (sharded full entries,
   `src/domain/cedictLookup.ts`'s `shardForId`). Independent of
   `build-data.ts`; no HSK matching. Reuses `match.ts`'s
   `foldForMatching`/`isCrossReferenceOnly`/`convertClassifier`,
   `content-filter.ts`'s vulgar filter, and `sense-annotations.ts`'s bracket
   cleanup rather than reimplementing any of them. Wired into CI
   (`npm run build:lookup` + a drift check, mirroring `build:data`'s).
8. **Runtime lookup service** (`src/services/cedictLookup.ts`):
   `loadLookupIndex` (fetch-once, cached, same pattern as `decks.ts`),
   `getLookupDetail` (fetches only the one shard a chosen id hashes to),
   and `searchLookupIndex` (Hanzi exact/prefix, Pinyin exact/prefix —
   toneless, numbered, or diacritic query, folded to one comparable key).
9. **`CustomDeckEditor` lookup UI**: a "Look up a word" box above the manual
   "Add a card" form. Selecting a candidate pre-fills headword/reading/senses
   into the same editable fields the manual path already uses — removing a
   definition is deleting its line from the senses textarea, no separate
   per-sense UI built. Sets `source: 'cc-cedict'` on the resulting
   `CustomCard`; a CC BY-SA 4.0 attribution notice
   (`services/customDecks.ts`'s `deckNeedsAttribution`) appears in both
   `CustomDeckList` and `CustomDeckEditor` whenever any card in the deck
   carries it, and `exportDeckToJson` adds an advisory `attribution` field to
   the exported file in that case.

## Acceptance criteria

1. A learner can create a custom deck, add/edit/delete cards (headword
   required; reading and notes optional; at least one sense required), and
   the deck persists across a reload.
2. A custom deck exports to a `.json` file, and that exact file re-imports
   (on the same device or a fresh profile) into a working, studyable deck
   with the same cards.
3. Import rejects, with a visible error and no partial write, a file that
   is not valid JSON, is missing required fields, or exceeds the documented
   size limits — verified with at least one malformed and one oversized
   fixture.
4. Nothing from an imported deck is ever rendered via `innerHTML` or
   equivalent — verified by inspection, not merely by absence of a visible
   bug.
5. A custom deck studies through the same `Card` component as HSK decks:
   flip, both-side Pinyin toggle, shuffled/sequential order, and Listen (when
   a voice is available) all work identically.
6. Deleting a custom deck requires confirmation and cannot be undone from
   the UI (exporting first is the stated mitigation, not a trash/undo
   mechanism — out of scope, see below).
7. `npm run typecheck`, `npm run lint`, `npm run format:check`, and
   `npm test` all green; new logic has test coverage including the
   validation boundary's rejection paths.
8. Verified in a real browser: create a deck, add two cards, export, delete
   the deck, re-import the exported file, study it end to end, zero console
   errors throughout.
9. A learner can look up a real word by Hanzi or by Pinyin (toneless,
   numbered, or diacritic input all work) from the "Add a card" form,
   select a candidate, and see the headword/reading/senses pre-filled
   exactly as CC-CEDICT (and `sense-annotations.ts`'s formatting) renders
   them — verified against at least one homograph headword (two distinct
   readings both offered as separate candidates).
10. Deleting a line from the pre-filled Meanings textarea before saving
    removes exactly that definition from the resulting card, and the other
    definitions are unaffected.
11. A deck containing at least one lookup-sourced card shows the CC BY-SA
    4.0 attribution notice in both `CustomDeckList` and `CustomDeckEditor`,
    and the exported `.json` includes the advisory `attribution` field; a
    deck with only hand-typed cards shows neither.
12. `npm run build:lookup` succeeds against the real pinned CC-CEDICT file,
    with the two documented real-corpus edge cases (invalid-Pinyin readings,
    the "square brackets [ ]" entries) skipped rather than crashing the
    build, and CI's drift check passes against the committed output.

## Out of scope

- Any change to the HSK/CC-CEDICT *pipeline that feeds the HSK decks*
  (`build-data.ts`, `build-cards.ts`, HSK matching/resolution, `data/`, or
  Red's review loop) — the new lookup pipeline (DEC-037) is deliberately
  independent of all of it, per its own docstring.
- Spaced repetition for custom decks (`CardProgress`/scheduler) — M5 scope,
  not built for HSK decks yet either; custom decks study in the same
  free-review shape `StudySession` already uses pre-M5.
- Sync or any transport for sharing beyond a plain file the user moves
  themselves (email, AirDrop, USB, etc.) — CLAUDE.md §03 defers sync for the
  whole app, not just this feature.
- A trash/undo for deck deletion — export-before-delete is the documented
  mitigation.
- Editing an HSK card, or converting an HSK card into a custom one — these
  remain two separate, non-interconvertible entities per DEC-036.
- Following a cross-reference-only CC-CEDICT entry to its target's senses in
  the lookup index (DEC-037's Decision §3) — a real, documented coverage gap
  for a small number of alternate-form headwords, not silently absorbed.
- A lookup control on the *edit-existing-card* form — only "Add a card" gets
  it; editing an already-added card (custom or lookup-sourced) uses the
  existing manual fields, matching what was actually requested.
- Per-character/per-syllable fuzzy or typo-tolerant Pinyin search — the
  toneless/numbered/diacritic fold (`services/cedictLookup.ts`'s
  `foldPinyinQuery`) is deliberately approximate, not a transliteration
  engine.

## Notes

Executed directly by Claude Code, per the owner's standing process change
(WO-015's Notes). No Red review required for either half of this work order —
see DEC-036 and DEC-037's rationale sections for why, argued separately for
each (no CC-CEDICT content at all vs. mechanical full-corpus exposure with no
new curation).
