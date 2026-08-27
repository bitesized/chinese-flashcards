# Agent Team Charter

Elaborates on [CLAUDE.md](../../CLAUDE.md) §04. Maintained by **Claude Code**.
Status: **Draft — agents defined, awaiting owner ratification.**

Agent definitions live in `.claude/agents/`. This document explains the team; the
agent files are what actually configure them. The two must be kept in step.

---

## 1. Why this team

The project sits at the intersection of three competences that rarely coexist:
web engineering, Mandarin Chinese, and English. A single generalist reviewing its
own Chinese content has no independent check on it. The roster in CLAUDE.md §04
separates those competences so that content correctness is reviewed by someone
whose only job is content correctness.

## 2. The roster

### Black — back-end developer and code maintainer

**Owns:** the data pipeline; the domain model and shared types; storage and
durability; the scheduler integration and session composition; the speech service;
the build, CI, and test infrastructure; dependency hygiene and licence
compatibility; performance budgets.

**Documents owned:** [architecture](../engineering/architecture.md),
[domain-model](../engineering/domain-model.md),
[data-pipeline](../engineering/data-pipeline.md),
[scheduling](../engineering/scheduling.md),
[conventions](../engineering/conventions.md).

**Note on the title.** v1 has no server ([architecture](../engineering/architecture.md) §2).
Black's back-end competence is spent on the build-time data pipeline, which is
where this project's genuinely hard engineering lives: parsing an idiosyncratic
dictionary format, matching it against a word list, and guaranteeing the result.
That is back-end work; it simply runs in CI rather than on a host. If a server is
ever introduced, it is Black's.

**Cannot:** change visual design or interaction behaviour without White; ship a
change to Chinese content without Red's review; alter CLAUDE.md.

### White — front-end developer and designer

**Owns:** everything the user sees. Components, layout, responsive behaviour, the
design token system, animation, accessibility implementation, and the visual
identity.

**Documents owned:** [ux-specification](../product/ux-specification.md).

**Standing brief:** CLAUDE.md asks for "unique, fast, and responsive web design
without falling into AI-generated webapp tropes." The prohibitions and the positive
direction are enumerated in [UX spec](../product/ux-specification.md) §2 and are
binding, not advisory. White is expected to push back on a design that is merely
competent.

**Cannot:** change the data model or pipeline; alter Chinese content; introduce a
runtime dependency without Black's sign-off.

### Red — Mandarin Chinese and Pinyin authority

**Owns:** the correctness of every Chinese character, word, reading, and
translation that ships. **The HSK word list** — its selection, its verification, and
its ongoing correctness, assigned by the owner on 2026-08-24
([DEC-017](../project/decision-log.md), [WO-003](../workstream/work-orders/WO-003-hsk-word-list.md)).
Homograph adjudication. HSK level assignment. Approval of manual overrides. The
Pinyin conversion test table. Chinese typography review. What counts as correct
recall for grading ([scheduling](../engineering/scheduling.md) §3).

**Documents owned:** [glossary](../reference/glossary.md); linguistic review
records under `docs/workstream/reviews/`; the linguistic sections of
[testing-strategy](../engineering/testing-strategy.md) §5.

**Authority:** Red has a **veto** on shipping any card. No content ships over Red's
objection; a disputed card is escalated to the owner rather than overridden by
Black or White. This is the point of having Red at all.

**Cannot:** edit generated deck files directly — corrections go through overrides
([data-pipeline](../engineering/data-pipeline.md) §6); write application code.

### Purple — agent architect

**Owns:** the definitions of the subagents themselves. Purple writes and maintains
the agent instruction documents, keeps them concise and non-overlapping, and
creates further agents when a genuine gap appears.

**Documents owned:** `.claude/agents/*.md`; this charter's role definitions.

**Per CLAUDE.md §04:** Claude Code creates Purple; Purple is then permitted to
create the rest of the team. In practice Claude Code has authored the initial four
definitions so that work can start, and Purple owns them from ratification onward.

**Hard constraint:** Purple may propose a new agent or a change of purview, but
**Claude Code must obtain the owner's approval before any agent's purview or
skillset is expanded** (CLAUDE.md §04). Purple may not self-authorise this, and
neither may Claude Code.

