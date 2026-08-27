---
id: WO-009
agent: Red
outcome: complete
date: 2026-08-25
---

> **Integration update, Claude Code, 2026-08-25**: the two pipeline
> mechanism gaps Red identified below (card synthesis, card exclusion) have
> been implemented directly — [DEC-028](../../project/decision-log.md),
> `pipeline/overrides.ts`'s `applyOverrides` extended for synthesis,
> `pipeline/exclusions.ts` added for exclusion. `data/overrides/excluded-cards.json`
> (38 entries, derived mechanically from `lr-002-hsk1-flags.json` — the
> linguistic rationale is Red's, unchanged) and Red's
> `lr-002-hsk1-manual-cards.json` (8 entries) both now take effect. The 8
> resolved waivers were removed from `waived-words.json` per DEC-027. A
> further `lr-002-hsk1-approved.json` (142 entries) was generated
> mechanically from LR-002's "Approved as generated" list, so `review` status
> reflects Red's actual verdict rather than defaulting to `unreviewed` for
> cards nothing else touched. Rebuilt and verified: HSK-1 now closes at 154
> cards, `reviewSummary: { unreviewed: 0, approved: 150, corrected: 4,
> flagged: 0 }` — zero unreviewed, zero flagged. M1's gate criterion 5 is
> met. Outcome upgraded from `partial` to `complete` on that basis; Red's
> own review work was never the partial part — see Red's original framing
> below, preserved as written.

# WO-009 — Work Report

## What was done

Performed a full, 100%-coverage linguistic review of all 184 cards in
`public/decks/hsk-1.json` against every check in
[testing-strategy.md](../../engineering/testing-strategy.md) §5, and
individually adjudicated all twelve HSK-1 words named in the work order that
currently ship with no card at all. Full method, per-card verdicts, rationale,
and homograph adjudications are in
[LR-002](../reviews/LR-002-hsk1-review.md), which this report summarises
against the work order's acceptance criteria.

Three override files were authored, none of which edit any generated file
directly:

- `data/overrides/lr-002-hsk1-corrections.json` — 4 entries, content
  corrections to existing, otherwise-correct cards (sense reordering/wording).
- `data/overrides/lr-002-hsk1-flags.json` — 38 entries, `review: 'flagged'`
  with a full rationale and required next step per card. These are all
  genuine, linguistically-correct CC-CEDICT content that does not belong in
  HSK-1 (surname readings, bound forms, archaic/literary registers, and
  real-but-untested-at-this-level secondary readings) — see LR-002's Flagged
  section for the full breakdown and the systemic pattern behind it.
- `data/overrides/lr-002-hsk1-manual-cards.json` — 8 entries, full manual
  card content resolving 8 of the 12 named gap words (你, 和, 回, 家, 里, 年,
  岁, 喂). The other 4 (几, 了, 大, 那) are adjudicated with an explicit,
  reasoned decision to leave them unresolved — detailed in LR-002.

**Departure from the brief, and why it matters**: I discovered, before
authoring any override, that `pipeline/overrides.ts`'s `applyOverrides` can
only modify a `Card` that `pipeline/match.ts` already produced — it has no
mechanism to synthesize a brand-new card from an override whose id matches
nothing (confirmed by reading the module directly; its own docstring already
flags this as unimplemented). This means:

1. My 8 manual-card overrides (resolving 你/和/回/家/里/年/岁/喂) are **correct
   and ready but currently inert** — applying them as authored will report as
   orphaned overrides in the build, not as new cards. This is not a gap I can
   close from within WO-009's scope (editing `pipeline/*.ts` is explicitly out
   of scope, per the work order and charter.md) — it needs a small, specific
   extension to `applyOverrides`, detailed in LR-002's Findings and repeated
   in this report's Findings below.
2. Symmetrically, there is no way to make a `review: 'flagged'` card actually
   stop shipping other than by removing it from the corpus another way — the
   current mechanism fails the entire six-level build the moment any card is
   flagged, and leaves the flagged card sitting in `public/decks/hsk-1.json`
   regardless (`pipeline/build-data.ts`'s `main()` writes deck files before
   checking `validation.ok`). Applying `lr-002-hsk1-flags.json` as authored
   will make `npm run build:data` fail until this is addressed.

