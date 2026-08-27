# Domain Model

Owner: **Black**, with **Red** as authority on all linguistic semantics.
Status: **Draft, awaiting owner ratification.**

Defines the entities the application reasons about, and the exact shape of the
compiled data. This is the contract between the [data pipeline](data-pipeline.md)
and the runtime.

---

## 1. Entities

| Entity | Meaning |
| --- | --- |
| **Card** | One studiable item: one written form with one pronunciation and its set of meanings. |
| **Deck** | An ordered collection of Cards, corresponding to exactly one HSK level. |
| **Level** | One of the six labels in CLAUDE.md §02: `1, 2, 3, 4, 5, 6`. |
| **Sense** | One English meaning of a Card, as supplied by CC-CEDICT. |
| **Session** | A runtime traversal of cards selected by the scheduler. Composition rules in [scheduling](scheduling.md) §5. |
| **CardProgress** | Persisted per-card scheduling state: when the card is next due, and what the scheduler knows about it. |
| **ReviewLogEntry** | An append-only record of one grading. Retained; see [scheduling](scheduling.md) §4. |
| **Settings** | Per-device user preferences. Persisted. |

## 2. Naming: written form, phonetic aid, meaning

Per [architecture](architecture.md) §7, the model does **not** name its fields
`hanzi`, `pinyin`, and `english`. It uses `headword`, `reading`, and `senses`, with
`hanzi`/`pinyin` available as script-specific aliases in the Mandarin deck's
metadata. This costs nothing now and is the difference between adding a language
later and rewriting the model later.

## 3. Card schema

The compiled, shipped form. TypeScript is the normative definition; the pipeline
and the runtime import the same type.

```ts
/** BCP-47 tag. 'zh-Hans' for v1. */
type LanguageTag = string;

type HskLevel = '1' | '2' | '3' | '4' | '5' | '6';

/** Provenance of a card's content, for audit and for review triage. */
type ContentSource = 'cc-cedict' | 'cc-cedict+override' | 'manual';

/** Result of Red's linguistic review. See testing-strategy.md §5. */
type ReviewStatus = 'unreviewed' | 'approved' | 'flagged' | 'corrected';

interface Card {
  /** Stable, deterministic. Format and derivation in §5. Never reused. */
  id: string;

  /** The written form shown on the front. Simplified Chinese in v1. */
  headword: string;

  /** Traditional-character form. Present when it differs from headword. */
  headwordTraditional?: string;

  /** Pronunciation, display-ready, with tone diacritics. e.g. 'nǐ hǎo' */
  reading: string;

  /** Pronunciation as CC-CEDICT supplies it, numbered tones. e.g. 'ni3 hao3'.
   *  Retained for sorting, search, diffing, and regression tests. */
  readingNumeric: string;

  /** English meanings, in CC-CEDICT source order. Never empty. */
  senses: string[];

  /** Measure words / classifiers, extracted from CC-CEDICT CL: annotations.
   *  Rendered separately per UX spec §4.2. */
  classifiers?: Classifier[];

  /** Every level this card belongs to. Normally one; an array because a word
   *  can legitimately appear in more than one published list. */
  levels: HskLevel[];

  /** Set when this headword has multiple readings — see §4. Cards sharing a
   *  homographGroup are distinct cards for the same written form. */
  homographGroup?: string;

  source: ContentSource;
  review: ReviewStatus;
}

interface Classifier {
  simplified: string;
  traditional: string;
  reading: string;        // diacritics
  readingNumeric: string; // numbered
}
```

### Invariants

Enforced by the pipeline; violations fail the build (see
[testing-strategy](testing-strategy.md) §3).

1. `id` is unique across the entire corpus, not merely within a deck.
2. `senses` is non-empty. A card with no usable English gloss is not shippable —
   see [data-pipeline](data-pipeline.md) §5 on cross-reference-only entries.
3. `reading` and `readingNumeric` describe the same pronunciation; the diacritic
   form is derived from the numeric form and this is verified by round-tripping.
4. `levels` is non-empty and contains only the six permitted labels.
5. `headword` contains at least one CJK ideograph and no Latin letters.
6. If `homographGroup` is set, at least two cards share it and their `reading`
   values differ.
7. No card is shipped with `review: 'flagged'`.

## 4. Homographs — the central modelling problem

A single Chinese written form frequently has two or more distinct pronunciations
with distinct meanings (多音字):

