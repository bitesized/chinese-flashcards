# Risk Register

Owner: **Claude Code**. Reviewed at every milestone gate.

**Severity** is the consequence if it happens; **likelihood** is the chance it does.

---

## RISK-1 — CC-CEDICT ShareAlike obligations are not met
**Severity:** High · **Likelihood:** Medium (if not designed for) · **Owner:** Claude Code

CC-CEDICT is CC BY-SA 4.0. The compiled decks are a derivative work and must
themselves be distributed under CC BY-SA 4.0, with attribution and an indication of
changes. Missing this is a licence breach, and it is most easily got wrong by
treating the decks as ordinary build output under the application's own licence.

**Mitigation.** Dictionary-derived data is segregated under `data/` and
`public/decks/` with its own `LICENSE`; the root `LICENSE` states which terms cover
which paths; attribution appears in-app (UX §4.5) and in the README; `SOURCE.md`
and the committed build report constitute the record of changes. Enumerated in
[data-pipeline](../engineering/data-pipeline.md) §7 as mandatory.

**Residual.** Low, once implemented. Verified at the M5 gate.

---

## RISK-2 — The HSK word list has unknown or incompatible licensing
**Severity:** Medium *(was High)* · **Likelihood:** Low *(was Medium)* · **Owner:** Red

HSK vocabulary lists are widely republished, often with no stated licence and
unclear provenance.

**Mitigation.** [DEC-017](decision-log.md) materially reduces this rather than
merely managing it: the pipeline takes **only the level mapping** — *word X is at
level N* — which is the factual core of a published public standard, and where the
list carries Pinyin it is used as a build-time matching key and discarded. No text
from the list is shipped; all content comes from CC-CEDICT. Provenance and terms are
recorded in `SOURCE.md`. Red selects the list and takes the next candidate if one is
encumbered — the mapping is the same facts either way, which is what makes this
recoverable rather than blocking.

**Residual.** Low. Escalates only if *every* candidate is encumbered in a way that
survives the level-tag-only reduction ([charter](../team/charter.md) §4.2).

---

## RISK-3 — Homograph mis-assignment produces silently wrong cards
**Severity:** High · **Likelihood:** High · **Owner:** Red

When an HSK list gives only a written form, matching it to CC-CEDICT can yield
several readings and the pipeline cannot know which the level intends. Choosing the
first match would produce cards that are wrong in a way no beginner can detect —
the worst failure mode this project has, because the user memorises the error.

**Mitigation.** [DEC-004](decision-log.md) forbids merging. Unresolved groups are
emitted as separate cards, all marked `unreviewed`, and routed to Red, who
adjudicates. 100 % of homograph groups are reviewed at every level, not sampled
([testing-strategy](../engineering/testing-strategy.md) §5). A word list that
includes Pinyin removes most of the problem and is preferred in
[OQ-3](open-questions.md).

**Residual.** Medium. This is the risk Red exists to absorb.

---

## RISK-4 — No Mandarin voice on the user's device
**Severity:** Medium · **Likelihood:** High on some platforms · **Owner:** Black

`speechSynthesis` voice availability is a platform property. Linux Firefox
frequently has none; Android depends on an installed Google TTS language pack. A
CLAUDE.md-mandated feature will therefore be unavailable to some users.

**Mitigation.** FR-43: detect and disable with a plain explanation, never a silent
no-op. [DEC-009](decision-log.md) records that no audio-file fallback ships in v1
and why. Where a device has a `zh-TW` or `zh-HK` voice but no `zh-CN`, the app
declines rather than speaking with the wrong pronunciation
([architecture](../engineering/architecture.md) §5.3).

**Residual.** Medium, and accepted for v1. Revisit post-v1 if it proves common.

---

## RISK-5 — CJK font falls back to a Japanese face
**Severity:** Medium · **Likelihood:** Medium · **Owner:** White

Han characters share Unicode codepoints across Chinese and Japanese, but the glyph
forms differ visibly — 直, 骨, 今, 令, 起. A font stack that resolves to a Japanese
face on some platform will teach the learner subtly wrong character forms, and it
will look correct to anyone who does not already read Chinese.

**Mitigation.** Explicit Simplified-Chinese-first font stack and `lang="zh-Hans"`
tagging ([UX spec](../product/ux-specification.md) §3). Verified manually against
the divergence set on every platform in the device matrix
([testing-strategy](../engineering/testing-strategy.md) §6). A self-hosted subset
face removes the dependency on platform fonts entirely.

**Residual.** Low, once the subset font ships at M5.

---

## RISK-6 — Definition verbosity destroys the card at higher levels
**Severity:** Medium · **Likelihood:** Medium · **Owner:** White, with Red

CC-CEDICT entries can carry a dozen glosses, and idioms (成语) often have long
literal-plus-figurative explanations. A back face rendering all of it is unusable
on a phone.

