# Decision Log

Owner: **Claude Code**. Per [conventions](../engineering/conventions.md) §6, a
decision that exists only in a conversation does not exist.

**Status values:** `Proposed` (made by Claude Code, awaiting owner ratification) ·
`Accepted` · `Superseded by DEC-###` · `Rejected`.

Per CLAUDE.md §06, decisions consistent with CLAUDE.md may be taken by Claude Code
and recorded here. Decisions that contradict it must be escalated first.

---

## DEC-001 — No backend in v1
**Status:** Accepted · **Date:** 2026-08-24

**Context.** CLAUDE.md §03 requires a web application on desktop and mobile and
explicitly defers synchronisation.

**Decision.** v1 ships as a static, client-only application. No server, no
database, no accounts.

**Rationale.** Without sync there is no server-side state to keep. A backend would
add hosting cost, an operational burden, latency, and a privacy surface, for no
user-visible benefit. It also makes edge caching trivial, which is most of NFR-1.

**Consequences.** All dictionary processing moves to build time. Settings and
progress are device-local. Adding sync later means adding a backend and an account
system — a real cost, accepted deliberately, and mitigated by the storage seam in
[architecture](../engineering/architecture.md) §4.

---

## DEC-002 — Compile the dictionary at build time
**Status:** Accepted · **Date:** 2026-08-24

**Context.** CC-CEDICT is a ~120,000-entry text file with an idiosyncratic grammar.

**Decision.** Parse, match, validate, and correct at build time. Ship per-level
JSON. The browser never sees CC-CEDICT.

**Rationale.** Parsing on-device would cost several megabytes of download and
seconds of CPU on every load, breaking NFR-1 and NFR-4. More importantly, it would
make correctness a runtime property. Compiling makes content a reviewable artefact
that Red can inspect and CI can gate.

**Consequences.** A dictionary update requires a rebuild and redeploy — acceptable,
since CC-CEDICT changes slowly. Compiled decks are committed so content changes
appear in diffs.

---

## DEC-003 — One deck file per HSK level
**Status:** Accepted · **Date:** 2026-08-24

**Decision.** Six files, `hsk-1.json` … `hsk-6.json`, fetched on demand and
cached.

**Rationale.** The corpus is ~5,000 words and HSK 6 alone is ~2,500. A single
bundle would exceed NFR-4 and would make a learner at HSK 1 — 150 words — download
the entire syllabus. Level is also the natural unit of study, so it is the natural
unit of caching.

**Consequences.** Deck sizes are very uneven, from ~150 cards to ~2,500. NFR-4
therefore sets a per-level budget rather than one figure. If level 6 proves too
large in practice, it is chunked internally behind the same loader — a change
invisible to the rest of the app.

---

## DEC-004 — Homographs are separate cards
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** Red

**Context.** Many Chinese written forms have several readings with distinct
meanings — 行 xíng / háng, 长 cháng / zhǎng. CC-CEDICT stores these as separate
entries with the same headword.

**Decision.** Each reading is its own card, linked by `homographGroup`. Senses are
never merged across readings.

**Rationale.** Merging would present "to walk / a row / a profession" as one word's
meaning, which is false. It would also make audio undecidable: one card, two
pronunciations, and the speech engine guessing. Splitting matches how the language
actually works and how learners are taught it.

**Consequences.** HSK-list matching becomes one-to-many and cannot be resolved
automatically without a reading in the source list. This is the largest expected
source of content error and drives [RISK-3](risk-register.md), the preference for a
Pinyin-bearing word list in [OQ-3](open-questions.md), and Red's review scope.

---

## DEC-005 — Deterministic card identifiers from headword and reading
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Decision.** `id = <headword>:<normalised numeric reading>`, e.g. `行:hang2`.

**Rationale.** Deterministic ids let decks be regenerated without losing human
corrections, because overrides and review records re-attach by id. Including the
reading makes homographs distinguishable. Excluding the level keeps one identity
for a word that appears in more than one list.

**Consequences.** Changing the id scheme later would orphan every override, so it
is fixed from M1. Ids are opaque to the UI.

---

## DEC-006 — Corrections live in override files, never in generated decks
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Decision.** Human corrections are committed to `data/overrides/`, keyed by card
id, and applied during the build.

**Rationale.** Generated files are overwritten by the next build. Without this
separation, every dictionary update would silently destroy Red's work. This is what
makes the pipeline safe to re-run.

**Consequences.** Overrides carry reviewer and date. An override matching no card
is a build warning, because it usually signals an upstream change needing
re-review.

---

## DEC-007 — Pinyin defaults to visible on both faces
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** FR-11 makes front and back Pinyin independent, but a default must be
chosen.

**Decision.** Both default to on.

**Rationale.** CLAUDE.md frames Pinyin as an aid — "to assist with pronunciation
and learning." A first-time user who cannot yet read Hanzi and is shown a character
with no pronunciation has no way in; a user who does not want Pinyin knows what it
is and can turn it off. The default should serve the person who does not yet know
what they need.

**Consequences.** Discoverability of the toggle matters more than it otherwise
would, which is why FR-14 puts it on the study screen.

---

## DEC-008 — CSS Modules with design tokens; no utility framework, no component library
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** White

**Context.** CLAUDE.md §04 asks White for design "without falling into
AI-generated webapp tropes."

**Decision.** CSS Modules plus custom-property design tokens. No Tailwind or
similar; no component library.

**Rationale.** Utility frameworks and component libraries carry strong default
aesthetics that converge on precisely the house style the brief rules out. Tokens
also make theming (FR-54) a matter of swapping a variable set. The app's surface is
small enough that a framework's ergonomic benefit is marginal here.

**Consequences.** More CSS written by hand. Token discipline must be enforced in
review ([conventions](../engineering/conventions.md) §3).

---

## DEC-009 — Web Speech API, with visible degradation
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** CLAUDE.md §02 requires computer voice. Availability of a Mandarin
voice varies by platform and cannot be guaranteed.

**Decision.** Use the built-in Web Speech API. Detect a `zh-CN` voice; where none
exists, disable the control and say why (FR-43). No audio-file fallback in v1.

**Rationale.** It is free, offline on most platforms, and requires no backend
(DEC-001). Pre-generated audio for ~5,000 words would add hundreds of megabytes and
its own licensing question; a cloud TTS would add cost and a server. Honest
degradation is better than either.

**Consequences.** Some users — notably on Linux Firefox and Android without the
Google TTS pack — get no audio. Tracked as [RISK-4](risk-register.md).

---

## DEC-010 — Simplified characters are the v1 headword
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** CC-CEDICT supplies both forms. HSK is a mainland standard and its word
lists are Simplified. CLAUDE.md says "Hanzi (Mandarin)" without specifying.

**Decision.** Cards display Simplified. Traditional forms are retained in the data
model but not shown in v1.

**Rationale.** The HSK syllabus that defines the content is Simplified, so
Simplified is the coherent default. Retaining the traditional form costs a few
bytes per card and makes a traditional mode a UI change rather than a data
migration.

**Consequences.** See [OQ-2](open-questions.md) for whether the owner wants a
traditional mode in v1.

---

## DEC-011 — CLAUDE.md sits at the repository root as index and constitution
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** owner instruction

**Decision.** CLAUDE.md holds the canonical statements and indexes the detailed
documents, and lives at the repository root. Detail lives in topic documents under
`docs/`. No document may contradict CLAUDE.md.

**Rationale.** Direct owner instruction. A single short source of truth stays
readable and stays read; detail that accumulates in it would not.

**Consequences.** Every document header names an owner and a status, and CLAUDE.md
§06 must be updated whenever a document is added or moved. The root location is
also where Claude Code loads project context from automatically, so the source of
truth is in scope by default rather than needing to be found.

---

## DEC-012 — Work is routed through committed files, not conversation
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** CLAUDE.md §04 makes Claude Code responsible for an efficient agent
communication system. Subagents are stateless and cannot address each other.

**Decision.** Work orders, reports, and reviews are committed markdown files
indexed by a board. All routing passes through Claude Code.

**Rationale.** A stateless agent needs a self-contained brief, so the brief must be
written down. Once written down, committing it costs nothing and gives the owner a
legible project state that does not require replaying a transcript, and that
survives any session ending.

