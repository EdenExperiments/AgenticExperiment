# Page Guide: Skill Edit

> Route: Modal on `/skills/[id]` (no dedicated route)
> Mood: Lightweight, quick, non-disruptive
> Quick update to name/description for custom skills only.

---

## Implementation

**Modal overlay** on the skill detail page. Not a dedicated route — the user stays in context.

**Constraint:** Only available for custom skills. Preset-based skills are not editable (their identity comes from the preset system).

---

## Content

- Skill name input (pre-filled)
- Skill description textarea (pre-filled)
- Update button
- Cancel / close

---

## Theme Variations

Follows general theme guidelines for modals/forms. No special treatment beyond what the theme's form and modal patterns dictate.

### Minimal
Clean modal with white background. Minimal border. Focus on inputs.

### Retro
Dark modal with warm borders. Gold accent on update button. Press Start 2P heading.

### Modern
Glass-effect modal with backdrop blur. Cyan-accented inputs. Subtle glow on focus.

---

## Elements

| Element | Status | Notes |
|---------|--------|-------|
| Name input | EXISTING | Move into modal |
| Description textarea | EXISTING | Move into modal |
| Update button | EXISTING | Restyle per theme |
| Modal wrapper | NEW | Replace dedicated `/skills/[id]/edit` page |
