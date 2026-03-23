# Spec: Skill Create Overhaul (Phase 6)

**Status:** DRAFT
**Features:** F-038 (Skill create overhaul — Preset/Custom/Arbiter)
**Work type:** visual
**Date:** 2026-03-23

---

## Summary

Transform the skill creation flow from a utilitarian form into a character-creation experience. Two clearly separated paths (Preset gallery vs Custom skill) lead into a 3-step narrative flow: Identity → Appraisal → The Arbiter. The Arbiter step becomes a themed AI dialogue experience with per-theme avatar and animation treatments.

No new API endpoints or schema changes — the existing `calibrateSkill`, `getPresets`, `listCategories`, and `createSkill` APIs are sufficient.

---

## Motivation

The current skill create page is functional but flat — a single monolithic form with preset selection mixed into name entry, AI calibration crammed into Step 1, and a bare "Confirm" screen as Step 3. The page guide envisions this as character creation: discovering skills, appraising your level, then consulting The Arbiter. Phase 6 delivers that vision.

---

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| P6-D1 | Full-screen path selector before Step 1 | The page guide says "clearly separated at the start." Two big themed cards make the choice obvious and set the narrative tone. |
| P6-D2 | 3-step flow: Identity → Appraisal → The Arbiter | Matches the page guide step labels. The Arbiter is the finale — calibration result flows into skill creation. No separate Step 4 "Confirm." |
| P6-D3 | AI calibration moves from Step 1 to Step 3 | The Arbiter is a core selling point (per page guide), not a buried option. Step 3 gives it narrative space: themed avatar, dialogue, calibration result, accept/override, create. |
| P6-D4 | Arbiter avatar and dialogue: medium scope | Themed avatar (sage/AI entity/clean icon) with per-theme text animation (typewriter/scan/fade). In-character dialogue. No multi-turn dialogue tree — single calibration call. |
| P6-D5 | Arbiter component lives in `packages/ui` | Reusable for potential future AI dialogue contexts (gate assessment, coaching). Shared component, not page-local. |
| P6-D6 | Preset path shows progression preview with static tier milestones | `ProgressionPreview` displays the D-014 tier structure (Novice→Legend), gate boundary levels, and tier names. This is derived from the XP curve constants — not preset-specific data. No API change needed. |
| P6-D7 | Step 3 includes "Create Skill" — no separate confirmation | The Arbiter step shows the calibration result, lets the user accept or override the suggestion, and has the final "Create Skill" button. This keeps the flow at 3 steps. A brief summary (name, level, category) is shown above the create button. |
| P6-D8 | Users without API key skip The Arbiter | If no Claude API key is saved, Step 3 shows a brief summary + "Create Skill" button without the Arbiter dialogue. An "Add API key" link is shown as a soft upsell. The Arbiter is optional (D-011). The `has_key` boolean from `GET /api/v1/account/api-key` (via `getAPIKeyStatus`) determines this. |
| P6-D9 | Custom path allows category selection in Step 1 | Category picker (already exists) stays in the Identity step for custom skills. Preset path locks category to the preset's category. |
| P6-D10 | Starting level picker goes to 50 (UI restriction) | D-018 allows up to 99 server-side, but the current page already caps the picker at 50. This is an intentional UX choice — levels above 50 represent deep expertise that is better established through progression than self-reporting. The server-side cap at 99 remains as a safety net. |
| P6-D11 | Navigating back to path selector resets all draft state | The path selector is a fresh start. If the user navigates back from Step 1/2/3 all the way to the path selector, the draft resets. No confirmation dialog — the user explicitly chose to go back through multiple steps. Within the 3-step flow, draft state is preserved when using Back/Next. |

---

## Schema Changes

None.

---

## API Changes

None. All existing APIs are sufficient:
- `GET /api/v1/presets` — preset gallery data (returns `id`, `name`, `description`, `category_id`, `category_name`, `category_slug`)
- `GET /api/v1/categories` — category list
- `POST /api/v1/calibrate` — AI calibration (The Arbiter)
- `POST /api/v1/skills` — skill creation
- `GET /api/v1/account/api-key` — returns `{ has_key: boolean, key_hint?: string }` to check if user has an API key