**Consequences.** Some overhead per task. Mitigated by the batching rules in
[communication-protocol](../team/communication-protocol.md) §9.

---

## DEC-013 — FSRS as the scheduling algorithm, via a library
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** The owner has put spaced repetition in scope, and CLAUDE.md §02 now
requires it. An algorithm must be chosen.

**Decision.** FSRS, using a pinned open-source TypeScript implementation rather
than a hand-port. Fall back to SM-2, hand-implemented, only if no suitably licensed
library exists.

**Rationale.** Leitner boxes are too coarse to justify building a scheduler at all.
SM-2 is sound and would be defensible. FSRS models per-card difficulty and
stability explicitly and achieves better retention for the same review volume; the
extra state is a few numbers per card, which costs nothing here. A library rather
than a port because scheduling bugs are silent — a wrong interval looks plausible
and its cost only appears months later.

**Consequences.** A runtime dependency, which must be GPL-3.0 compatible and
version-pinned. More per-card state (§4 of [scheduling](../engineering/scheduling.md)),
and an append-only review log that is retained rather than discarded. The library's
own test vectors run in our suite so a version bump cannot silently change
behaviour. Reversible: the scheduler sits behind one module boundary.

---

## DEC-014 — Progress is device-local, with export/import as the durability answer
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** CLAUDE.md §03 defers synchronisation. With spaced repetition in scope,
the app now holds months of review history that cannot be regenerated, in a single
browser profile, in storage the browser may evict.

**Decision.** Progress stays device-local for v1. Durability is addressed by three
required measures rather than by adding sync: request persistent storage (NFR-16),
full export and import of learner state (FR-69, a MUST), and explicit confirmation
before any destructive action (FR-68).

**Rationale.** Adding sync would contradict CLAUDE.md §03 and pull in a backend and
accounts, both explicitly out of scope. But shipping SRS with no recovery path is
not an acceptable reading of "sync isn't important" either — losing a year of
history is a data-loss defect, not a missing convenience. Export/import is the
minimum honest answer, and it is a few hours of work.

**Consequences.** The learner is responsible for their own backups, which must be
made obvious in the UI rather than buried in settings. `LearnerState` is modelled
as a single object so an export cannot silently omit part of it
([domain-model](../engineering/domain-model.md) §7). Sync becomes the clearest
post-v1 priority.

---

## DEC-015 — Six HSK levels; the A/B split is removed
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** owner instruction

**Context.** The project originally specified nine levels — 1, 2, 3, 4A, 4B, 5A,
5B, 6A, 6B — splitting levels 4 to 6 in halves following the *HSK Standard Course*
textbook volumes. The owner has removed the split.

**Decision.** Six levels: 1, 2, 3, 4, 5, 6. Each is one deck. CLAUDE.md §02 updated.

**Rationale.** Owner instruction. It also removes a real sourcing hazard: the A/B
boundary is a property of a particular textbook edition rather than of the HSK
standard, so different published lists split it differently and the choice would
have silently defined the product's content.

**Consequences.** Deck sizes become very uneven — ~150 cards at level 1, ~2,500 at
level 6 — so NFR-4 sets a per-level budget rather than one figure, and Level Select
must not imply the levels are comparable units of work. Sourcing is simpler: any
standard HSK 2.0 list will do, with no edition-matching required.

---

## DEC-016 — GPL-3.0 for application code; CC BY-SA 4.0 for dictionary data
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** owner instruction

**Decision.** Application source is GPL-3.0. Dictionary-derived data under `data/`
and `public/decks/` remains CC BY-SA 4.0, inherited from CC-CEDICT. The root
`LICENSE` states which terms cover which paths.

**Rationale.** Owner instruction, qualified as "where possible" — and CC BY-SA 4.0
on the data is not a choice, it is an obligation inherited from the source
([RISK-1](risk-register.md)). Keeping code and data separately licensed in separate
paths is the standard way to honour both without either contaminating the other.

**Consequences.** Every runtime and build dependency must carry a GPL-3.0-compatible
licence; MIT, BSD, ISC and Apache-2.0 all are, and Black checks this per dependency
([conventions](../engineering/conventions.md) §4). Since v1 ships no server, plain
GPL-3.0 rather than AGPL is the right instrument — the app is conveyed to the
browser, which is what triggers the obligation. If a backend is added for sync
post-v1, whether AGPL is wanted becomes a fresh question for the owner.

---

## DEC-017 — HSK level assignment comes from the official syllabus, taken as a level tag only
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated · **Owner: Red**

**Context.** The project needs to know which HSK level each word belongs to. The
published lists that encode this are widely republished with unclear provenance and
frequently no stated licence ([RISK-2](risk-register.md)), and the owner has asked
that this not block the start of work.

**Decision.** Three parts, and the second is the important one:

1. **Source.** The level assignment derives from the official HSK 2.0 syllabus
   (汉语水平考试词汇大纲, Hanban / Chinese Testing International), obtained through a
   publicly published machine-readable list. Red selects the specific list, with
   **a list that carries Pinyin strongly preferred** — see WO-003.
2. **The list is taken as a *level tag only*.** The pipeline extracts exactly one
   fact per word: which level it is in. Every piece of content a learner sees —
   Hanzi, Pinyin, English — comes from CC-CEDICT, as CLAUDE.md §02 requires. Where
   the source list carries Pinyin, it is used **during the build as a matching key**
   to disambiguate homographs, and then discarded. No text from the word list is
   shipped.
3. **Attribution regardless.** The syllabus and the specific list used are credited
   in `SOURCE.md` and in the About screen, whether or not attribution is strictly
   required.

**Rationale.** Part 2 is what makes this decidable now rather than after a legal
review. What the project takes is the factual core — *word X is at level N* — which
is a fact about a published public standard, not a creative work, and the selection
is dictated by an external authority rather than by the compiler's judgement. Taking
nothing but the mapping is both the minimal taking and, independently, the better
architecture: the HSK input becomes a small two-column mapping file rather than a
content source, so swapping it later is a one-file change with no effect on any
shipped card.

CC-CEDICT remains the sole source of content, which is what CLAUDE.md §02 specifies
and which keeps the content licensing story clean and single-sourced.

**Consequences.** Red owns the choice of list and its ongoing correctness. If a
candidate turns out to carry restrictive terms, the fallback is another list of the
same facts — the mapping is identical either way, which is precisely why this is not
a blocker. If a source is ever found to be genuinely encumbered in a way that
survives the level-tag-only reduction, that is a licensing matter and returns to the
owner under [charter](../team/charter.md) §4.

---

## DEC-018 — Visual direction is chosen by Claude Code from White's options, and stays swappable
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** [UX spec](../product/ux-specification.md) §2 gives White a strong brief
but "unique" is a judgement. This was previously an owner gate at M2; the owner has
asked that nothing block the build.

**Decision.** White presents at least two genuinely distinct directions at M2 —
different type, palette, and card treatment, not one design in two colourways.
Claude Code selects one and the build proceeds. The unselected direction is kept in
the repository as a token set.

**Rationale.** Because the design system is custom-property tokens
([DEC-008](decision-log.md)), a direction is a variable set rather than a rewrite.
That makes the choice genuinely cheap to reverse, which is what allows it to be made
without the owner and revisited whenever the owner wants — the owner is shown the
options at M2 and can swap at any point after.

**Consequences.** The M2 gate no longer waits on an owner decision. Token discipline
becomes load-bearing: any component that hard-codes a colour breaks the swap.

---

## DEC-019 — Cloudflare Pages, free tier, no custom domain
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Decision.** Deploy the static build to Cloudflare Pages on the free tier, on the
provided subdomain.

**Rationale.** The app is static ([DEC-001](decision-log.md)), so any static host
serves. Cloudflare Pages has a generous free tier, good global edge coverage — which
is most of NFR-1 — and needs no card on file. Choosing now removes a decision from
M7; it is trivially reversible, since deploying a static build elsewhere is an
afternoon.

**Consequences.** Zero cost, so no escalation. If a custom domain or a paid tier is
ever wanted, that is money and returns to the owner
([charter](../team/charter.md) §4).

---

## DEC-020 — Export prompted after 30 days, never automatic
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Decision.** Export (FR-69) is manual. If no export has been made in 30 days and
there is meaningful history at risk, the app shows one unobtrusive, dismissible
reminder with the export control to hand.

