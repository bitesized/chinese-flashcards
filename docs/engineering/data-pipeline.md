# Data Pipeline: CC-CEDICT and HSK

Owner: **Black** (implementation) with **Red** (linguistic authority and sign-off).
Status: **Draft, awaiting owner ratification.**

Satisfies CLAUDE.md §02: *"support the use of the CC-CEDICT dictionary, and infer
from that the Hanzi, Pinyin, and English for each word"* and *"support the division
of words into HSK vocabulary levels."*

This is the highest-risk component in the project. Every card the user sees comes
out of this pipeline, and an error here is invisible to a learner who by definition
cannot yet tell that it is wrong.

---

## 1. Principle

**The browser never parses CC-CEDICT.** All parsing, matching, validation, and
correction happens at build time and is committed as reviewed output. The runtime
consumes clean JSON only.

## 2. Stages

```
 1. acquire   → fetch and pin CC-CEDICT + HSK word lists
 2. parse     → CC-CEDICT text → structured entries
 3. index     → build headword → entries lookup
 4. match     → HSK list words → dictionary entries
 5. resolve   → homographs, cross-references, missing words
 6. override  → apply committed human corrections
 7. transform → numbered Pinyin → diacritics; extract classifiers
 8. validate  → schema + invariants; fail the build on violation
 9. emit      → six deck JSON files, font subset, build report
```

Stages 1–9 run as one command (`npm run build:data`) and in CI. The pipeline is
**deterministic**: the same inputs must produce byte-identical outputs, so that a
diff in the compiled decks always means a real change in the data. The one
necessary exception is `DeckMeta.builtAt` ([domain-model](domain-model.md) §6),
wall-clock time by definition — [testing-strategy](testing-strategy.md) §3 gate 9's
determinism check compares everything else.

## 3. Stage 2 — parsing CC-CEDICT

### Source format

CC-CEDICT is a plain UTF-8 text file, one entry per line. Lines beginning with `#`
are comments and metadata. The entry grammar is:

```
Traditional Simplified [pin1 yin1] /sense one/sense two/.../
```

Real examples:

```
中國 中国 [Zhong1 guo2] /China/Middle Kingdom/
你好 你好 [ni3 hao3] /hello/hi/how are you?/
行 行 [xing2] /to walk/to go/to travel/temporary/OK!/all right!/
行 行 [hang2] /row/line/profession/professional/
綠 绿 [lu:4] /green/
書 书 [shu1] /book/letter/document/CL:本[ben3],冊|册[ce4]/
兒 儿 [er2] /son/
一會兒 一会儿 [yi1 hui4 r5] /a moment/a while/in a moment/
```

### Parsing rules Black must implement

| Feature | Rule |
| --- | --- |
| Comments | Skip any line starting with `#`. The header carries the release date — capture it for `DeckMeta.dictionaryVersion`. |
| Field order | Traditional first, then Simplified. Getting this backwards is a silent, catastrophic error — assert with known fixtures. |
| Pinyin block | Between `[` and `]`, syllables space-separated, each with a trailing tone digit 1–5. |
| Neutral tone | Digit `5`. Also written `r5` for erhua 儿. |
| `ü` | Encoded as `u:` — e.g. `lu:4` = lǜ, `nu:3` = nǚ. Must be handled before diacritic conversion or the output is wrong. |
| Capitalisation | Proper nouns are capitalised in the Pinyin, e.g. `Zhong1 guo2`. Preserve it (UX spec §7.5). |
| Senses | Slash-delimited between the outer `/`. A sense may itself contain characters that look structural; split on `/` only at the top level. |
| Classifiers | Two shapes, both extracted to `classifiers` and removed from `senses`: an entire top-level sense of the form `CL:本[ben3],冊|册[ce4]`, **or** a classifier embedded parenthetically inside an otherwise substantive sense, e.g. `light; ray (CL:道[dao4])` ([DEC-026](../project/decision-log.md)). Multiple classifiers are comma-separated in either shape; each may use the `trad|simp[reading]` form. |
| Cross-references | Senses of the form `see 中國\|中国[Zhong1 guo2]`, `variant of …`, `old variant of …`, `abbr. for …`, `also written …`. Handled in stage 5. |
| `trad\|simp` notation | Inside a sense, a cross-reference to another headword may appear in any of three shapes: the full `繁體\|繁体[fan2 ti3]`, a bracket-less `trad\|simp` with no reading cited (e.g. `abbr. for 三項全能\|三项全能`), or — when traditional and simplified are identical — a pipe-less `word[reading]` (e.g. `erhua form of 一下[yi1 xia4]`). All three normalise for display to the simplified form only ([DEC-023](../project/decision-log.md)). Distinct from the pronunciation-variant-annotation bracket family (no word directly adjacent to `[`, e.g. `also pr. [tou4]`), which is a content decision, not syntax normalisation — see [WO-010](../workstream/work-orders/WO-010-pronunciation-annotation-brackets.md). |
| Register markers | `(coll.)`, `(lit.)`, `(fig.)`, `(dialect)` etc. **Preserve verbatim** — they are meaning, not noise. One exception: a sense marked `(vulgar)` or `(vulgar, offensive)` is dropped in its entirety, project-wide, by `pipeline/content-filter.ts` ([DEC-029](../project/decision-log.md)) — an owner decision, not this pipeline stage's own call. |
| Surname entries | `/surname Wang/`. Valid; keep. |
| Non-Han headwords | Some entries are Latin letters, digits, or punctuation. Reject at the invariant stage (domain-model §3 invariant 5). |
| Encoding | UTF-8 without BOM. Read explicitly as UTF-8; do not rely on platform default. |

