/** LifeQuest themes — exposed in the theme switcher */
export type LifeQuestTheme = 'minimal' | 'retro' | 'modern'

/** Product-specific identity themes. Not stored in rpgt-theme. */
export type ProductTheme = 'nutri-saas' | 'workout-forge' | 'mental-calm'

export type Theme = LifeQuestTheme | ProductTheme
export type VisualMode = 'clean' | 'stylish'
export type Atmosphere = 'none' | 'cinematic' | 'horror' | 'kawaii'

export const VALID_THEMES: LifeQuestTheme[] = ['minimal', 'retro', 'modern']
export const PRODUCT_THEMES: ProductTheme[] = ['nutri-saas', 'workout-forge', 'mental-calm']
export const VALID_MODES: VisualMode[] = ['clean', 'stylish']
export const VALID_ATMOSPHERES: Atmosphere[] = ['none', 'cinematic', 'horror', 'kawaii']

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

export function isAtmosphere(value: string | null | undefined): value is Atmosphere {
  if (!value) return false
  return (VALID_ATMOSPHERES as readonly string[]).includes(value)
}