**Rationale.** Automatic downloads on a schedule are intrusive and browsers make
them awkward. Manual-only relies on the learner remembering, which they will not,
and the thing they lose is irreplaceable ([RISK-7](risk-register.md)). A single
prompt tied to actual risk is the honest middle.

**Consequences.** Requires tracking the last export date in settings. The prompt
must be genuinely dismissible and must not recur aggressively.

---

## DEC-021 — Erhua's `r5` fuses onto the preceding syllable with no space
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** Red

**Context.** [data-pipeline](../engineering/data-pipeline.md) §3 rule 8 says the
erhua suffix "joins the preceding syllable without a mark" but, as written, does
not say whether that join is a direct fusion (`huìr`) or a space-separated token
(`huì r`). Red surfaced this as underspecified while producing the Pinyin
conversion test table ([WO-006](../workstream/work-orders/WO-006-pinyin-test-table.md)).

**Decision.** Fusion, no space: `yi1 hui4 r5` → `yī huìr`, not `yī huì r`. A
standalone `儿` word (`er2`) is unaffected — it is a complete syllable with its
own full tone mark and, in a multi-syllable word, its own space, exactly like any
other syllable.

**Rationale.** Standard Pinyin orthographic practice never sets the `-r` suffix
off with a space. Rule 7's general space-joining rule governs ordinary
syllable-to-syllable joins; it does not contradict a fusion special-case at rule 8
covering the erhua suffix specifically.

**Consequences.** [data-pipeline](../engineering/data-pipeline.md) §3 rule 8 is
reworded to state this explicitly, so the ruling is discoverable there and not
only in `data/test-fixtures/pinyin-conversion.json`. Reversible: a single rule in
one function.

---

## DEC-022 — A homograph card's review status does not depend on how its reading was resolved
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated, per Red's finding

**Context.** [data-pipeline](../engineering/data-pipeline.md) §5.2 states that
when the HSK source list supplies a reading, the pipeline matches on headword
**and** reading (the "reliable path"); when it does not, the pipeline emits all
matching readings and marks every one `review: 'unreviewed'`. As written, the
first path does not state a review status, leaving it ambiguous whether a
source-resolved match is implicitly treated as pre-approved. Red, verifying the
pinned HSK list ([WO-003](../workstream/work-orders/WO-003-hsk-word-list.md)),
found concrete cases where this would matter: `都` (HSK 1) bundles `dōu` ("all",
the real syllabus item) with `dū` ("capital") and `Dū` ("surname Du"); `还`
(HSK 2) similarly bundles a surname reading. A source-supplied reading resolves
*which card the word matches* — it says nothing about whether that reading is
genuinely the one the HSK syllabus intended at that level.

**Decision.** Every homograph-derived card starts `review: 'unreviewed'`,
regardless of whether its reading was resolved via an explicit source-list
reading or emitted ambiguously across all matching readings. Resolving *which*
reading a source list intends is a matching-key function only; it is never
grounds to skip or short-cut review.

**Rationale.** The distinction data-pipeline §5.2 rule 1 vs. rule 2 draws is
about how a reading is *selected*, not about whether the resulting card is
*correct*. Conflating the two would risk shipping unreviewed cards like
`都:Du1` (surname) as an HSK 1 item. [testing-strategy](../engineering/testing-strategy.md)
§5 already mandates 100% review of HSK 1–3 and 100% review of homograph groups at
HSK 4–6, so this decision costs nothing extra in review volume — it only closes a
gap in what the pipeline's initial `review` field would otherwise imply.

**Consequences.** [data-pipeline](../engineering/data-pipeline.md) §5.2 is
reworded to state this explicitly. Binding on WO-007 (HSK matching, homograph
resolution) once written — Black must not special-case a source-supplied match as
review-exempt.

---

## DEC-023 — `trad|simp` sense normalisation covers all three shapes CC-CEDICT actually uses
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated

**Context.** [data-pipeline](../engineering/data-pipeline.md) §3's "trad|simp
notation" row gives one worked example, `繁體|繁体[fan2 ti3]` — trad, pipe, simp,
bracketed reading, all four parts present. Building the parser
([WO-004](../workstream/work-orders/WO-004-cc-cedict-parser.md)), Black checked
the full pinned corpus and found this same "point at another headword,
optionally with a reading" reference actually appears in three shapes: the
spec's full form, a bracket-less `trad|simp` with no reading cited (751 senses,
e.g. `"abbr. for 三項全能|三项全能"`), and a pipe-less `word[reading]` where
traditional and simplified happen to be identical (e.g. `"erhua form of
一下[yi1 xia4]"`). All three leak the same raw `|`/`[`/`]` syntax
[testing-strategy](../engineering/testing-strategy.md) §3 gate 4 exists to keep
out of shipped senses.

**Decision.** The normalisation to "display the simplified form only" applies
to all three shapes, not only the fully-specified one. Implemented as a single
pattern in `pipeline/cedict.ts`.

**Rationale.** This is a mechanical, non-linguistic substitution — always
prefer the form CC-CEDICT already treats as standard — not a translation
judgement, so it does not require Red's sign-off. Applying it to only the
letter of the spec's one example would leave the parser's own "no leaked
syntax" purpose unmet on 751+ real senses while its acceptance criterion was
technically satisfied.

**Consequences.** [data-pipeline](../engineering/data-pipeline.md) §3's
"trad|simp notation" row is reworded to name all three shapes. Does **not**
cover a separate, unrelated bracket family — pronunciation-variant annotations
with no word directly adjacent to the bracket (`"also pr. [tou4]"`, 818 senses)
— which is a genuine open content decision, not a syntax-normalisation one. See
[WO-010](../workstream/work-orders/WO-010-pronunciation-annotation-brackets.md),
routed to Red.

---

## DEC-024 — Card id normalisation preserves case; amends DEC-005/domain-model §5
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** delegated (DEC-005 is
itself recorded `Authority: delegated`)

**Context.** [WO-007](../workstream/work-orders/WO-007-hsk-matching-resolution.md)
(Black), building the matcher against the real pinned HSK 1 list, found that
[domain-model](../engineering/domain-model.md) §5's stated id normalisation
("lowercase, spaces removed, `u:` folded to `v`") produces a real, live id
collision: `都` has two distinct, both-substantive CC-CEDICT entries — `Du1`
("surname Du") and `du1` ("capital city") — the exact pair
[DEC-022](decision-log.md) already uses as its own worked example. Lowercasing
both readings collapses them to the identical id `都:du1`, violating
[domain-model](../engineering/domain-model.md) §3 invariant 1 (id uniqueness)
on real HSK 1 data, not a synthetic case. Verified independently by Claude Code
against the pinned corpus before this decision was made.

**Decision.** Drop the lowercasing step. Id normalisation is: spaces removed,
`u:`/`ü` folded to `v`, **case preserved**. `id = <headword>:<reading, spaces
removed, u:/ü→v, case as CC-CEDICT wrote it>` — e.g. `都:Du1` and `都:du1` are
now distinct.

**Rationale.** CC-CEDICT's capitalisation is content-bearing, not decorative —
it is the only signal distinguishing a proper-noun/surname reading from a
common reading in exactly the cases DEC-022 is about. Lowercasing for id
purposes silently destroys the one piece of information that makes those
readings distinguishable, which is a strictly worse outcome than a
slightly-less-uniform-looking id string. Ids are opaque to the UI
([domain-model](../engineering/domain-model.md) §5) — nothing depends on them
being lowercase — so this costs nothing outside id readability, and directly
removes the defect at its root rather than working around it downstream.

**Consequences.** [domain-model](../engineering/domain-model.md) §5's
normalisation line is corrected to match. `pipeline/identifiers.ts`'s
`normalizeReadingKey` must be updated to stop lowercasing (WO-007's matching
key already deliberately stayed case-sensitive for this exact reason — see
that work order's report — so this brings the id scheme in line with matching
behaviour that was already correct). Existing tests asserting lowercase id
output need updating. Reversible in principle, but per DEC-005's own
consequences note, changing the scheme again later would orphan overrides —
this correction should land before any real override content is authored
(none exists yet), which is why it is being made now rather than deferred.