---

## Zones Touched

| Zone | Path | Changes |
|------|------|---------|
| Shared UI | `packages/ui/src/` | `ArbiterAvatar`, `ArbiterDialogue`, `PathSelector`, `PresetGallery`, `ProgressionPreview` components |
| Next.js App | `apps/rpg-tracker/app/(app)/skills/new/page.tsx` | Complete rework of skill create page |

**Shared package risk:** Adding 5 new exports to `packages/ui/src/index.ts` touches the barrel file shared by `apps/nutri-log` and `apps/mental-health`. After adding exports, run `pnpm turbo run build` from the repo root to verify no cascading build failures.

---

## Flow

### Path Selector (pre-Step)

Full-screen selector with two themed cards:

- **"Choose a Preset"** — icon/illustration, brief description: "Start from a template with predefined progression gates"
- **"Create Custom Skill"** — icon/illustration, brief description: "Define your own skill from scratch"

Theme treatments:
- **Minimal:** Clean side-by-side cards, muted icons, subtle hover
- **Retro:** "Choose Your Class" heading, bordered cards with pixel-art icons, gold accent
- **Modern:** "Select Mission Type" heading, glass-effect cards with neon border glow

A "Back to Skills" link returns to the skills list. Navigating back to the path selector from any step resets all draft state (P6-D11).

### Step 1: Identity

**Preset path:**
- Preset gallery (searchable, grouped by category) — replaces the current toggle-and-search
- Clicking a preset card expands a `ProgressionPreview` panel showing the tier progression timeline (D-014 tier names and gate boundary levels — static data, not preset-specific)
- "Select" button commits the preset and fills name/description/category
- Name and description are pre-filled but editable
- **Loading state:** While presets are loading, the gallery shows a skeleton layout (3–6 placeholder cards). If the API call fails, show an error message with a retry option.
- **Empty state:** If presets list is empty, show a message: "No presets available yet" with a "Create Custom Skill instead" link that switches path. If search returns zero results, show "No presets match your search" with a "Clear search" button.

**Custom path:**
- Name input (required, max 60 chars)
- Description textarea (optional, max 400 chars, helps AI calibrate)
- Category picker (optional, pill buttons for each category)

Both paths: "Next" button advances to Step 2 (disabled until name is filled).

### Step 2: Appraisal

- Starting level picker (scroll-wheel or stepper widget, 1–50, with tier boundary labels). Not a bare list of 50 tappable items — must be usable on mobile. The cap at 50 is an intentional UX restriction (P6-D10); D-018's server-side cap of 99 remains as a safety net.
- Gate info banner when starting level > 9
- **Preset path only:** `ProgressionPreview` is shown below the level picker with `highlightLevel` set to the currently selected level, so the user can see which tier they'll start in. (Per page guide: "Preset path shows expected progression preview" in Step 2.)

"Back" and "Next" buttons.

### Step 3: The Arbiter

**With API key (detected via `getAPIKeyStatus` → `has_key: true`):**

1. Arbiter avatar appears with themed entrance animation
2. Arbiter speaks an in-character greeting:
   - Minimal: "Let's assess your starting point."
   - Retro: "Tell me of your experience with this art..."
   - Modern: "Initiating proficiency scan..."
3. "Consult The Arbiter" button triggers `calibrateSkill` API call
4. During loading: themed animation (Retro: typewriter dots, Modern: scan line, Minimal: spinner)
5. Result appears as Arbiter dialogue:
   - Minimal: "Based on your description, I'd suggest Level {N}. {rationale}"
   - Retro: "I sense you are of the {tier_name} order... Level {N} befits your experience. {rationale}"
   - Modern: "Scan complete. Proficiency level: {N}. Analysis: {rationale}"
