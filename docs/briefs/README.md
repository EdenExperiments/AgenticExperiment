# Ephemeral agent briefs

Write long plans here: cases, AC tables, session prompts, file lists.

**Tracked:** this README only.  
**Ignored:** everything else in this folder.

Protocol:

1. `docs/briefs/<short-slug>.md` while an agent (or you) is planning.
2. Implement. Tests encode the behaviour.
3. If a rule should outlive the PR (namespace, “never scrape”, “gate must be completable”), add two sentences to `docs/` or `docs/apps/`.
4. Delete the brief.

Do not merge briefs into `main`. Do not turn this folder into a tracker.