Parser output is an intermediate `CedictEntry[]`, not yet a `Card`.

### Numbered Pinyin → diacritics (stage 7)

Rules, applied per syllable:

1. Replace `u:` with `ü` first.
2. Tone 5 (or no digit): no mark.
3. If the syllable contains `a`, the mark goes on the `a`.
4. Otherwise, if it contains `o` or `e`, the mark goes on that vowel. (`o` and `e`
   do not co-occur in a standard Pinyin syllable.)
5. Otherwise the mark goes on the **last** vowel. This is what produces `iù` for
   `iu4` (liù) and `uì` for `ui4` (duì) correctly.
6. Preserve capitalisation: `Zhong1` → `Zhōng`.
7. Join syllables with a single space, matching CC-CEDICT's grouping.
8. Erhua `r5` **fuses directly onto the end** of the preceding syllable's
   diacritic form, with no space and no mark of its own — `yi1 hui4 r5` → `yī
   huìr`, not `yī huì r` ([DEC-021](../project/decision-log.md)). A standalone
   `儿` word (`er2`) is unaffected: it is a complete syllable with its own full
   tone mark and, in a multi-syllable word, its own space, exactly like any
   other syllable.

This function is pure, is the subject of table-driven unit tests, and is verified
by round-tripping diacritics back to numbers for the whole corpus
([testing-strategy](testing-strategy.md) §3). Red supplies the test table; Black
implements. Tone marks on `ü` (ǖ ǘ ǚ ǜ) are the most commonly botched case and
must be in the fixture set explicitly.

## 4. Stage 1 & 4 — the HSK word lists

CLAUDE.md fixes the six levels: **1, 2, 3, 4, 5, 6**.

This is the **HSK 2.0** syllabus: six levels, roughly 5,000 words, published in
2010. It is **not** HSK 3.0 / the 2021 nine-band standard, which is a different and
larger syllabus with a different word list. Sourcing a list against the wrong
standard would silently produce the wrong product, so the pipeline records which
standard its list claims to follow and Red confirms it.

The levels are used whole. An earlier draft split levels 4, 5 and 6 into halves
following the *HSK Standard Course* textbook volumes; the owner has removed that
split, so each level is one deck. The consequence is uneven deck sizes — level 1 is
~150 words and level 6 is ~2,500 — handled by the per-level budget in NFR-4.

### The list is a level tag, not a content source

[DEC-017](../project/decision-log.md) fixes how the word list is used, and this is
the design point that matters most in this section:

**The pipeline extracts exactly one fact per word — which level it is in.** Hanzi,
Pinyin and English all come from CC-CEDICT, as CLAUDE.md §02 requires. No text from
the word list is shipped.