**Not fixed by this decision**: a second, distinct real conflict — 里 (`里`)
has two same-case, same-reading (`li3`), both-substantive CC-CEDICT entries
that simplify from different traditional characters (`裡`/"lining, interior"
and `里`/"li, unit of distance; neighborhood"). Case preservation cannot
distinguish these, since neither is a proper-noun reading. WO-007 correctly
ships neither candidate rather than guessing
(`ConflictingCedictEntries`) — this needs a manual override once Red's review
reaches HSK 1, tracked on the board rather than resolved here.

---

## DEC-025 — Ship HSK 1 first; build the app against it; add remaining levels incrementally
**Status:** Accepted · **Date:** 2026-08-24 · **Authority:** owner instruction

**Context.** The original M1 plan compiled all six HSK decks and required Red
to complete 100% linguistic review of HSK 1–3 (~600 cards) before M2 (the
core card UI) could begin. The owner asked to reorder this: get the HSK 1
corpus (~150 words) fully reviewed and correct first, then start building the
application against that smaller, complete-and-trustworthy set, adding the
remaining levels' review and exposure in later updates rather than finishing
review of the whole ~5,000-word corpus before any UI work starts.

**Decision.**
1. **M1's gate now requires only HSK 1** to have Red's 100% linguistic
   review complete (down from HSK 1–3). All six decks are still compiled and
   committed at M1 — compilation is fully automated and inexpensive; it is
   the *review* effort, not the compilation, that gated M2 unnecessarily.
   HSK 2–6 exist as compiled-but-unreviewed decks after M1 and are not yet
   exposed to a learner.
2. **M2 develops and is gated against HSK 1 specifically** — already true of
   its existing gate criterion 1 ("A full HSK 1 pass is completable"), now
   stated as deliberate scope rather than an example.
3. **M3 (Level selection) gains a new prerequisite**: Red's 100% review of
   HSK 2 and HSK 3, since M3 is the milestone that makes multiple levels
   reachable and studiable by a learner — a level should not become reachable
   before it is reviewed. HSK 4–6 remain on their original schedule: sampled
   review before M7 (release candidate), per
   [testing-strategy](../engineering/testing-strategy.md) §5's existing,
   unchanged coverage table — that table already specified sampled-not-full
   review for HSK 4–6 "at v1," so nothing about final coverage changes, only
   *when in the milestone sequence* HSK 2–3's full review happens.

**Rationale.** Review is the expensive, human-judgement-bound resource in
this project (Red, not automation). Gating all UI work on reviewing the full
corpus upfront means M2–M6 development sits idle behind ~600 cards of review
before a single component gets built or tested against real content, and it
means a change discovered while building the UI against HSK 1 could ripple
through review work already done on levels the UI hasn't even touched yet.
Building against the smallest complete, correct slice first, then expanding,
is both faster to a working app and lower-risk: UI assumptions get tested
against real (if minimal) data early, and later levels benefit from whatever
the HSK 1 build cycle teaches about the data shape.

**Consequences.** [Roadmap](roadmap.md) M1 and M3 gates are updated to match.
`data-pipeline`/`domain-model`/`testing-strategy` need no change — the
pipeline already compiles all six levels in one pass (WO-007/WO-008), and
testing-strategy §5's per-level coverage targets are unchanged, only
resequenced. WO-009 (Red's review work order, not yet dispatched) is scoped to
HSK 1 only; a follow-on work order for HSK 2–3 is raised before M3, not M1.
Reversible: if this proves to slow the project down instead (e.g. the UI
needs vocabulary breadth sooner than expected), the review schedule can be
pulled forward again at the cost of Red's time, same as any milestone
resequencing.

---

## DEC-026 — Classifier extraction covers embedded `(CL:...)`, not only top-level `CL:` senses
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated

**Context.** Wiring [WO-008](../workstream/work-orders/WO-008-validation-gates-build-report.md)'s
no-leaked-syntax gate against real HSK-1 data failed on common, basic words —
光 ("light"), 菜 ("vegetable"), 门 ("door"), among others. [data-pipeline](../engineering/data-pipeline.md)
§3's "Classifiers" row and its worked example (`CL:本[ben3],冊|册[ce4]`) only
show a classifier annotation as an entire top-level, `/`-delimited sense —
the shape WO-004's parser already extracted correctly. The real corpus also
uses a second shape: a classifier embedded parenthetically inside an
otherwise substantive sense, e.g. `"light; ray (CL:道[dao4])"` (real line
10577) — one `/`-delimited sense, not two. 85 entries in the pinned corpus
use this shape. Compounding it, the existing `trad|simp[reading]`
cross-reference normalisation ([DEC-023](decision-log.md)) matches the
embedded classifier's own `道[dao4]` (a bare word directly against a
bracket, indistinguishable in shape from a real cross-reference), stripping
the reading and leaving a bare `CL:` marker behind.

**Decision.** `pipeline/cedict.ts`'s classifier extraction also recognises a
`(CL:...)` parenthetical embedded anywhere within an otherwise-substantive
sense, extracting it into `classifiers` and removing it (and the
parenthesis) from the sense text — run before DEC-023's normalisation, so
the classifier's own reading is never mistaken for a cross-reference and
stripped.

**Rationale.** Same category of fix as DEC-023: the specification's one
worked example understates the real shapes CC-CEDICT actually uses, found
by testing against real data rather than assumed. Mechanical and
non-linguistic — extracting a classifier annotation wherever it occurs is
not a translation judgement, so it does not require Red's sign-off.

**Consequences.** `pipeline/cedict.ts`'s `parseSenseBlock` gains
`extractEmbeddedClassifier`, tested against the real corpus line for 光 and
a multi-classifier real line (菜). data-pipeline.md §3's "Classifiers" row
should be updated to name both shapes next time that document is revised.

---

## DEC-027 — "Explicitly waived" is a new, separate committed file, not an extension of card overrides
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated

**Context.** [data-pipeline](../engineering/data-pipeline.md) §5.3 and §8
require the build to fail on any HSK word that is neither resolved to a card
nor "explicitly waived in the override file," but does not specify a schema
for a waiver. Running [WO-008](../workstream/work-orders/WO-008-validation-gates-build-report.md)'s
gates against real HSK 1–6 data found 88 headwords genuinely unresolved
(17 unmatched, 9 unresolvable cross-references, 62 same-key CC-CEDICT
content conflicts — [WO-007](../workstream/work-orders/WO-007-hsk-matching-resolution.md)'s
report already named 里 as one instance; the real count is far larger,
spanning common HSK 1 words such as 你, 和, 岁, 年, 喂). The existing override
mechanism (`pipeline/overrides.ts`) is keyed by `Card.id` and *corrects an
existing card* — it cannot represent "this word has no card yet, and that
gap is known," since there is no id to key against.

**Decision.** A new, separate, committed file,
`data/overrides/waived-words.json`, keyed by headword, recording the reason,
affected levels, a detail string, who waived it and when, and where its
resolution is tracked (a work order id). Generated once as a snapshot of
every currently-unresolved word (`Claude Code`, 2026-08-25, tracked in
WO-009) — **not regenerated on every build.** `pipeline/validate.ts`'s
level-coverage gate checks this file per `(headword, level)`; anything
neither resolved nor present here still fails the build.

**Rationale.** A silently-regenerated waiver file would make gate 6
worthless — it would auto-waive its own findings every run and never catch
a regression. A committed, human/process-controlled file preserves the
gate's actual purpose: a *future* build that newly fails to resolve a word
not already in this file still fails loudly. This is not a resolution of
any of the 88 words — no linguistic judgement is exercised; it is bookkeeping
that makes the real gap visible and trackable rather than blocking the
build outright before Red's review (WO-009) has had a chance to run.

**Consequences.** `pipeline/waivers.ts` added. Every waived word must be
individually removed from `data/overrides/waived-words.json` as Red resolves
it via a real override (WO-009 onward) — a waiver left in place after its
word is resolved is harmless (the gate checks resolution first) but should
be cleaned up so the file stays an accurate to-do list. Several waived words
are not full gaps — e.g. 日 (day/sun) has a correct, resolved card; only a
redundant secondary source-list form ("abbr. for Japan," capitalised `Ri4`)
failed to match — noted in the WO-008 report rather than re-encoded in the
waiver file's structure, to keep this decision's scope to the mechanism, not
a per-word audit.

