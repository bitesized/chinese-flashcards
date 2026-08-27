# Agent Communication Protocol

Owner: **Claude Code**, per CLAUDE.md §04: *"Agents should interact via an efficient
system, and you as project manager are responsible for enacting and maintaining
this communication system as well."*

Status: **Draft — active from M0.**

---

## 1. The constraint this system is designed around

Subagents are **stateless**. Each invocation begins with no memory of any previous
one, and agents cannot address each other directly. Any protocol that assumes
continuity or peer-to-peer messaging will fail quietly — an agent will simply
proceed without context it appears to have been given.

So the system is built on two rules that follow directly:

1. **Every brief is self-contained.** It states everything the agent needs. It may
   cite documents by path, but it never assumes the agent remembers a conversation.
2. **All routing goes through Claude Code**, who holds continuity. Agents produce
   artefacts; Claude Code moves them.

The medium is the repository. Briefs and reports are committed files, not chat.
That makes the project's state legible to the owner at any moment without replaying
a transcript, and it survives any session ending.

## 2. Topology

```
                    ┌──────────────┐
                    │  Owner       │
                    └──────┬───────┘
                           │  instructions / escalations only
                    ┌──────▼───────┐
                    │ Claude Code  │  ← holds continuity, owns the board
                    │    (PM)      │
                    └──┬───┬───┬───┘
           Work Order  │   │   │  Work Report
              ┌────────┘   │   └────────┐
         ┌────▼───┐   ┌────▼───┐   ┌────▼───┐   ┌────────┐
         │ Black  │   │ White  │   │  Red   │   │ Purple │
         └────────┘   └────────┘   └────────┘   └────────┘

         No horizontal edges. Agents never address each other.
```

## 3. Artefacts

| Artefact | Location | Written by | Purpose |
| --- | --- | --- | --- |
| **Board** | `workstream/board.md` | Claude Code | Single index of all work and its status |
| **Work Order (WO)** | `workstream/work-orders/WO-###-slug.md` | Claude Code | The self-contained brief given to an agent |
| **Work Report (WR)** | `workstream/reports/WO-###-report.md` | the agent | What was done, what was not, what was found |
| **Linguistic Review (LR)** | `workstream/reviews/LR-###-slug.md` | Red | Content verdict and corrections |
| **ADR** | `project/decision-log.md` | Claude Code | A decision, its rationale, its status |
| **Open Question** | `project/open-questions.md` | Claude Code | Something only the owner can settle |

Templates for the first four are in `workstream/templates/`.

Numbers are allocated by Claude Code, monotonically, never reused.

## 4. Work order lifecycle

```
Draft ──► Ready ──► In Progress ──► In Review ──► Done
                          │              │
                          └──► Blocked ──┘        └──► Cancelled
```

| Status | Meaning |
| --- | --- |
| **Draft** | Being written. Not yet actionable. |
| **Ready** | Meets the Definition of Ready ([roadmap](../project/roadmap.md) §4). Dependencies satisfied. |
| **In Progress** | Dispatched to its owning agent. |
| **In Review** | Report returned; Claude Code is verifying, and Red or White are reviewing if required. |
| **Blocked** | Waiting on a dependency, an owner decision, or an open question. The blocker is named. |
| **Done** | Meets the Definition of Done ([roadmap](../project/roadmap.md) §5). |
| **Cancelled** | Withdrawn. Reason recorded; the WO file is kept. |

Claude Code updates the board on every transition. The board is the truth about
project state; a status held only in someone's head does not count.

## 5. The content review loop

The path that gives Red's veto ([charter](charter.md) §2) practical effect.

```
  Black compiles decks            →  review-queue.json produced
        │
        ▼
  Claude Code raises LR work order for Red, citing the queue and the sample seed
        │
        ▼
  Red reviews  →  LR record: per-card verdict + corrections + rationale
        │
        ├─ all approved ────────────────────────────► content may ship
        │
        └─ corrections ─► Claude Code raises a WO for Black to commit the
                          overrides ─► rebuild ─► Red confirms in the same LR
```

Rules:

1. Red never edits generated files. Corrections are expressed as override entries
   ([data-pipeline](../engineering/data-pipeline.md) §6) and applied by Black.
2. Every commit touching `data/` or `public/decks/` cites its LR number
   ([conventions](../engineering/conventions.md) §7).
3. A card marked `flagged` in an LR cannot ship — the data build enforces this
   mechanically ([testing-strategy](../engineering/testing-strategy.md) §3.8), so
   the veto does not depend on anyone remembering it.
4. If Black disagrees with a correction, Claude Code escalates to the owner. Black
   does not overrule Red.

## 6. Work Order contract

Every WO carries this front matter. A WO missing any field is not `Ready`.

```yaml
id: WO-014
title: Independent front and back Pinyin toggles
owner: White                 # exactly one agent
status: Ready
priority: MUST
milestone: M2
requirements: [FR-10, FR-11, FR-13, FR-15]
depends_on: [WO-009]
spec_refs:
  - product/ux-specification.md#42-study--the-card
  - engineering/domain-model.md#8-runtime-only-types
touches:
  - src/features/study/
  - src/features/settings/
review_required: [White]     # + Red whenever Chinese content is involved
```

Followed by four prose sections, in order:

1. **Context** — why this exists, in a few sentences. Written for someone with no
   prior exposure to the project.
2. **Task** — what to do. Specific enough to act on, not so specific that it
   removes the agent's judgement in their own domain.
3. **Acceptance criteria** — a numbered, checkable list. Each item is verifiable by
   someone other than the author.
4. **Out of scope** — what not to touch. This section prevents the most common
   failure: an agent tidying an adjacent file another agent owns.

## 7. Work Report contract

The agent's reply. Also committed.

```yaml
id: WO-014
agent: White
outcome: complete | partial | blocked
```

Then:

1. **What was done** — including anything done differently from the brief, and why.
2. **Acceptance criteria** — each one, marked met or not met. Never claim an unmet
   criterion is met; an honest partial is worth more than a false complete.
3. **Not done** — with reasons. Explicit, never silent.
4. **Findings** — anything discovered that affects other work: a wrong assumption
   in a spec, a bug elsewhere, a risk. This is the channel by which one agent's
   discovery reaches another, since they cannot speak directly.
5. **Follow-ups proposed** — candidate work orders. Claude Code decides whether to
   raise them; the agent does not create its own next task.

## 8. Claude Code's obligations

On receiving a report, Claude Code must:

1. Verify acceptance criteria independently rather than accepting the report's
   own marking.
2. Route any content-affecting result to Red before `Done`.
3. Fold findings into the affected documents, or raise an open question, or a risk.
   A finding recorded only in a report that nobody re-reads has been lost.
4. Update the board.
5. Record any decision made along the way as an ADR.
6. Escalate anything meeting the [charter](charter.md) §4 criteria — and nothing
   that does not.

## 9. Efficiency measures

CLAUDE.md asks for an *efficient* system. Concretely:

- **Batch by agent.** Related tasks for one agent go in one WO where they share
  context, rather than three WOs that each re-establish it.
- **Cite, don't restate.** A WO links to the spec section; it does not paraphrase
  it, because a paraphrase drifts from the source and then contradicts it.
- **Front-load unblocking work.** Data comes before UI, because UI built against
  guessed data gets rebuilt.
- **One reviewer per concern.** Content to Red, visual to White, structural to
  Black. Not everything to everyone.
- **No status-report work orders.** The board is the status.
