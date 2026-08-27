# Open Questions

Owner: **Claude Code**.

## Nothing is open. Nothing is blocking.

**Status as of 2026-08-24: zero open questions. M1 can begin.**

On 2026-08-24 the project owner ratified the stack, set the level structure, put
spaced repetition in scope, chose GPL-3.0, and then instructed that no further
decisions be brought back **unless 100 % critical**. Every question that was open
has been decided and recorded as an ADR in [decision-log](decision-log.md).

That instruction narrows what returns to the owner. The revised criteria are in
[charter](../team/charter.md) §4 — in short: money, legal exposure, irreversible
loss, and anything contradicting CLAUDE.md. Everything else Claude Code decides and
records.

**Decisions are not permanent.** Every ADR is reversible and says so. If the owner
disagrees with any call below, saying so is enough — the point of deciding was to
avoid waiting, not to close the subject.

---

## Answered

### OQ-1 — Technology stack · **Answered 2026-08-24, by the owner**
Ratified as proposed in [architecture](../engineering/architecture.md) §3:
TypeScript + Vite + React, CSS Modules with design tokens, Vitest and Playwright,
Node/TypeScript pipeline, static hosting. Settled DEC-001, DEC-002, DEC-003,
DEC-008.

### OQ-2 — Traditional characters in v1 · **Answered 2026-08-24, delegated**
**Simplified only.** Traditional forms are retained in the data model but not
displayed. [DEC-010](decision-log.md). Cheap to add later precisely because the data
is already there — a UI change, not a migration.

### OQ-3 — Level structure · **Answered 2026-08-24, by the owner**
**Six levels, 1 to 6**, no A/B split, one deck each. CLAUDE.md §02 updated.
[DEC-015](decision-log.md).

### OQ-3b — Which HSK word list · **Answered 2026-08-24, delegated to Red**
The official HSK 2.0 syllabus, taken as a **level tag only** — one fact per word,
which level it is in. All shipped content stays CC-CEDICT-sourced, per CLAUDE.md
§02. Where the list carries Pinyin it is used as a build-time matching key for
homographs and then discarded. [DEC-017](decision-log.md).

**Red owns this**, including selecting the specific list and its ongoing
correctness — see [WO-003](../workstream/work-orders/WO-003-hsk-word-list.md).

### OQ-4 — Spaced repetition · **Answered 2026-08-24, by the owner**
**In scope for v1.** CLAUDE.md §02 updated; FR-60 to FR-71 added;
[scheduling](../engineering/scheduling.md) written; M5 added; FR-37 withdrawn.

### OQ-5 — Licensing · **Answered 2026-08-24, by the owner**
**GPL-3.0** for application code; dictionary-derived data stays CC BY-SA 4.0 as an
inherited obligation. [DEC-016](decision-log.md). The repository is assumed public,
since GPL-3.0 is otherwise moot.

### OQ-6 — Visual direction · **Answered 2026-08-24, delegated**
White presents at least two distinct directions at M2; **Claude Code selects** and
the build proceeds. The unselected direction is kept as a token set, so the owner
can see both and swap at any time. [DEC-018](decision-log.md). No longer an M2 gate.

### OQ-7 — Hosting · **Answered 2026-08-24, delegated**
**Cloudflare Pages**, free tier, provided subdomain. Zero cost.
[DEC-019](decision-log.md). A custom domain or paid tier would be money, and money
returns to the owner.

### OQ-8 — Scheduling algorithm · **Answered 2026-08-24, delegated**
**FSRS**, via a pinned, licence-checked library. SM-2 is the fallback if no suitably
licensed implementation exists. [DEC-013](decision-log.md).

### OQ-9 — Export prompting · **Answered 2026-08-24, delegated**
Manual export, plus **one dismissible reminder after 30 days** without an export
where there is history at risk. Never automatic. [DEC-020](decision-log.md).

---

## How a new question gets handled

Under the owner's standing instruction, a question that arises mid-build does not
stop work. Claude Code:

1. Decides it, choosing the more reversible option where the call is close.
2. Records it as an ADR with the reasoning, so the decision is visible and can be
   challenged.
3. Continues.

It returns to the owner **only** if it meets [charter](../team/charter.md) §4 — and
that list is now short by design.