---

## DEC-028 — Card exclusion is a new, separate mechanism; card synthesis extends the existing override schema
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated

**Context.** [WO-009](../workstream/work-orders/WO-009-hsk1-linguistic-review.md)
(Red's full HSK 1 review, [LR-002](../workstream/reviews/LR-002-hsk1-review.md))
found two real, symmetric gaps in the pipeline, both already anticipated in
`pipeline/overrides.ts`'s own docstring as unimplemented:

1. **No way to create a card.** `applyOverrides` can only mutate a `Card`
   `pipeline/match.ts` already produced. For `ConflictingCedictEntries` and
   `UnresolvedCrossReference` rows, no card is ever produced at all — Red
   needed to resolve 8 real HSK-1 words this way (你, 和, 回, 家, 里, 年, 岁,
   喂), all correct and ready but inert against the mechanism as it stood.
2. **No way to remove a card.** The only lever for "must not ship" is
   `review: 'flagged'`, which fails the *entire* six-level build
   (data-pipeline.md §8) and does not actually remove the card from
   `public/decks/*.json` (`pipeline/build-data.ts`'s `main()` writes deck
   files before checking `validation.ok`) — so it cannot mean "exclude this
   one card and otherwise proceed." Red found 38 real HSK-1 cards needing
   exactly this: linguistically correct CC-CEDICT content that is not part
   of the actual HSK-1 syllabus (surname readings, bound forms, archaic
   registers — all artefacts of the pinned HSK list nesting every CC-CEDICT
   reading of a headword under one entry, exactly as
   `data/source/hsk/SOURCE.md` §5.3 and [DEC-022](decision-log.md)
   anticipated in the abstract; WO-009 is the first time it was measured:
   ~21% of the shipped HSK-1 deck).

**Decision.**
1. **Card synthesis** extends `pipeline/overrides.ts`'s existing
   `applyOverrides`: an override whose id matches no card, but supplies the
   complete required field set (`headword`, `reading`, `readingNumeric`,
   `senses`, `levels`), is synthesised into a new `Card` (`source` defaults
   to `'manual'`, `review` to `'unreviewed'` if the override doesn't say
   otherwise). An override missing part of that set is still reported
   orphaned, exactly as before.
2. **Card exclusion** is a new, separate mechanism, structurally parallel to
   [DEC-027](decision-log.md)'s waiver file: `data/overrides/excluded-cards.json`,
   keyed by card id, applied by a new `pipeline/exclusions.ts` after
   overrides and before validation. Excluding a card also recomputes
   `homographGroup` membership among what remains — a lone survivor's tag is
   cleared, since domain-model.md §3 invariant 6 requires at least two
   members. `review: 'flagged'` keeps its original meaning: a live,
   in-corpus card with an unresolved problem still under discussion, which
   should keep failing the build until resolved. Exclusion is the opposite
   case — Red has already looked, and the final, considered answer is
   "never ship this" — so it must not re-fail the build on every run.

**Rationale.** Both are the natural, minimal extensions of an existing
schema rather than new ones invented from nothing — Red's own recommendation
in both cases, and `overrides.ts`'s prior docstring already named exactly
this shape as the reason it was deferred rather than guessed at during
WO-007. Keeping exclusion separate from flagging (rather than overloading
`review: 'flagged'` to also mean "and now skip it") preserves flagging's
value as a build-failing signal for problems still open.

**Consequences.** `data/overrides/excluded-cards.json` (38 entries, derived
from Red's `lr-002-hsk1-flags.json` — the linguistic rationale lives there;
the exclusion file only needs to mechanically act on it) and
`data/overrides/lr-002-hsk1-manual-cards.json` (8 entries) both now take
effect. `loadOverrides()` must not treat `waived-words.json` or
`excluded-cards.json` as `CardOverride` files — found as a real bug while
integrating this change (`excluded-cards.json` shares all 38 ids with
`lr-002-hsk1-flags.json` by construction, which the directory-wide `*.json`
scan collided on); fixed by name-excluding both from that scan. The 8
resolved waivers are removed from `waived-words.json` in the same change,
per DEC-027. HSK-1 now closes at 154 cards (184 − 38 excluded + 8
synthesised), zero `unreviewed`, zero `flagged` — M1's gate criterion is met.

**Broader effect found while integrating**: `pipeline/exclusions.ts`'s
homograph-membership recomputation runs over the *entire* corpus, not only
the 38 HSK-1 exclusions — and in doing so, corrected a pre-existing,
unrelated violation of [domain-model](../engineering/domain-model.md) §3
invariant 6 across HSK 2–6: `pipeline/match.ts`'s homograph grouping
(WO-007, unchanged) assigns `homographGroup` based on every *resolved*
reading of a headword before knowing whether each will actually become a
card — so a headword whose second reading was always a
`ConflictingCedictEntries`/`UnresolvedCrossReference` case (never a card, at
any point, independent of Red's review) still shipped its lone surviving
card with a vacuous group tag. 22 such tags across HSK 2–6 are cleared by
this same change (e.g. `系:ji4`, whose only sibling reading, `xi4`, has never
been resolvable). Not a regression — a real, pre-existing gap this
integration was the first code path to actually check.

---

## DEC-029 — Project-wide, mechanical filter for vulgar/NSFW CC-CEDICT senses
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** owner instruction

**Context.** Red's [LR-002](../workstream/reviews/LR-002-hsk1-review.md)
review escalated a genuine content-policy question CLAUDE.md does not
address: CC-CEDICT carries vulgar/explicit senses on a small number of
otherwise entirely ordinary headwords — the HSK-1 instance found was 日
("day/sun"), which also glosses "(vulgar) to fuck; to have sex with," a
sense with no relevance to a beginner learning the character for "day."
Red resolved 日 with a one-off override, but asked whether this should
instead be a standing filter across every level, since re-catching each
instance by hand at HSK 2–6 does not scale and risks missing one.

**Decision.** A standing, mechanical, project-wide filter over a per-card
judgement call. CC-CEDICT marks this register explicitly and consistently:
every instance surveyed in the pinned corpus (35 senses,
`grep -c "([Vv]ulgar" data/source/cedict/...`) uses the literal
parenthetical `(vulgar)` or `(vulgar, offensive)`, leading or trailing the
sense. Any sense containing this marker is dropped **in its entirety** — not
just the marker text, matching Red's own precedent for 日 — before a card's
senses reach validation. A card reduced to zero senses is dropped entirely
(domain-model.md §3 invariant 2) rather than shipped empty; not observed for
any real HSK-matched word as of this decision (the two words that intersect,
日 and 干, both keep several ordinary senses after filtering).

**Rationale.** The marker is unambiguous and consistently applied by
CC-CEDICT itself — this is pattern-matching on the dictionary's own explicit
register annotation, not content judgement Claude Code is making
independently. A per-card call, repeated across ~5,000 words, both costs
real reviewer time on every future level and risks an inconsistent miss;
a mechanical filter applied once is consistent by construction. Ordinary
register markers ("(coll.)", "(lit.)", "(fig.)", "(dialect)") remain
untouched and verbatim, per data-pipeline.md §3 — only this one marker,
explicitly named by the owner's decision, is filtered.

**Consequences.** `pipeline/content-filter.ts` added, run in stage 7 (before
`pipeline/sense-annotations.ts`, so a soon-to-be-dropped vulgar sense is
never needlessly processed for bracket annotations). Applies to every level,
not only HSK 1. Verified against the full pinned corpus: 33 cards had a
vulgar sense removed (including 日:ri4 and 干:gan4, both real HSK words —
日's removal is now redundant with Red's own `lr-002-hsk1-corrections.json`
override, harmlessly so), and separately verified this does **not** filter
legitimate dictionary content that happens to contain the word "vulgar" as
part of a real gloss (e.g. `庸俗:yong1su2` → "vulgar", meaning
tacky/unrefined — correctly untouched, since it carries no `(vulgar)`
marker). Reversible: a single, narrowly-scoped regex in one pipeline stage.

---

## DEC-030 — "Ink & Paper" selected as the active visual direction
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated (DEC-018)

**Context.** WO-011 built two complete, swappable token sets per
[DEC-018](decision-log.md): "Ink & Paper" (warm paper ground, ink text, a
single muted seal-red accent reserved for state, humanist serif for English
prose, small restrained radii, one hairline-bordered card that is the only
element allowed a shadow) and "Slate & Brass" (cool grey ground, brass
accent, sans-serif throughout, larger radii, no card border, a more
pronounced shadow). Both honour
[UX spec](../product/ux-specification.md) §1's principles and §2's
avoid-list; DEC-018 delegates the choice between them to Claude Code.

**Decision.** "Ink & Paper" is the active direction, applied by default
(`src/app/main.tsx` imports `theme-ink-paper.css`); "Slate & Brass" ships
committed and complete (`src/styles/theme-slate-brass.css`) but unselected.

**Rationale.** Verified in a real browser (Chromium via Playwright,
`localhost:5173`, both desktop and a 360px viewport): the warm paper ground
and restrained single-accent palette keep the Hanzi the visually dominant
element on the card, consistent with §1's "character is the interface"
principle, and the serif/sans split (serif for English glosses, plain sans
for UI chrome) gives the dictionary-like register §2 asks for without extra
decoration. Neither direction violates the avoid-list; "Ink & Paper" was
preferred as the sharper, more legible default for a first ship, not because
"Slate & Brass" is deficient.

**Consequences.** Swapping direction later is a one-line import change in
`src/app/main.tsx` plus a `data-theme` attribute the app shell already
applies (no component touches a raw colour value — token discipline per
DEC-008/DEC-018 held throughout WO-011). No component-level rework needed if
the owner later prefers "Slate & Brass".

---

## DEC-031 — M4 (Audio) pulled forward, executed before M3 (Level selection)
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** owner instruction

**Context.** The [roadmap](roadmap.md)'s original milestone order is
M3 (Level selection) then M4 (Audio). The owner has asked that computer
voice (CLAUDE.md §02: "must support computer voice") be prioritised now,
ahead of M3. M3's own content half was already pushed later once, by
[DEC-025](decision-log.md) (HSK 2–3's review resequenced from M1 to
immediately before M3); this decision reorders the milestones themselves,
not just content review within one of them.

**Decision.** M4's deliverables (speech service, audio controls on both
card faces, speech-rate and autoplay-on-reveal settings) are built next, as
WO-012, before any M3 work is dispatched. Milestone numbers and their
deliverable lists are **not** renumbered or rewritten — M3 remains "Level
selection" and M4 remains "Audio" exactly as scoped in the roadmap; only
the *execution order* changes. This mirrors the roadmap's own existing
caveat on M2/M5 ("ordering is provisional... M5 replaces the queue source
and nothing else") rather than introducing a new pattern.

**Rationale.** M4 has no real dependency on M3: audio is a control added to
the `Card`/`StudySession` components M2 already built and gated against
HSK 1, and works identically regardless of how many levels are reachable in
Level Select. M3's own prerequisite (Red's 100% review of HSK 2–3,
[DEC-025](decision-log.md)) is unaffected and unstarted either way, so
pulling M4 forward costs nothing in review time and does not block or
reorder any linguistic work already committed to. Renumbering milestones
throughout `docs/` for a single reordering would touch many cross-references
(this very decision log has three: DEC-025, DEC-029's context, WO-011's
front matter) for no benefit over stating the change once, here.

**Consequences.** [Roadmap](roadmap.md) gets a note recording the new
execution order without changing M3/M4's content. `docs/workstream/board.md`
reflects M4 as the milestone in progress; M3 stays "Not started" until M4
closes. WO-012 is scoped to M4's existing deliverable list, built against
HSK 1 only (the one level Level Select currently exposes, per DEC-025) —
audio does not need multi-level Level Select to be useful or testable.
Reversible: if the owner later wants strict numeric order restored, no code
changes are implied, only a further sequencing note.

---

## DEC-032 — M4's homograph gate is unsatisfiable as originally worded; amended to what TTS can actually distinguish
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated

**Context.** [Roadmap](roadmap.md) M4 gate #3 requires Red to confirm
pronunciation is correct on a sample "including at least one homograph
pair, where the two cards must be spoken differently." Building WO-012
against real HSK-1 data surfaced a structural conflict this gate did not
anticipate: [architecture.md](../engineering/architecture.md) §5's
constraint 6 mandates speaking `card.headword` (the Hanzi), never the
Pinyin — "passing Pinyin to a `zh-CN` voice produces nonsense." But every
homograph pair, by construction (domain-model.md §4), shares one identical
`headword` string; that is the definition of a homograph. HSK-1's three
pairs — 哪 (nǎ/něi), 东西 (dōngxī/dōngxi), 多少 (duōshǎo/duōshao) — differ
**only** in reading, and the Hanzi text carries no signal that could tell
them apart. Sending the same string to the same voice at the same rate
cannot produce two different utterances; no phonetic-hint mechanism exists
in the Web Speech API's `SpeechSynthesisUtterance` that any current browser
actually honours (SSML/phoneme markup is not supported in practice, despite
appearing in some early drafts of the spec). This is not an implementation
gap in WO-012 — it is a direct, unavoidable consequence of the Hanzi-only
constraint applied to a class of word the constraint's authors did not
consider when the gate was written.

**Decision.** Roadmap M4 gate #3 is reworded: Red verifies that the
*correct headword text and `lang` are dispatched per card* — i.e., that the
speech service never mixes up which card's content is being spoken, and
that a homograph pair's two cards each independently produce a
correctly-formed `zh-CN` utterance of their own headword — rather than
verifying the two homograph cards are *audibly distinguishable*, which is
struck as an unachievable requirement under the current architecture. The
underlying capability (correct Mandarin speech, FR-40/FR-42) is unaffected
and fully met; what's withdrawn is a specific verification claim this
project cannot make honestly.

**Rationale.** Claiming a gate is met when it cannot be, or quietly
skipping it without a record, are both worse than naming the limitation
plainly and adjusting what is actually being verified to something
achievable and honest. No practical fix exists within the current stack:
SSML/phoneme hints aren't reliably supported cross-browser, and the
project's own architecture decision (Hanzi-only input, DEC-009's sibling
constraint) was made deliberately and for a sound reason (Pinyin-as-text
input is worse, not better). Revisiting *that* decision to chase
homograph-level TTS accuracy would be a disproportionate response to three
words in one HSK level.

