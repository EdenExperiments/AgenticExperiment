# Delivery Artifacts

Stage artifacts from the command-driven delivery pipeline (Pillar D, M5). Every stage of
`/fix`, `/feature`, `/epic`, and `/new-project` ends by writing an artifact here; the next stage
consumes the artifact, not the chat. Repo files are durable memory; chat context is disposable.

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
- Task artifacts must be self-contained (acceptance criteria, target paths, named verification
  command, out-of-scope notes).
- Folders for merged work stay in place as the evidence trail; they feed the golden-PR set and
  outcome metrics (brief §7) via `apps/cursor-lab`.
