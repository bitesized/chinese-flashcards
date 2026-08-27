# Documentation

**Start with [CLAUDE.md](../CLAUDE.md).** It is the source of truth for this project.
Everything here elaborates on it, and nothing here may contradict it.

## Where to find things

| I want to know… | Read |
| --- | --- |
| What we are building and why | [product/vision-and-scope.md](product/vision-and-scope.md) |
| Exactly what it must do | [product/requirements.md](product/requirements.md) |
| What it looks like and how it behaves | [product/ux-specification.md](product/ux-specification.md) |
| How it is built | [engineering/architecture.md](engineering/architecture.md) |
| What the data looks like | [engineering/domain-model.md](engineering/domain-model.md) |
| How CC-CEDICT and HSK become cards | [engineering/data-pipeline.md](engineering/data-pipeline.md) |
| How cards get scheduled | [engineering/scheduling.md](engineering/scheduling.md) |
| How we know it is correct | [engineering/testing-strategy.md](engineering/testing-strategy.md) |
| How to write code here | [engineering/conventions.md](engineering/conventions.md) |
| Who does what | [team/charter.md](team/charter.md) |
| How work is routed | [team/communication-protocol.md](team/communication-protocol.md) |
| What happens next | [project/roadmap.md](project/roadmap.md) |
| Why something was decided | [project/decision-log.md](project/decision-log.md) |
| What could go wrong | [project/risk-register.md](project/risk-register.md) |
| What the owner needs to decide | [project/open-questions.md](project/open-questions.md) |
| What a term means | [reference/glossary.md](reference/glossary.md) |
| What is being worked on now | [workstream/board.md](workstream/board.md) |

## Conventions

- Every document names its **owner** and its **status** in the header.
- Status is `Draft` (written, unratified), `Current` (ratified and accurate), or
  `Superseded`.
- Requirement IDs (`FR-##`, `NFR-##`) are permanent. Withdraw them; never delete or
  reuse them.
- Decisions live in the decision log as ADRs (`DEC-###`). A decision that exists
  only in a conversation does not exist.
- Risks are `RISK-#`; open questions are `OQ-#`. Both are cited by ID from
  elsewhere.
- Documentation changes in the same commit as the behaviour it describes.

## Current state

**Milestone M0** — the documentation set exists and the agent team is defined. No
code has been written.

Settled by the owner on 2026-08-24: the stack is ratified; there are **six** HSK
levels with no A/B split; **spaced repetition is in scope for v1**; application
code is **GPL-3.0** and dictionary data remains CC BY-SA 4.0.

Delegated to Claude Code and decided on the same day: the HSK word list is taken as
a **level tag only** with Red owning the choice ([DEC-017](project/decision-log.md));
visual direction, hosting, scheduling algorithm and export prompting all settled
([DEC-018](project/decision-log.md) to [DEC-020](project/decision-log.md)).

**There are no open questions and nothing is blocking.** M1 is ready to start;
[WO-003](workstream/work-orders/WO-003-hsk-word-list.md) is written and is the
critical path.