**Consequences.** Real, visible product limitation, worth the owner
knowing: **a learner using the speak control on 哪/东西/多少's less-common
reading will hear the character's default pronunciation, not necessarily
the one the card represents.** Tracked here rather than in
[risk-register.md](risk-register.md) since it is a known, permanent
characteristic of the chosen architecture, not an uncertain risk. Future
homograph words at HSK 2–6 will have the same property; no new review
burden per level, since Red's amended check (headword/lang correctness) is
mechanical, not per-word linguistic judgement. Reversible only by revisiting
the Hanzi-only constraint itself (e.g. a future TTS API with real phoneme
control), which is out of scope for v1.

---

## DEC-033 — Vacuous `homographGroup` cleanup extended to the content filter's own drops
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated (bug fix, not a new judgement call)

**Context.** [DEC-028](decision-log.md) established that dropping a card
must clear a surviving sibling's now-vacuous `homographGroup` tag
(domain-model.md §3 invariant 6), implemented as `applyExclusions`'s
cleanup step. Preparing for HSK 2–3's linguistic review (WO-013, M3)
surfaced a case that fix didn't cover: `pipeline/content-filter.ts`
(DEC-029) can also drop a card entirely (a card whose every sense is
vulgar) — a separate, later pipeline stage — and this path never ran the
same cleanup. Confirmed for real in the pinned corpus: 草:cao4 (HSK 3,
"(vulgar) damn/f*ck") is dropped entirely, leaving its sibling 草:cao3
("grass") carrying a `homographGroup: "草"` tag pointing at a group of one.

**Decision.** Extracted the cleanup into a standalone, reusable
`clearVacuousHomographGroups` (`pipeline/exclusions.ts`, its natural home
since it already documented the invariant), called by both
`applyExclusions` and, newly, `build-data.ts` directly after
`applyContentFilter` — independent of *why* a sibling disappeared, since
invariant 6 doesn't care which mechanism removed it.