I judged, per WO-009's own acceptance criterion 4 ("a flag blocks the build...
and must not be a dead end") and the project's own prior documentation
(`data/source/hsk/SOURCE.md` §5.3 explicitly pre-committing to "flag on sight"
exactly this pattern, and [DEC-022](../../project/decision-log.md)), that
flagging these 38 cards is the correct linguistic call regardless of the
build-blocking consequence, and that surfacing the mechanism gap loudly now is
better than silently under-reviewing to avoid it. I did **not** attempt to
work around either gap myself (e.g. by guessing at a schema change) since
`pipeline/*.ts` is explicitly not mine to edit — I recommend a specific,
minimal shape for both fixes in Findings below, for Black.

I also left `data/overrides/waived-words.json` completely untouched. Removing
the 8 waivers I'm resolving now, before the mechanism above exists, would make
the build fail *harder* (an unwaived level-coverage gap) rather than warn (an
orphaned override) — see LR-002 Findings #3.

## Acceptance criteria

| # | Criterion | Met | Evidence |
| --- | --- | --- | --- |
| 1 | All 184 HSK-1 cards individually reviewed against every check in testing-strategy.md §5, with a recorded verdict per card | yes | [LR-002](../reviews/LR-002-hsk1-review.md) — 142 approved (listed by id), 4 corrected (tabulated with rationale), 38 flagged (tabulated with rationale); 142+4+38=184, verified programmatically against the real deck file (every override id cross-checked to exist in `public/decks/hsk-1.json`; zero mismatches) |
| 2 | Every correction is a `data/overrides/*.json` entry — zero direct edits to `public/decks/hsk-1.json` | yes | `data/overrides/lr-002-hsk1-corrections.json`, `lr-002-hsk1-flags.json`, `lr-002-hsk1-manual-cards.json`; `public/decks/hsk-1.json` not written to |
| 3 | Each of the twelve named gap words is individually adjudicated: a specific correction, or an explicit and reasoned decision to leave it unresolved — never silently skipped | yes | LR-002's "Gap-word adjudications" — 8 resolved (你,和,回,家,里,年,岁,喂), 4 explicitly declined with stated reasoning (几,了,大,那) |
| 4 | Any card marked `flagged` is accompanied by a clear statement of what's wrong and what needs to happen next | yes | Every one of the 38 entries in `lr-002-hsk1-flags.json` has a specific `note`; LR-002's Flagged section states the general pattern and the required mechanism; this report's Findings restate it for Claude Code/Black specifically |
| 5 | The LR record is committed at `docs/workstream/reviews/LR-002-hsk1-review.md` and cites every override file it authorises | yes | Committed; LR-002 cites all three override files by path throughout |
| 6 | A seeded RNG and its seed are recorded if any sampling is used; otherwise state explicitly that no sampling was used | yes | LR-002 front matter and Method section both state explicitly: no sampling was used, 100% coverage |

All six acceptance criteria are met. I am marking the overall outcome
**`partial`**, not because any WO-009 criterion is unmet, but because the
review's own output cannot yet fully take effect: 8 of the 12 gap-word
resolutions and all 38 flags depend on a pipeline mechanism that does not yet
exist (see "What was done" and Findings). The linguistic work WO-009 asked for
is complete and, I believe, correct; the data pipeline needs a small follow-up
before it ships.

## Not done

Nothing within WO-009's stated scope was left undone. Explicitly out of scope
and correctly not attempted: running `npm run build:data`, merging anything
into `main`, editing `pipeline/*.ts`, editing `public/decks/*.json` or
`data/build/*`, and recording level-tag corrections in `data/source/hsk/`.

## Findings

1. **`pipeline/overrides.ts` cannot create a new card from an override with no
   matching existing card.** `applyOverrides` maps over `cards` (the output of
   `matchAndResolve`) and only ever mutates an entry it finds by id; an
   override whose id matches nothing is reported in `orphanedOverrideIds` and
   otherwise has no effect. For `ConflictingCedictEntries` and
   `UnresolvedCrossReference` rows, `matchAndResolve` never produces a card at
   all (both branches `continue` past pushing to `cards`), so there is
   structurally nothing for such an override to attach to. This is not a
   surprise to Black — `overrides.ts`'s own docstring already names this as
   unimplemented — but WO-009 needed it, so I'm surfacing it as a concrete,
   blocking finding rather than a hypothetical. **Recommended fix**: extend
   `applyOverrides` (or add a sibling function called after it, before
   `buildCards` returns) to synthesize a full `Card` when an override id
   matches nothing but the override supplies the complete required field set
   (`headword`, `reading`, `readingNumeric`, `senses`, `levels`) — my 8
   manual-card overrides in `data/overrides/lr-002-hsk1-manual-cards.json`
   already supply exactly this shape (source: 'manual'), on the theory that
   this is the natural minimal extension of the existing schema rather than a
   new one. Until this exists, those 8 words remain missing from the shipped
   HSK-1 deck exactly as they are today, just with correct, ready content
   waiting.
