---
name: requirements-elicitation
description: Turn a feature request into a signed requirements artifact — the one mandatory human checkpoint in the delivery pipeline.
---

# Requirements Elicitation

## When to use

At the start of `/feature`, `/epic`, and `/new-project` flows, before any code or tests exist.

Do not use for `/fix` (known defects skip elicitation) or for pure maintenance-queue items.

## Inputs

- The user's request and any referenced context
- `Documentation/product-requirements.md`, `Documentation/decision-log.md` (binding constraints)
- The relevant stack guide(s) for feasibility grounding

## Outputs

- `Documentation/delivery/<date>-<type>-<slug>/requirements.md` containing:
  - Goal (1-2 sentences) and non-goals
  - Confirmed requirements vs assumptions vs open questions (clearly separated)
  - Acceptance criteria — each one independently checkable
  - Affected zones/paths and known constraints (decision IDs where relevant)
  - Sign-off block: `Signed off by: <user> on <date>` (left blank until the human approves)

## Procedure

1. Restate the request as outcomes. Ask targeted questions only where an answer changes the
   design; batch them (1-2 at a time).
2. Check `decision-log.md` for binding constraints that shape or veto requirements; cite IDs.
3. Draft the artifact. Every acceptance criterion must be verifiable by a test, a command, or an
   explicit visual review (D-036 split).
4. Present the artifact for sign-off and STOP. The signed artifact is what downstream stages
   consume — never the chat transcript.

## Examples

### Positive

- "/feature add streak freeze" → requirements.md with criteria like "a frozen streak does not
  reset overnight (server-side test)" and an explicit open question on entitlement gating.

### Negative

- Starting implementation from chat consensus without writing or getting sign-off on the
  artifact.