**Rationale.** This is the same invariant DEC-028 already decided on,
applied consistently to a pipeline stage that came later and was missed —
not a new design choice, just closing a gap in an existing one.

**Consequences.** `public/decks/hsk-3.json`: 草:cao3's `homographGroup`
field removed; every other field, and every other card across all six
levels, byte-identical apart from `builtAt`. `content-filter.ts`'s
docstring corrected — it previously claimed no HSK-matched word was ever
dropped entirely, which was already false for 草 by the time this was
checked. Regression tests added (`pipeline/exclusions.test.ts`) covering
the case where a sibling is entirely absent from the input, not merely
filtered out internally, since that's the shape this bug actually took.

---

## DEC-034 — `homographGroup` recomputed from scratch over the final card set, superseding vacuous-clearing
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** delegated (bug fix, extends DEC-033's same invariant)

**Context.** Red's WO-013/[LR-004](../workstream/reviews/LR-004-hsk2-3-review.md)
review hit a case DEC-033 didn't cover: a *newly synthesized* manual card
(DEC-028) can share a headword with an existing card that initial matching
(`pipeline/match.ts`, which only groups homographs once, before any
override or synthesis runs) never linked. Real instance: 只:zhi3 ("only")
already shipped, untagged; this review's manual card 只:zhi1 (classifier)
is genuinely the same kind of pair `homographGroup` exists to link
(domain-model.md §4), but nothing connected them — `CardOverride` has no
`homographGroup` field, and DEC-033's fix only ever *removes* a tag, never
adds one.

**Decision.** Replaced DEC-033's `clearVacuousHomographGroups` (called from
`build-data.ts`) with `recomputeHomographGroups` (`pipeline/exclusions.ts`):
instead of patching whatever tag a card happened to carry from initial
match time, it recomputes group membership from scratch over the *final*
surviving card set — every headword with 2+ cards carrying distinct
readings (case-sensitive, via `match.ts`'s existing `foldForMatching`, now
exported) gets tagged, every other card is untagged. `applyExclusions`
keeps its own internal `clearVacuousHomographGroups` call too (harmless,
now redundant but nothing depends on removing it, and its existing tests
stay meaningful) — the full recomputation runs once, last, in
`build-data.ts`, after content-filtering.

**Rationale.** A full recomputation is strictly more correct than patching:
it handles DEC-033's original case (a sibling dropped, tag now vacuous)
*and* this new case (a sibling added late, tag never assigned) with one
mechanism, because both are really the same underlying fact — "does this
headword currently have 2+ distinct readings among cards that will
actually ship" — recomputed fresh rather than incrementally maintained
through however many stages can add or remove a card.

**Consequences.** `public/decks/hsk-3.json`: 只:zhi1 and 只:zhi3 now both
carry `homographGroup: "只"`. No other card's grouping changed (verified:
the recomputation produces identical output to the prior mechanism for
every other homograph group across all six levels). Regression tests added
covering the newly-linked case, the still-cleared vacuous case, an
already-correct group left with the same object identity (no unnecessary
copies), non-homograph same-headword-same-reading pairs, and the
case-sensitive surname/common-reading distinction. Future card synthesis
never needs its own `homographGroup` field — this recomputation makes one
unnecessary.

---

## DEC-035 — Hanzi lookup and handwriting practice added to v1 scope; stroke data licensed under the Arphic Public License
**Status:** Accepted · **Date:** 2026-08-25 · **Authority:** owner instruction

**Context.** The owner asked for a new capability beyond CLAUDE.md's
original v1 scope (§02 previously described only whole-word flashcards,
Pinyin, computer voice, and spaced repetition — no per-character reference
or handwriting practice): a Hanzi section supporting character lookup
(stroke order, Pinyin, English), animated stroke order, guided drawing
practice with stroke-level feedback (including stylus/Apple Pencil input),
and a separate free-drawing practice grid (田字格-style).

The standard, actively-maintained library for this on the web is
`hanzi-writer` (MIT-licensed code). Its companion stroke-path dataset,
`hanzi-writer-data` (per-character JSON, ~9,500 characters), is derived
from two Arphic fonts (AR PL KaitiM GB, AR PL UKai) and is licensed under
the **Arphic Public License** — a share-alike font license (Arphic
Technology Co., 1999): free to copy, modify, and redistribute, provided
modifications are made "Freely Available" under the same terms and the
license file accompanies all copies. Not on `scripts/check-licenses.mjs`'s
existing allow-list (a genuinely new license text, distinct from every
other entry there).