Where the source list carries Pinyin, that reading is used **during the build as a
matching key** to resolve homographs (§5.2), and then discarded. This is the single
most valuable property a candidate list can have: without readings, every ambiguous
word falls to manual review ([RISK-3](../project/risk-register.md)).

Two consequences follow. The HSK input reduces to a small two- or three-column
mapping file, so swapping it later is a one-file change that touches no shipped
card. And the licensing exposure reduces to the factual core — *word X is at level
N* — which is a fact about a published public standard
([RISK-2](../project/risk-register.md)).

### Sourcing

**Red owns the choice of list**, its verification, and its ongoing correctness
([WO-003](../workstream/work-orders/WO-003-hsk-word-list.md)). Red confirms the list
is HSK 2.0 rather than HSK 3.0, that per-level counts match
[domain-model](domain-model.md) §9, that entries are Simplified, and whether levels
are cumulative or new-words-only.

The list is committed to `data/source/hsk/` with a `SOURCE.md` recording where it
came from, when it was retrieved, which HSK standard it claims to follow, its stated
licence, its checksum, and Red's assessment. Source files are pinned so the build is
reproducible offline from a clean checkout.

## 5. Stage 5 — resolution

Three classes of problem, each needing an explicit, logged decision rather than a
silent default.

### 5.1 Cross-reference-only entries

Some CC-CEDICT entries have no substantive gloss:

```
甚麼 什么 [shen2 me5] /variant of 什麼|什么[shen2 me5]/
```

Domain-model invariant 2 forbids shipping a card whose only "meaning" is a pointer.
Resolution order:

1. Follow the reference to the target entry and adopt its senses, recording
   `source: 'cc-cedict+override'`.
2. If the reference cannot be resolved, route the word to Red for a manual gloss.
3. If Red cannot supply one, exclude the word and record it in the build report.

Never ship the raw cross-reference text as a definition.

### 5.2 Homographs

Per [domain-model](domain-model.md) §4, one headword may match several CC-CEDICT
entries with different readings. The pipeline must not guess by taking the first
match. Rules:

1. If the HSK source list supplies a reading, match on headword **and** reading.
   This is the reliable path and is a strong reason to prefer a source list that
   includes Pinyin — see [OQ-3](../project/open-questions.md).
2. If it does not, emit **all** matching readings as separate cards sharing a
   `homographGroup`.
3. Never merge senses across readings.
4. **Every homograph-derived card starts `review: 'unreviewed'`, regardless of
   which path resolved it** ([DEC-022](../project/decision-log.md)). Resolving a
   reading via an explicit source-list Pinyin match is a matching-key function
   only — it says nothing about whether that reading is genuinely the one the
   HSK syllabus intended at that level. A source list may bundle rare or
   unrelated readings under one headword (a surname sense alongside the common
   sense is the observed case; see `data/source/hsk/SOURCE.md` §5.3 for a
   worked example), so a source-supplied match must never be treated as
   pre-approved. Red decides, in review, which readings the level actually
   intends.

### 5.3 Words absent from CC-CEDICT

Expected to be a small number, concentrated in the higher levels. Not an error to
be swallowed:

1. Retry after normalisation (whitespace, variant characters, punctuation).
2. Report every unmatched word in the build report, grouped by level.
3. Red supplies a gloss and reading for each; it is committed as a manual override
   with `source: 'manual'`.
4. The build **fails** if any level has unmatched words that are neither resolved
   nor explicitly waived. Silent omission of vocabulary is a correctness bug, not
   a warning. "Explicitly waived" is `data/overrides/waived-words.json`
   ([DEC-027](../project/decision-log.md)) — a separate, committed, keyed-by-headword
   file, not an extension of the card-id-keyed override file in §6: a word with no
   card has no id to key an override against. A waiver is bookkeeping, not a
   resolution — it never supplies content, and is removed once a real override
   resolves the word.

## 6. Stage 6 — overrides

Human corrections live in `data/overrides/*.json`, keyed by card `id`, and are
applied after matching and before validation.

```json
{
  "行:hang2": {
    "senses": ["row", "line", "profession", "trade", "firm"],
    "note": "Dropped duplicate gloss; 'professional' is adjectival and misleading here.",
    "reviewedBy": "Red",
    "reviewedAt": "2026-09-01"
  }
}
```

