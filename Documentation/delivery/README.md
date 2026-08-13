# Delivery Artifacts

Historical stage artifacts from the retired command-driven delivery pipeline (Pillar D, M5;
superseded by D-063). Folders here remain as an evidence trail. New development uses pstack
(`/poteto-mode`) and cursor-team-kit, not `/fix`, `/feature`, `/epic`, or `/new-project`.

## Layout

```
Documentation/delivery/
  <date>-<type>-<slug>/
    requirements.md   # signed requirements artifact (mandatory human checkpoint)
    architecture.md   # /new-project only
    task-list.md      # /epic and /new-project
    task-NN.md        # one per independently-verifiable task
```

## Rules

- Artifacts are append-only history: do not rewrite a signed requirements artifact — supersede it
  with a new signed revision.
- Folders for merged work stay in place as the evidence trail; they feed the golden-PR set and
  outcome metrics (brief §7) via `apps/cursor-lab`.