**Decision.** Proceed with `hanzi-writer` + its data. Stroke data is
treated exactly like CC-CEDICT (DEC-016's precedent): pinned as a source,
documented with its own provenance record, and shipped under its own
license terms, separate from the GPL-3.0 application code — an inherited
obligation, not a choice, per CLAUDE.md §04 (updated in this change to
name it explicitly). Only the individual characters actually used across
the compiled HSK 1–6 decks are extracted and shipped (not the full
~9,500-character set), matching the project's existing "compile once, ship
only what's needed" discipline (NFR-4). `hanzi-writer` itself (MIT) is
added to `scripts/check-licenses.mjs`'s existing code allow-list with no
new entry needed; `hanzi-writer-data` is used only as a build-time
extraction source, never installed as a shipped runtime dependency, so it
does not need to pass the code license gate at all.

**Rationale.** `hanzi-writer` is by a wide margin the most mature,
actively-maintained option for exactly this feature; its stroke data's
Arphic-derived licensing is a well-established, benign precedent (the same
Arphic fonts have shipped in Debian/Ubuntu's CJK font packages for over two
decades without controversy) and is structurally identical to the
CC-CEDICT situation this project already has a clean pattern for: data
under its own share-alike terms, application code unaffected. Treating it
as a code dependency requiring GPL compatibility would be the wrong frame
(same reasoning as CC-CEDICT/CC BY-SA 4.0 not needing to be "GPL-compatible"
— it is distributed data, not code linked into the program).

**Consequences.** CLAUDE.md §02 and §04 updated in this change.
`docs/product/requirements.md` gains section H (FR-80 to FR-86).
[Roadmap](roadmap.md) gains a new milestone (M8 — Hanzi practice),
sequenced before M5 (Spaced repetition) per the owner's priority, mirroring
[DEC-031](decision-log.md)'s precedent of inserting a milestone out of
numeric order rather than renumbering the ones after it (M5/M6/M7's own
content and numbers are unchanged; renumbering would touch roughly twenty
files' worth of historical cross-references, including completed work
orders' own reports, for no benefit — DEC-031's exact reasoning applies
again here). A new `data/source/hanzi-writer-data/` provenance record and
a `data/hanzi-strokes/LICENSE`-equivalent notice are added alongside the
existing `data/LICENSE`, following the same structure.

---

## DEC-036 — Custom, editable, JSON-shareable flashcard decks added to v1 scope
**Status:** Accepted · **Date:** 2026-08-28 · **Authority:** owner instruction (priority feature, immediate release)

**Context.** The owner asked for a new capability beyond CLAUDE.md's original v1
scope: decks a learner creates and edits themselves, not sourced from CC-CEDICT or
the HSK lists, exportable to a JSON file and importable from one, so learners can
hand-build vocabulary sets (e.g. for a trip, a class, a hobby) and share them with
each other outside the app. This is the same category of scope expansion as
[DEC-035](decision-log.md) (Hanzi practice) — an owner-instructed v1 addition, not
a milestone deliverable already on the roadmap.

This is a genuine departure from one of [architecture](../engineering/architecture.md)
§8's stated assumptions: *"No user-generated content in v1, so no injection surface
from user input."* That line is now false and is corrected in this change, not
left to silently rot — architecture.md §8 is amended alongside this decision, per
CLAUDE.md §07.4.

**Decision.** A new entity, `CustomDeck` (domain-model.md, new §10), parallel to
but distinct from the HSK `Deck`/`Card` model rather than a variant of it: custom
cards have no `levels`, `source`, `review`, or `homographGroup` — those fields
exist to serve CC-CEDICT provenance and Red's review workflow, neither of which
applies to user-authored content. `Card.tsx` is widened to accept a minimal
structural `StudyableCard` shape (`id`, `headword`, `reading`, `senses`,
`classifiers?`) that both `Card` and a custom card's display projection satisfy,
so the existing study UI is reused rather than duplicated.

Persistence uses `localStorage` through the existing single storage seam
(architecture.md §4), the same tier as `Settings` — custom decks are expected to
be small (tens to low hundreds of cards, not the thousands `CardProgress` deals
with), so IndexedDB's extra complexity isn't earned. Hard limits are enforced on
both manual entry and import (deck count, cards per deck, and string lengths) so
a malformed or hostile import file cannot exhaust storage quota or freeze the UI —
see domain-model.md §10 for the exact figures.

Import is treated as an untrusted-input boundary: every field is type- and
length-checked before use, nothing from an imported file is ever passed to
`innerHTML` or any HTML-parsing sink (React's default text-node rendering is
kept throughout, matching the discipline architecture.md §8 already states for
dictionary glosses), and a successful import always mints a fresh local deck id
rather than silently overwriting an existing deck that happens to share one.

**Rationale.** Reusing the study/card UI instead of forking it keeps the flip,
Pinyin-toggle, and speech behaviour identical for custom content with no separate
code path to drift out of sync. Treating import as untrusted input is the
correct posture the moment CLAUDE.md gains any user-generated content, regardless
of how that content is expected to be sourced in practice (hand-typed vs. a
shared file from another learner) — a shared file is, by construction, a JSON
payload of unknown origin.

**Consequences.** CLAUDE.md §02 gains one sentence describing the capability.
`docs/product/requirements.md` gains section I (FR-90 to FR-98).
`docs/engineering/domain-model.md` gains §10 (`CustomCard`/`CustomDeck` schemas
and limits). `docs/engineering/architecture.md` §4's storage table gains a row,
and §8's "no user-generated content" line is corrected to describe the actual,
now-mitigated surface. No CC-CEDICT/HSK pipeline, licensing, or Red review-loop
changes — custom decks never touch `pipeline/`, `data/`, or the linguistic
review process, since none of that content is CC-CEDICT-derived.

---

## DEC-037 — Full CC-CEDICT lookup for custom-deck card creation; `CustomCard.source` and attribution
**Status:** Accepted · **Date:** 2026-08-28 · **Authority:** owner instruction (live feedback on WO-019 mid-build)

**Context.** Immediately after DEC-036 was recorded and WO-019 was underway, the
owner refined the requirement: a custom card should be addable by typing its
Hanzi **or** Pinyin, with the matching CC-CEDICT reading and definitions filled
in automatically "so they appear exactly as they do in the preexisting decks" —
not just hand-typed free text — while still letting the learner remove any
definition they don't want and add their own notes per card. Offered two
scopes ([AskUserQuestion], recorded rather than assumed): search only the
~5,259 words already compiled into the HSK decks (no new pipeline work), or
search the full ~124,900-entry pinned CC-CEDICT release. The owner chose the
full-dictionary option, accepting the stated cost: a new pipeline stage and a
materially larger data payload.

**Decision.**

1. **New, independent pipeline stage** (`pipeline/build-lookup.ts`,
   `npm run build:lookup`, parallel to `build-data.ts` the same way
   `build-hanzi.ts` is — its own docstring): reads the pinned CC-CEDICT source
   directly (no HSK matching at all) and compiles every entry into a search
   index plus a sharded detail store. Reuses `match.ts`'s
   `foldForMatching`/`isCrossReferenceOnly`/`convertClassifier`,
   `content-filter.ts`'s vulgar-sense filter, and `sense-annotations.ts`'s
   bracket-annotation cleanup — the exact same formatting logic the HSK decks
   use, which is what makes "appears exactly as in the preexisting decks"
   literally true rather than an approximation.
2. **Output shape** (`src/domain/cedictLookup.ts`, the shared contract, same
   pattern as `card.ts`): `public/cedict-lookup/index.json` — one compact,
   *unpretty-printed* array of `[id, simplified, traditional|null,
   readingNumeric]` tuples (~116,500 rows after skips, ~6.6MB uncompressed,
   ~2.2MB gzipped), fetched in full exactly once per session, never on app
   boot — and `public/cedict-lookup/detail-{0..63}.json`, 64 shards
   (`shardForId`, FNV-1a hash) of full entries (`LookupDetail`: headword,
   reading, senses, classifiers), each ~300KB, fetched lazily one shard at a
   time only once a candidate is chosen. Both artefact classes are committed
   and drift-checked in CI, same discipline as `public/decks/*.json`
   (data-pipeline.md §9) — this is real, user-facing content, not a build
   cache.
3. **Real corpus edge cases the HSK-scoped pipeline never meets**, found by
   actually running this against the full 124,932-line pinned file, not
   assumed: a small number of entries have a `readingNumeric` that isn't valid
   Pinyin at all (`11区[11 Qu1]`, `双11[Shuang1 11]` — a digit cited as a
   literal reading), and two entries whose gloss is literally about
   square-bracket punctuation (`"square brackets [ ]"`) that
   `sense-annotations.ts` correctly refuses to convert as a bracket
   annotation. Both are skipped — one entry, or one sense within an
   otherwise-fine entry — rather than crashing the whole build, logged and
   covered by regression tests (`pipeline/build-lookup.test.ts`).
4. **`CustomCard.source?: 'cc-cedict'`** (domain-model.md §10, amending
   DEC-036's schema): set only on a card populated via this lookup, never on
   a hand-typed one. Editing the senses afterwards does not clear it — the
   card is still substantially CC-CEDICT-derived. `services/customDecks.ts`'s
   `deckNeedsAttribution(deck)` is true whenever any card in a deck carries
   it.
5. **Attribution, because this is now real redistribution of CC-CEDICT
   content, not the "no user-generated content" surface DEC-036 already
   corrected**: a visible CC BY-SA 4.0 notice appears in the deck list and
   editor whenever `deckNeedsAttribution` is true, and `exportDeckToJson`
   adds an advisory `attribution` field to the exported JSON in that case
   (ignored, not rejected, on import — an unrecognised extra field is not a
   validation failure).
6. **No Red review required.** This mechanically exposes the same,
   already-trusted CC-CEDICT corpus the HSK pipeline already ships from,
   through the same formatting logic, with no HSK-specific curation or
   homograph adjudication happening here — a different, lower-risk category
   from Red's actual job (matching a *specific* HSK-assigned word to the
   *correct* CC-CEDICT reading). Red was not dispatched for this work order.

**Rationale.** Reusing match.ts/content-filter.ts/sense-annotations.ts instead
of writing a second formatter is what makes the "exactly as in the preexisting
decks" requirement true by construction rather than by careful copying that
could drift. The index/detail split (fetch the small compact index in full,
fetch only the chosen candidate's detail shard) is the standard client-side
dictionary-search shape and is what keeps "full CC-CEDICT" from meaning
"~20MB on every page load" — it means "~2.2MB gzipped, once, only if a learner
ever opens the lookup box." Skip-and-count rather than throw for the two real
malformed-corpus shapes follows this project's existing precedent (WO-015's
bare-erhua-suffix handling) for a single bad row, applied here for the first
time at full-corpus scale.

**Consequences.** WO-019's task list, acceptance criteria, and `touches` are
amended in place (still in progress, not yet closed) rather than raising a
new work order, since this is the same feature request refined mid-build.
`docs/product/requirements.md` section I gains lookup-specific FRs.
`docs/engineering/domain-model.md` §10 documents `CustomCard.source` and the
lookup dataset shape. `docs/engineering/data-pipeline.md` gains §11, documenting
this as a second, independent pipeline — the Hanzi stroke-order dictionary
pipeline (WO-015) has no equivalent section there yet, a pre-existing gap this
change doesn't attempt to backfill. `docs/engineering/architecture.md` §4's
storage table gains the lookup index/detail-shard fetch-and-cache row.
`.github/workflows/ci.yml` gains a build-and-drift-check step, mirroring the
existing data-build one. `data/LICENSE`'s scope line is extended to
`public/cedict-lookup/`.

[AskUserQuestion]: this decision — full vs. HSK-scoped lookup — was put to the
owner directly rather than decided unilaterally, since it materially changed
engineering scope and time-to-ship for an "immediate release" request.
