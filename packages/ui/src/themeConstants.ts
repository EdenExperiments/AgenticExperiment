/** LifeQuest themes — exposed in the theme switcher */
export type LifeQuestTheme = 'minimal' | 'retro' | 'modern'

/** Product-specific scaffold themes (NutriLog, MindTrack) */
export type ProductTheme = 'nutri-saas' | 'mental-calm' | 'workout-strength'

export type Theme = LifeQuestTheme | ProductTheme
export type VisualMode = 'clean' | 'stylish'

export const VALID_THEMES: LifeQuestTheme[] = ['minimal', 'retro', 'modern']
export const PRODUCT_THEMES: ProductTheme[] = ['nutri-saas', 'mental-calm', 'workout-strength']
export const VALID_MODES: VisualMode[] = ['clean', 'stylish']

export function isLifeQuestTheme(theme: string | null | undefined): theme is LifeQuestTheme {
  if (!theme) return false
  return (VALID_THEMES as readonly string[]).includes(theme)
}

export function isResolvableTheme(theme: string | null | undefined): theme is Theme {
  if (!theme) return false
  return (
    (VALID_THEMES as readonly string[]).includes(theme) ||
    (PRODUCT_THEMES as readonly string[]).includes(theme)
  )
}