| Form | Reading | Meaning |
| --- | --- | --- |
| 行 | xíng | to walk; to be OK |
| 行 | háng | a row; a profession; a firm |
| 长 | cháng | long |
| 长 | zhǎng | to grow; elder; chief |
| 觉 | jué | to sense, to feel |
| 觉 | jiào | sleep (as in 睡觉) |

CC-CEDICT stores these as **separate entries with the same headword**. The
decision, per [DEC-004](../project/decision-log.md), is that they are **separate
cards**, linked by `homographGroup`, not one card with merged senses.

Merging is wrong on the learning merits: it would show a learner one card reading
"to walk / a row / a profession", which is not a fact about the language. It would
also make audio incorrect, since one written form would map to two pronunciations
and the speech engine would have to guess.

**Consequence for the pipeline:** matching an HSK word list entry to CC-CEDICT is
not a one-to-one lookup. A single HSK list entry may match multiple CC-CEDICT
entries, and the pipeline must decide which reading(s) the list intends. This is
the largest source of expected error and is why Red's review exists.
See [data-pipeline](data-pipeline.md) §6 and [RISK-3](../project/risk-register.md).

## 5. Identifiers

```
id = <headword>:<readingNumeric normalised>
e.g.  行:xing2      行:hang2      你好:ni3hao3
```

Properties this gives us:

- **Deterministic** — the same input produces the same id on every build, so decks
  diff cleanly between CC-CEDICT releases and review status survives regeneration.
- **Homograph-safe** — the reading is part of the identity, so 行/xíng and 行/háng
  cannot collide.
- **Level-independent** — a word that appears in two lists keeps one identity, so
  overrides and review records attach to the word, not to a level.

Normalisation for the id: spaces removed, `u:`/`ü` folded to `v`, **case
preserved** ([DEC-024](../project/decision-log.md) — case is content-bearing:
it is what distinguishes a proper-noun/surname reading, e.g. `都:Du1`, from a
common reading, e.g. `都:du1`; lowercasing would collide the two).
The id is opaque to the UI; nothing may parse it.

## 6. Deck schema

```ts
interface Deck {
  schemaVersion: number;       // bumped on any breaking shape change
  language: LanguageTag;       // 'zh-Hans' in v1
  level: HskLevel;
  /** Display name, e.g. 'HSK 4'. */
  title: string;
  cards: Card[];
  meta: DeckMeta;
}

interface DeckMeta {
  cardCount: number;
  /** Publication date of the CC-CEDICT release used. */
  dictionaryVersion: string;
  /** Identifier of the HSK word list source. See data-pipeline.md §4. */
  wordListVersion: string;
  builtAt: string;             // ISO 8601
  reviewSummary: Record<ReviewStatus, number>;
}
```

One file per level: `hsk-1.json` … `hsk-6.json`. Six files.

`meta` is not decoration. `dictionaryVersion` and `wordListVersion` are what make
a content bug reproducible, and `reviewSummary` is what the milestone gate in
[roadmap](../project/roadmap.md) checks.

## 7. Learner state

Persisted on-device. Never sent anywhere. Schemas and semantics in
[scheduling](scheduling.md) §4; repeated here only as the contract with the
storage layer.

`CardProgress` and `ReviewLogEntry` are keyed on `Card.id`. Because ids are
deterministic ([DEC-005](../project/decision-log.md)), progress survives a deck
rebuild and a CC-CEDICT update — this is the property that makes the two halves of
the system safe to evolve independently, and it is why the id scheme is fixed from
M1.

```ts
interface LearnerState {
  schemaVersion: number;
  progress: Record<string, CardProgress>;   // by Card.id
  reviewLog: ReviewLogEntry[];              // append-only
  settings: Settings;
}
```

`LearnerState` is exactly what FR-69 exports and imports. It is defined as one
object for that reason: an export that omits part of the state is a backup that
silently fails to restore.

## 8. Runtime-only types

Never persisted; rebuilt on each session.

```ts
interface Session {
  deckIds: HskLevel[];
  /** Card ids in scheduler-determined order — scheduling.md §5. */
  queue: string[];
  position: number;
  face: 'front' | 'back';
  /** Free review does not write scheduling state. FR-66. */
  mode: 'scheduled' | 'free-review';
  gradedThisSession: number;
}
```