2. **`pipeline/overrides.ts` cannot exclude an existing card from shipping.**
   The only lever to say "must not ship" is `review: 'flagged'`, which (a)
   fails the *entire* six-level `npm run build:data` run, not just HSK-1 (per
   data-pipeline.md §8), and (b) does not actually remove the card from
   `public/decks/hsk-1.json` — `pipeline/build-data.ts`'s `main()` writes deck
   files unconditionally, before checking `validation.ok`. So flagging is not
   "exclude this card, and otherwise proceed" — it is "stop everything until
   a human resolves this," permanently, since there is no override field that
   un-flags a card without either shipping it (defeating the point) or
   requiring a pipeline change to actually drop it. Applying
   `data/overrides/lr-002-hsk1-flags.json` (38 entries, all genuinely
   warranted per LR-002) will fail the build until this exists.
   **Recommended fix**: a new committed file,
   `data/overrides/excluded-cards.json`, structurally parallel to
   `waived-words.json`/`pipeline/waivers.ts`
   ([DEC-027](../../project/decision-log.md)) — keyed by card id, checked in
   `pipeline/build-cards.ts` to drop the card from `cardsByLevel` after
   matching/override, before validation. This also cleanly separates two
   states the project currently conflates under one `review: 'flagged'`
   value: "a live card with an unresolved problem, blocking the build until
   someone looks at it" versus "Red has made a final, considered call that
   this must never ship" (which shouldn't need to re-fail the build on every
   run once decided).
3. **This is a large, systemic pattern, not 38 unlucky one-offs.** ~21% of the
   shipped HSK-1 deck is homograph-artifact content from the pinned word
   list's documented form-bundling behaviour (`data/source/hsk/SOURCE.md`
   §5.3 already anticipated this in general terms; this review is the first
   time it's been measured). The single most consequential instance: 和 (hé,
   "and") — among the most common words in the language — was completely
   missing from the deck, while five much rarer readings of the same
   character (a surname plus four literary/technical readings) shipped as
   live, unreviewed cards. I expect the follow-on HSK-2/3 review (due before
   M3 per [DEC-025](../../project/decision-log.md)) to find a comparable
   proportion and should budget time for it, not treat this count as
   HSK-1-specific bad luck.
4. **One content-policy question I'm not positioned to settle alone,
   escalated in LR-002**: CC-CEDICT carries vulgar/NSFW senses on some
   otherwise entirely ordinary headwords (日 is the HSK-1 instance found; not
   yet surveyed beyond HSK-1). I resolved 日 itself via a per-card override,
   but whether this should instead be a standing, mechanical filter across
   every level is an owner-level product decision, not a per-card linguistic
   call.
5. **`CardOverride` has no `homographGroup` field**, so once the exclusion
   mechanism (finding 2) lands and removes a flagged card, its surviving
   sibling's now-vacuous `homographGroup` tag (e.g. 三:san1, pointing to a
   group that will then have only one member) cannot be cleaned up via
   override at all. Not build-blocking today (no validation gate checks
   domain-model.md §3 invariant 6), but a real loose end — worth handling in
   the same change that implements finding 2.

## Follow-ups proposed

- A small Black work order to implement Findings 1 and 2 (new-card synthesis
  from a complete manual override; a card-exclusion file parallel to
  `waived-words.json`), after which: (a) my 8 manual-card overrides start
  producing real cards, (b) my 38 flags can be converted to exclusions (or
  left as flags if Claude Code prefers the build-failure signal to persist
  until this WO lands — either is defensible), and (c) the 8 now-resolved
  waiver entries in `data/overrides/waived-words.json` get removed in that
  same change, per DEC-027.
- Once the above lands and HSK-1 rebuilds green, re-run `npm run build:data`
  and confirm the review-queue and build report reflect 184 cards at
  `review: 'approved'`/`'corrected'` (146, after the net effect of 8 new
  approved manual cards replacing 8 waived gaps, minus the 38 excluded) or
  whatever the true final HSK-1 count becomes — I have not attempted to
  predict the exact resulting `cardCount`/`reviewSummary` since that depends
  on exactly how exclusion is implemented.
- The owner-level policy question on vulgar/NSFW CC-CEDICT content (Finding
  4) should be decided before HSK 2–6 review reaches a similar case, since
  I'll otherwise be making the same one-off call repeatedly.