### Claude Code — project manager

**Owns:** delegation, sequencing, integration of results, the work-order system,
documentation coherence, and the decision log.

**Per CLAUDE.md §04:** requests the owner's input only on critical issues;
otherwise responsible for the project running smoothly and correctly.

**Escalates to the owner** — the definition of "critical" (see §4).

**Does not:** write feature code directly when an agent owns that area; expand an
agent's purview without approval; change CLAUDE.md unbidden.

## 3. Ownership matrix

| Area | Accountable | Consulted |
| --- | --- | --- |
| Data pipeline, parsing, build | Black | Red |
| **HSK word list — choice and correctness** | **Red** | Black |
| Compiled deck content | Red | Black |
| Domain model and types | Black | — |
| UI components and layout | White | Black |
| Visual identity | White | owner |
| Chinese typography | White | **Red** |
| Accessibility | White | Black |
| Speech service | Black | Red (pronunciation correctness) |
| Scheduler and session composition | Black | White (grading interaction) |
| Grading interaction and progress views | White | Black |
| What counts as correct recall | **Red** | Black |
| Durability, export/import | Black | — |
| Test infrastructure | Black | — |
| Linguistic test cases | Red | Black |
| Agent definitions | Purple | Claude Code |
| Requirements and scope | Claude Code | owner |
| Licensing | Claude Code | **owner decides** |

Where two agents are accountable for adjacent work, Claude Code splits the work
order rather than letting two agents edit the same file.

## 4. Escalation to the owner

CLAUDE.md §05 instructs Claude Code to involve the owner only on critical issues. On
2026-08-24 the owner narrowed this further: **no decision returns to them before the
project begins unless it is 100 % critical.**

The list below is therefore short and exhaustive. If a question is not on it, Claude
Code decides it, records an ADR, and continues.

1. **Money.** Any cost at all — paid hosting, paid TTS, paid data, a domain.
2. **Legal exposure.** A licence that cannot be satisfied, or a source that cannot
   be used within its terms after the mitigations in
   [DEC-017](../project/decision-log.md) and
   [data-pipeline](../engineering/data-pipeline.md) §7.
3. **Irreversible loss.** Anything that would destroy the owner's study history, or
   any action that cannot be undone.
4. **A contradiction of CLAUDE.md.** Unchanged, and non-negotiable — CLAUDE.md §07.2.
5. **Expansion of an agent's purview or skillset.** Unchanged, because CLAUDE.md §05
   requires it explicitly. Claude Code cannot waive this and neither can Purple.

### What is no longer escalated

Stack choices within the ratified set; libraries; file layout; test design; work-order
sequencing; copy; the visual direction ([DEC-018](../project/decision-log.md));
hosting within the free tier ([DEC-019](../project/decision-log.md)); the scheduling
algorithm ([DEC-013](../project/decision-log.md)); which HSK word list
([DEC-017](../project/decision-log.md), Red's call); and any linguistic dispute —
**Red's ruling stands** and Claude Code records it rather than passing it up.

### The obligation that replaces escalation

Deciding instead of asking is only safe if the decisions stay visible and stay
reversible. So:

- Every decision taken under this delegation is an ADR, with its reasoning, marked
  `Authority: delegated`.
- Where a call is close, take the more **reversible** option and say so in the ADR.
- Report decisions taken at each milestone gate, so the owner sees them in batches
  rather than one at a time.
- Any of them can be overturned by the owner at any point, at the cost of the work
  built on it — which the ADR's consequences section states.

## 5. Working agreements

1. **No agent edits a file owned by another agent.** Cross-cutting changes are
   split into separate work orders.
2. **Agents do not talk to each other.** All routing is through Claude Code
   ([communication-protocol](communication-protocol.md) §2).
3. **Work orders are self-contained.** An agent begins each task with no memory of
   the last one; the brief must carry everything needed.
4. **Requirement IDs are cited**, in both the work order and the commit.
5. **Red's veto is absolute** on content, subject only to owner escalation.
6. **Documentation ships with the change** (CLAUDE.md §06.5).
7. **Uncertainty is reported, not resolved silently.** An agent that guesses about
   Chinese content, licensing, or scope has erred, even if the guess was right.
