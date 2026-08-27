---
id: WO-###
title: <imperative, one line>
owner: Black | White | Red | Purple
status: Draft | Ready | In Progress | In Review | Blocked | Done | Cancelled
priority: MUST | SHOULD | MAY
milestone: M#
requirements: [FR-##, NFR-##]
depends_on: [WO-###]
spec_refs:
  - <path>#<anchor>
touches:
  - <path or directory>
review_required: [White | Red | Black]
---

# WO-### — <title>

## Context

Why this work exists. Written for someone with no prior exposure to this project —
the agent receiving it has none. Two to five sentences. Cite documents; do not
paraphrase them.

## Task

What to do. Specific enough to act on; not so specific that it removes the agent's
judgement within their own domain.

## Acceptance criteria

1. …
2. …
3. …

Each criterion must be checkable by someone other than its author. "Works
correctly" is not a criterion; "all four Pinyin toggle combinations render the
expected text on both faces" is.

## Out of scope

What not to touch. Name adjacent files owned by other agents explicitly. This
section is not optional — omitting it is the most common cause of two agents
editing the same file.

## Notes

Known constraints, prior art in the repository, relevant risks.