**Mitigation.** [UX spec](../product/ux-specification.md) §7.2 caps the visible
senses with an explicit "more" control. Red may trim genuinely redundant glosses
via overrides, with rationale recorded. Trimming is a linguistic judgement and
belongs to Red, not to a character-count heuristic.

**Residual.** Low.

---

## RISK-7 — Spaced-repetition progress is device-local and can be lost
**Severity:** High · **Likelihood:** Medium · **Owner:** Black

CLAUDE.md §03 defers synchronisation, so a learner's review history lives in one
browser profile. Browsers evict IndexedDB under storage pressure, and users clear
caches, change devices, and use private windows. With spaced repetition in scope
this is no longer a minor inconvenience: months of history cannot be regenerated,
and losing it destroys the thing the app exists to provide.

This risk was created by the owner's decision to include SRS. It is the direct cost
of that decision, and it is accepted rather than avoided.

**Mitigation.** Three measures, all required for v1 and all recorded in
[DEC-014](decision-log.md): `navigator.storage.persist()` on first meaningful use
(NFR-16); full export and import of learner state as a MUST (FR-69); explicit
confirmation naming what is lost before any destructive action (FR-68). Export is
placed prominently in the UI, not buried
([UX spec](../product/ux-specification.md) §4.4), and prompted if long unused
([OQ-9](open-questions.md)).

**Residual.** Medium. Genuinely resolved only by sync, which is the clearest
post-v1 priority.

---

## RISK-8 — A CC-CEDICT update silently changes thousands of cards
**Severity:** Medium · **Likelihood:** Medium · **Owner:** Black

CC-CEDICT is updated frequently. A version bump can alter glosses, readings, and
entry structure across the corpus at once, and reviewed content could regress
without anyone noticing.

**Mitigation.** The source file is pinned by checksum; updating it is its own work
order with its own review of the resulting diff
([conventions](../engineering/conventions.md) §7). Compiled decks are committed, so
the change is visible in a diff. Deterministic ids ([DEC-005](decision-log.md))
mean overrides survive. Any card whose content changed reverts to `unreviewed`.

**Residual.** Low.

---

## RISK-9 — Agent coordination overhead exceeds its value
**Severity:** Low · **Likelihood:** Medium · **Owner:** Claude Code

A four-agent team with a file-based protocol can spend more effort on routing than
on the work, particularly on small tasks.

**Mitigation.** Batching and citation rules in
[communication-protocol](../team/communication-protocol.md) §9; no status-report
work orders; one reviewer per concern. Claude Code reviews the ratio at each
milestone gate and proposes simplification to the owner if it is poor.

**Residual.** Low.

---

## RISK-10 — Documentation drifts from the built application
**Severity:** Medium · **Likelihood:** Medium · **Owner:** Claude Code

A large documentation set written before any code is at risk of becoming a record
of intentions rather than of the system.

**Mitigation.** CLAUDE.md §06.5 requires documentation to change in the same commit
as the behaviour it describes. Every document carries an owner and a status. The M6
gate requires documents to be moved from `Draft` to `Current`, which forces a read.

**Residual.** Medium. Genuinely mitigated only by discipline.

---

## RISK-11 — A scheduling bug is silent and its cost is delayed
**Severity:** High · **Likelihood:** Medium · **Owner:** Black

A wrong interval looks entirely plausible. A card scheduled for 40 days instead of
4 produces no error, no visible defect, and no complaint — until the learner
discovers months later that they have forgotten material they were told they knew.
This is the second class of silent failure in this project, alongside content
errors, and it is harder to detect because there is nothing to inspect.

**Mitigation.** Use a library rather than a hand-port ([DEC-013](decision-log.md)),
and run its published test vectors in our suite so a version bump cannot silently
change behaviour. Inject the clock so scheduling is deterministic under test.
Property-test the ordering invariants over random review sequences, and simulate a
synthetic year of study to catch runaway backlog that unit tests miss
([scheduling](../engineering/scheduling.md) §7). Showing the resulting interval on
each grade control ([UX spec](../product/ux-specification.md) §4.2) also makes the
scheduler inspectable by the learner, who is the only party who would ever notice.

**Residual.** Low, with the test suite in place.

---

## RISK-12 — A dependency is not GPL-3.0 compatible
**Severity:** Medium · **Likelihood:** Low · **Owner:** Black

The owner has chosen GPL-3.0 ([DEC-016](decision-log.md)). A dependency under an
incompatible licence would have to be removed, and discovering this late — after
the scheduler is integrated, say — is expensive.

**Mitigation.** Licence is a required field in the dependency justification
([conventions](../engineering/conventions.md) §4), checked before adoption rather
than at release. MIT, BSD, ISC and Apache-2.0 are all GPL-3.0 compatible, which
covers the great majority of the JavaScript ecosystem. An automated licence check
runs in CI. The scheduler library is the one to verify first, since it is the
largest single dependency the project plans to take.

**Residual.** Low.
