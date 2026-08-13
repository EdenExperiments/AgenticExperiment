# Skills

Skills lets a user browse tracked skills, search/filter them, and start creating a new skill.

## Sub-features

- `skills-list` shows heading Skills and either the empty state or skill cards.
- `skills-add` opens `/skills/new` from + Add Skill or Create your first skill.
- `skills-search` filters the list via the Search skills field when skills exist.

## How to get to it (user POV)

- Choose Skills in the desktop sidebar (or LifeQuest in mobile Main navigation).
- Open `/skills` directly while signed in.
- From dashboard empty state, choose Create your first skill.

## Driving it with verify-lifequest

Preconditions:

- Doctor `--full` HEALTHY; signed in with `VERIFY_EMAIL` / `VERIFY_PASSWORD`.

- **Open list.** Go to `/skills`. Heading `Skills` is visible.
- **Add entry.** Choose + Add Skill (or Create your first skill when empty). URL is `/skills/new` (nav may hide during the multi-step flow).
- **Search.** When skills exist, fill `role=searchbox` / label Search skills with a known name. Matching cards remain; Clear search restores the list.
- **Proof.** Screenshot + ARIA under `artifacts/skills/` for list and for `/skills/new` after Add.

## Gotchas

- Sidebar label is Skills; mobile tab label is LifeQuest — both go to `/skills`.
- Creating a full skill is a multi-step wizard; list entry proof stops at `/skills/new` unless you intentionally complete and then re-check `/skills`.
- Search is client-side and debounced (~200ms); wait for list updates, not a fixed short sleep only.
