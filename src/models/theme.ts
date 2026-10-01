export type ThemeId =
  | 'paper-light'
  | 'inkstone-light'
  | 'clay-light'
  | 'nord-dark'
  | 'graphite-dark'

export type ThemePreference = ThemeId | 'system'

export const DEFAULT_THEME_ID: ThemeId = 'paper-light'
export const DEFAULT_DARK_THEME_ID: ThemeId = 'graphite-dark'
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

const THEME_IDS: readonly ThemeId[] = [
  'paper-light',
  'inkstone-light',
  'clay-light',
  'nord-dark',
  'graphite-dark',
]

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.includes(value as ThemeId)
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || isThemeId(value)
}

export function normalizeThemePreference(value: unknown): ThemePreference {
  if (isThemePreference(value)) return value
  if (value === 'light') return DEFAULT_THEME_ID
  if (value === 'dark') return DEFAULT_DARK_THEME_ID
  return DEFAULT_THEME_PREFERENCE
}