This separation is the reason the pipeline is safe to re-run. CC-CEDICT is updated
frequently; regenerating decks must never discard Red's work. Because card `id`s
are deterministic ([domain-model](domain-model.md) §5), overrides re-attach
automatically after a dictionary update.

An override that no longer matches any card is a build **warning** listed in the
report — it usually means an upstream entry changed and needs re-review.

**Card synthesis.** An override whose id matches no card is instead **synthesised**
into a brand-new one when it supplies the complete required field set
(`headword`, `reading`, `readingNumeric`, `senses`, `levels`) —
[DEC-028](../project/decision-log.md). This is how a word absent from CC-CEDICT
entirely (§5.3), or unresolved by an automatic `ConflictingCedictEntries` /
`UnresolvedCrossReference` case, gets a real card once Red supplies one.

**Card exclusion.** A separate, committed file,
`data/overrides/excluded-cards.json`, keyed by card id
([DEC-028](../project/decision-log.md)) — Red's final, considered "this must
never ship" verdict on a card that is linguistically correct but not
genuinely part of the level it matched into (most commonly: an artefact
reading bundled under a headword whose *other* reading is the real syllabus
item, per §5.2's homograph rule). Distinct from `review: 'flagged'`, which
remains a live, build-failing signal for a problem still under discussion —
exclusion is what happens once that discussion is over and the answer is no.

Overrides may only be authored or amended off the back of a linguistic review
record ([communication-protocol](../team/communication-protocol.md) §5). Every
override carries its reviewer and date.

## 7. Licensing and attribution — mandatory

**CC-CEDICT is licensed CC BY-SA 4.0** (Creative Commons
Attribution-ShareAlike 4.0 International). This is a binding obligation, not a
courtesy, and it shapes the repository layout.

Required:

1. **Attribution** to CC-CEDICT, visible in the application (About screen, UX spec
   §4.5) and in the repository README.
2. **Licence notice and link** alongside the attribution.
3. **ShareAlike:** the compiled deck files are a derivative of CC-CEDICT and must
   themselves be distributed under CC BY-SA 4.0.
4. **Separation:** dictionary-derived data lives under `data/` and `public/decks/`
   under CC BY-SA 4.0, with its own `LICENSE` file. Application source code is
   licensed separately. The repository root `LICENSE` must state both, and which
   paths each covers. See [OQ-5](../project/open-questions.md) for the code licence.
5. **Indicate changes:** the derived files are modified (parsed, restructured,
   corrected via overrides). The build report and `SOURCE.md` constitute the record
   of modification and are committed.

The HSK word list carries a **separate and currently unknown** licence
([RISK-2](../project/risk-register.md)). It must be established before that data is
committed. Claude Code escalates this to the owner rather than deciding it.

## 8. Stage 8 — validation

The build fails, rather than warns, on any of:

- A domain-model invariant violation (§3 of that document).
- A duplicate card `id`.
- A card with zero senses.
- Pinyin that fails the diacritic round-trip.
- An unmatched HSK word not covered by an override or explicit waiver.
- A card marked `review: 'flagged'`.
- A level whose card count deviates from its expected count by more than a
  configured tolerance — this catches a mis-parsed or truncated source list, which
  is otherwise easy to miss.

## 9. Stage 9 — outputs

| Output | Path | Notes |
| --- | --- | --- |
| Deck files | `public/decks/hsk-{level}.json` | Six files; schema per domain-model §6 |
| Font subset | `public/fonts/` | Generated from the union of characters across all decks (architecture §6) |
| Build report | `data/build/report.md` | Committed. Unmatched words, homograph groups awaiting review, applied and orphaned overrides, per-level counts, source versions |
| Review queue | `data/build/review-queue.json` | Cards with `review: 'unreviewed'`, for Red |

The build report is committed deliberately: it makes content changes reviewable in
a diff, which is how a mistranslation gets caught before it ships.

## 10. Repository layout for data

```
data/
  source/
    cedict/   cedict_1_0_ts_utf-8_mdbg.txt   SOURCE.md
    hsk/      hsk-levels.<ext>                SOURCE.md
  overrides/  *.json
  build/      report.md   review-queue.json
  LICENSE                                     # CC BY-SA 4.0, covers derived data
public/
  decks/      hsk-1.json … hsk-6.json
```

Source files are committed and pinned by checksum. The pipeline must be runnable
offline from a clean checkout, so that a build is reproducible years from now
regardless of whether an upstream URL still resolves.

## 11. CC-CEDICT lookup dataset (DEC-037) — a second, independent pipeline

`npm run build:lookup` (`pipeline/build-lookup.ts`) compiles the **full**
pinned CC-CEDICT release (~124,900 entries) into a search dataset custom
decks' "Add a card" flow (WO-019) uses to look up any word by Hanzi or
Pinyin — not the ~5,259 words the main pipeline above compiles into the HSK
decks. It is independent of `build-data.ts`/`build-cards.ts` in both
directions: it does not run HSK matching (stage 5 above) at all, and nothing
in `public/decks/*.json` depends on it. The two pipelines share only their
common source (`pipeline/cedict.ts`'s `loadCedict`) and a handful of
formatting functions (`pipeline/match.ts`'s
`foldForMatching`/`isCrossReferenceOnly`/`convertClassifier`,
`content-filter.ts`'s vulgar-sense filter, `sense-annotations.ts`'s bracket
cleanup) — reused so a looked-up word's senses render byte-for-byte the same
way an HSK deck's do, never a second implementation of the same formatting.

**What differs from the main pipeline's matching**, because there is no HSK
row here to arbitrate ambiguity:

- A cross-reference-only entry (e.g. `"variant of 你好[ni3 hao3]"`) is
  **dropped, not resolved** — the main pipeline's cross-reference-following
  (§5.1) is itself HSK-row-triggered. The target headword remains
  independently searchable under its own entry; a small number of
  alternate-form-only headwords are simply not directly searchable. A real,
  documented limitation, not silently absorbed.
- Two or more substantive CC-CEDICT entries sharing one (headword, reading)
  (§5's "conflicting entries") are **dropped, not adjudicated** — there is no
  Red review loop for this dataset to route the ambiguity to (see this
  section's "Licensing and review" below).

**Real corpus edge cases found only by running this against the full file**
(never met by the HSK-scoped pipeline, since no HSK row references the
entries that trigger them): a handful of entries cite a literal digit as
their "reading" (`11区[11 Qu1]`, `双11[Shuang1 11]`) and fail Pinyin
conversion; two entries gloss square-bracket punctuation itself
(`"square brackets [ ]"`) and fail `sense-annotations.ts`'s bracket-shape
recognition. Both are skipped per-entry (or per-sense) rather than crashing
the build, counted and logged — see `pipeline/build-lookup.ts`'s own
docstring and `pipeline/build-lookup.test.ts`'s regression coverage.

**Outputs** (all committed and drift-checked in CI, same discipline as §9
above, but deliberately **not** pretty-printed — at ~120,000 entries the
2-space-indent overhead roughly doubles the payload for data nobody hand-reads
the way a ~150-word HSK deck's diff is):

| Output | Path | Notes |
| --- | --- | --- |
| Search index | `public/cedict-lookup/index.json` | One compact array of `[id, simplified, traditional\|null, readingNumeric]` tuples. ~116,500 rows, ~6.6 MB uncompressed, ~2.2 MB gzipped. Fetched in full exactly once per session, never on app boot. |
| Detail shards | `public/cedict-lookup/detail-{0..63}.json` | 64 files, `src/domain/cedictLookup.ts`'s `shardForId` (FNV-1a hash) picks the shard for a given id. Each ~300 KB. Fetched lazily, one shard at a time, only once a candidate is chosen. |
| Meta | `public/cedict-lookup/meta.json` | `schemaVersion`, `shardCount`, `dictionaryVersion`, `entryCount`, `builtAt` — so the runtime never has to guess how many shard files exist. |

**Licensing and review**: content here is exactly the same CC-CEDICT-derived
data `public/decks/*.json` already ships, under the same CC BY-SA 4.0
obligation (§7 above; `data/LICENSE`'s scope line covers
`public/cedict-lookup/` too) — but it is mechanical, whole-corpus exposure
with no HSK-specific curation or homograph adjudication happening, unlike
matching a *specific* HSK-assigned word to its *correct* CC-CEDICT reading.
DEC-037 records this as the reason Red's review loop does not apply to this
dataset.