6. Two actions: "Accept suggestion (Level {N})" or "Keep my level (Level {current})". The Arbiter's suggested level is pre-selected by default. "Keep my level" is an explicit opt-out that reverts to the picker value from Step 2.
7. Brief summary panel: skill name, final level, category
8. "Create Skill" button — creates and redirects to `/skills/{id}` (the newly created skill's detail page). On creation error, show an inline error without losing draft state.

**Without API key (`has_key: false`):**

1. Brief summary panel: skill name, current level, category
2. Soft upsell: "Add a Claude API key to unlock The Arbiter — AI-powered level calibration" with link to `/account/api-key`
3. "Create Skill" button

**On calibration error:**

1. Error message in Arbiter's voice:
   - Minimal: "Calibration unavailable. You can create your skill with your selected level."
   - Retro: "The spirits are silent today... Proceed with your own judgement, adventurer."
   - Modern: "Scan interrupted — external service offline. Manual configuration active."
2. "Create Skill" button with current level

**Note on page logic:** The state machine (path selection, step navigation, draft management, mutation wiring) is functional logic, but since the existing `calibrateSkill` and `createSkill` APIs are unchanged and already have test coverage, no new logic tests are needed. The reviewer verifies the wiring visually.

---

## UI Components

### PathSelector (packages/ui)

Two-card selector for Preset vs Custom path.

Props:
```typescript
interface PathSelectorProps {
  onSelectPreset: () => void
  onSelectCustom: () => void
  backHref?: string  // defaults to '/skills' if not provided
}
```

Theme-aware cards. Mobile: stacked vertically. Desktop: side-by-side. The `backHref` prop allows reuse outside the rpg-tracker app.

### PresetGallery (packages/ui)

Searchable preset browser with category grouping.

Props:
```typescript
interface PresetGalleryProps {
  presets: Array<{ id: string; name: string; description: string; category_id: string; category_name: string; category_slug: string }>
  onSelect: (preset: { id: string; name: string; description: string; category_id: string }) => void
  selectedId: string | null
  onSwitchToCustom?: () => void  // shown in empty state
}
```

Includes search input with zero-result state ("No presets match your search" + "Clear search" button). When the full presets list is empty, shows "No presets available yet" + optional "Create Custom Skill instead" link via `onSwitchToCustom`. Selecting a preset expands `ProgressionPreview` inline below the card.

### ProgressionPreview (packages/ui)

Shows the D-014 tier progression timeline — static tier names and gate boundary levels.

Props:
```typescript
interface ProgressionPreviewProps {
  highlightLevel?: number  // optional — highlights the tier the user would start in
}
```

Visual timeline of all 11 tiers (Novice through Legend) with 10 gate boundary levels from D-014/D-016. If `highlightLevel` is provided, the corresponding tier is visually emphasised. All data is derived from the D-014/D-016 constants — no API call needed.

### ArbiterAvatar (packages/ui)

Themed AI avatar for the calibration dialogue.

Props:
```typescript
interface ArbiterAvatarProps {
  state: 'idle' | 'thinking' | 'speaking'
  size?: 'sm' | 'md' | 'lg'
}
```

Theme treatments:
- **Minimal:** Clean circular icon with subtle pulse on "thinking"
- **Retro:** Pixel-art sage character. Hood/robe silhouette. Amber glow on "thinking". Gold border.
- **Modern:** Holographic wireframe head/geometric shape. Cyan/magenta glow. Scan line on "thinking".

### ArbiterDialogue (packages/ui)

Themed text display with per-theme reveal animation.

Props:
```typescript
interface ArbiterDialogueProps {
  text: string
  animate?: boolean
  variant?: 'greeting' | 'result' | 'error'
}
```

Animation treatments:
- **Minimal:** Simple fade-in (200ms)
- **Retro:** Typewriter effect — characters appear one at a time with cursor blink
- **Modern:** Scan-line reveal — text appears behind a moving horizontal line with glow

**Accessibility requirement:** The full `text` content must be in the DOM immediately (for screen readers). Visual reveal animations are applied via CSS (clip-path, opacity, overlay) — not by progressively inserting characters into the DOM. The dialogue container uses `aria-live="polite"` so new text is announced to screen readers. When `prefers-reduced-motion: reduce` is active, text appears immediately with no character-by-character or scan-line reveal regardless of theme.

---

## Acceptance Criteria

### Visual ACs (reviewer gate)

| ID | Assertion | Zone |
|----|-----------|------|
| ACV-1 | Path selector screen shows two clearly separated cards (Preset vs Custom) before Step 1 | UI |
| ACV-2 | Path selector cards are theme-aware (different heading, styling, icons per theme) | UI |
| ACV-3 | Path selector stacks vertically on mobile (<768px), side-by-side on desktop | UI |
| ACV-4 | Preset gallery groups presets by category with search functionality; zero-result state shows "No presets match" with clear button | UI |
| ACV-5 | Selecting a preset in the gallery shows a ProgressionPreview with tier milestone timeline (D-014 tier names and gate levels — static data) | UI |
| ACV-6 | Step indicator shows narrative labels: "Identity", "Appraisal", "The Arbiter" | UI |
| ACV-7 | Step 3 shows Arbiter avatar with theme-appropriate visual treatment | UI |
| ACV-8 | Arbiter greeting text uses in-character dialogue per theme | UI |
| ACV-9 | "Consult The Arbiter" button triggers calibration; loading state shows themed animation | UI |
| ACV-10 | Calibration result displayed as Arbiter dialogue with themed text reveal animation | UI |
| ACV-11 | User can accept AI suggestion or keep their manually-set level | UI |
| ACV-12 | "Create Skill" button on Step 3 creates the skill and navigates to skill detail | UI |
| ACV-13 | Users without API key (`has_key: false`) see summary + create button on Step 3, no Arbiter dialogue | UI |
| ACV-14 | Calibration error shows themed error message in Arbiter's voice | UI |
| ACV-15 | All new components use CSS custom properties — no hardcoded colours | UI |
| ACV-16 | All new components are responsive (mobile-first, stack on small screens) | UI |
| ACV-17 | Preset path locks category to preset's category; Custom path allows category selection | UI |
| ACV-18 | "Back to Skills" link on path selector returns to skills list | UI |
| ACV-19 | Navigating back to path selector from any step resets all draft state | UI |
| ACV-20 | Empty presets list shows "No presets available yet" with "Create Custom Skill instead" link | UI |
| ACV-21 | ArbiterDialogue and ArbiterAvatar animations respect `prefers-reduced-motion` and scale with `--motion-scale`; all animation durations use `calc(Nms * var(--motion-scale))`. When `prefers-reduced-motion: reduce`, text appears immediately with no reveal animation | UI |
| ACV-22 | Step indicator is not rendered on the path selector screen; it appears only after a path is chosen (Step 1 onwards) | UI |
| ACV-23 | ArbiterDialogue renders full text in the DOM immediately; visual reveal is CSS-only (clip-path/opacity), not progressive DOM insertion. Container uses `aria-live="polite"` | UI |
| ACV-24 | After calibration result, Arbiter's suggested level is pre-selected by default; "Keep my level" is an explicit opt-out | UI |
| ACV-25 | On skill creation error, inline error is shown on Step 3 without losing draft state | UI |

---

## Parallelisation Notes

**Shared packages touched:** `packages/ui` (5 new components added to `index.ts` barrel export).

**Sequencing:**
1. UI components (PathSelector, PresetGallery, ProgressionPreview, ArbiterAvatar, ArbiterDialogue) can be built in parallel — they have no dependencies on each other
2. Page rework depends on all components being exported from `packages/ui`
3. No backend work — single zone

**Build verification:** After adding exports to `packages/ui/src/index.ts`, run `pnpm turbo run build` from the repo root to catch cascading issues in `apps/nutri-log` and `apps/mental-health`.

**Safe parallelism:**
- All 5 UI components can be built simultaneously
- Page integration follows after components

---

## Out of Scope

- Multi-turn dialogue tree with The Arbiter (future enhancement)
- Arbiter audio/sound effects
- Animated avatar sprites (CSS/SVG only — no image assets)
- New API endpoints or schema changes
- Preset CRUD (admin creates presets, not users)
- Gate description editing during skill creation (gate descriptions come from AI calibration or preset defaults)
- Extending the starting level picker beyond 50 (P6-D10)