interface Settings {
  schemaVersion: number;
  pinyinFront: boolean;        // default true  — DEC-007
  pinyinBack: boolean;         // default true  — DEC-007
  cardOrder: 'shuffled' | 'sequential';  // default 'shuffled' — FR-32
  speechRate: 'normal' | 'slow';         // default 'normal'
  autoplayOnReveal: boolean;             // default false — FR-41
  theme: 'system' | 'light' | 'dark';    // default 'system'
  lastLevels: HskLevel[];                // FR-25
  newCardsPerDay: number;                // default 10 — FR-65
  dayStartHour: number;                  // default 4 — scheduling.md §5
}
```

`Settings.schemaVersion` is mandatory from the first release. Without it, the
first change to the settings shape breaks every existing user's stored state with
no migration path.

## 9. Scale

Approximate, from the HSK 2.0 syllabus. Confirm against the actual source list
during M1 — see [data-pipeline](data-pipeline.md) §4.

| Level | New words (approx.) |
| --- | --- |
| 1 | 150 |
| 2 | 150 |
| 3 | 300 |
| 4 | 600 |
| 5 | 1,300 |
| 6 | 2,500 |
| **Total** | **~5,000** |

At roughly 150–250 bytes per compiled card, the full corpus is on the order of
1 MB uncompressed.

Note the distribution: levels 1–3 total ~600 words between them, while level 6
alone is ~2,500. Deck sizes therefore differ by more than an order of magnitude,
which is why NFR-4 sets a per-level budget rather than a single figure, and why
decks are fetched individually and cached
([DEC-003](../project/decision-log.md)). A beginner never downloads level 6.

## 10. `CustomDeck` and `CustomCard`

Added by [DEC-036](../project/decision-log.md), extended by
[DEC-037](../project/decision-log.md). Learner-authored decks — a **parallel**
entity to `Deck`/`Card` above, not a variant of it: `levels`, `review`, and
`homographGroup` exist to serve CC-CEDICT provenance and Red's linguistic
review workflow, neither of which applies to content nobody sourced from a
dictionary in the ordinary case. `source` is the one field carried over, and
only for attribution bookkeeping (below) — its presence does not mean this
entity re-enters Red's review process.

```ts
interface CustomCard {
  /** Stable within the deck. Generated client-side, never parsed. */
  id: string;
  headword: string;
  /** Optional — a learner may not know or need Pinyin for their own words. */
  reading?: string;
  /** Non-empty. Learner's own wording, or CC-CEDICT's (see `source`),
   *  editable/removable per card either way. */
  senses: string[];
  notes?: string;
  /** Set only when headword/reading/senses were populated via the
   *  CC-CEDICT lookup (DEC-037's WO-019 follow-up), not hand-typed. Absent
   *  (never `false`) for an ordinary manual entry. Editing the senses
   *  afterwards does NOT clear it — the card is still substantially
   *  CC-CEDICT-derived even once a definition has been trimmed. Drives the
   *  CC BY-SA 4.0 attribution notice, required because this field existing
   *  at all means the card carries redistributed CC-CEDICT content
   *  (CLAUDE.md §04's inherited obligation). */
  source?: 'cc-cedict';
}

interface CustomDeck {
  schemaVersion: number;
  /** Stable, generated on creation. Regenerated on import so an imported
   *  file never silently overwrites an existing local deck sharing an id. */
  id: string;
  name: string;
  description?: string;
  cards: CustomCard[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```

**Limits** (`src/domain/customDeck.ts`'s `CUSTOM_DECK_LIMITS`, enforced
identically for manual entry and for JSON import — FR-101): 50 decks per
learner, 1,000 cards per deck, and per-field length caps (name 120, description
500, headword 100, reading 200, 20 senses per card at 500 characters each,
notes 1,000). These exist because an imported `.json` file is untrusted input
by construction (a file another learner produced), not because any of these
numbers reflect a real design target for hand-typed use.

**Storage**: `localStorage`, through the single seam
([architecture](architecture.md) §4) — same tier as `Settings`, a deliberately
lighter choice than `CardProgress`'s IndexedDB, since custom decks are
expected to stay small (tens to low hundreds of cards, not thousands written
per session).

**The CC-CEDICT lookup dataset** (DEC-037) that populates a card's
headword/reading/senses on request is a *separate*, build-time-compiled
artifact — `public/cedict-lookup/index.json` (a full search index, fetched
once) and `public/cedict-lookup/detail-{0..63}.json` (sharded full entries,
fetched lazily per candidate) — documented in
[data-pipeline](data-pipeline.md) §11 and defined in `src/domain/cedictLookup.ts`.
It is read-only reference data, structurally unrelated to `CustomDeck`/`CustomCard`
themselves; a card only carries a copy of what the learner chose to keep.
