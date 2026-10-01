import {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_PREFERENCE,
  normalizeThemePreference,
  type ThemeId,
  type ThemePreference,
} from '@/models/theme'

export {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_PREFERENCE,
  isThemeId,
  isThemePreference,
  normalizeThemePreference,
  type ThemeId,
  type ThemePreference,
} from '@/models/theme'
import { THEME_DEFINITIONS, type ThemeDefinition } from './themeDefinitions'

export {
  THEME_DEFINITIONS,
  THEME_DISPLAY_NAMES,
  THEME_OPTIONS,
  getThemeDisplayName,
  type ContentColor,
  type ThemeDefinition,
  type ThemeFamily,
  type ThemeMode,
} from './themeDefinitions'

const SETTINGS_STORAGE_KEY = 'my-notebook:settings'
const FALLBACK_THEME_STORAGE_KEY = 'my-notebook:theme-preference'
const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

export function getThemePreference(): ThemePreference {
  try {
    const settings = JSON.parse(globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY) ?? '{}') as {
      theme?: unknown
    }
    const theme = normalizeThemePreference(settings.theme)
    if (theme !== DEFAULT_THEME_PREFERENCE || settings.theme === 'system') return theme

    return normalizeThemePreference(globalThis.localStorage?.getItem(FALLBACK_THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_PREFERENCE
  }
}

export function setThemePreference(preference: ThemePreference): void {
  const normalizedPreference = normalizeThemePreference(preference)
  try {
    const settings = JSON.parse(
      globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ) as Record<string, unknown>
    settings.theme = normalizedPreference
    globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    globalThis.localStorage?.setItem(FALLBACK_THEME_STORAGE_KEY, normalizedPreference)
  } catch {
    try {
      globalThis.localStorage?.setItem(FALLBACK_THEME_STORAGE_KEY, normalizedPreference)
    } catch {
      // The active DOM theme still works when storage is unavailable.
    }
  }
}

export function getResolvedTheme(
  preference: ThemePreference = getThemePreference(),
  prefersDark = systemPrefersDark(),
): ThemeId {
  return preference === 'system'
    ? prefersDark
      ? DEFAULT_DARK_THEME_ID
      : DEFAULT_THEME_ID
    : preference
}

export function applyTheme(preferenceOrTheme: ThemePreference): ThemeId {
  const root = globalThis.document?.documentElement
  const resolvedTheme = getResolvedTheme(preferenceOrTheme)
  const theme = THEME_DEFINITIONS[resolvedTheme]

  if (!root) return resolvedTheme

  root.dataset.theme = resolvedTheme
  root.dataset.themePreference = preferenceOrTheme
  root.dataset.themeMode = theme.mode
  root.style.colorScheme = theme.mode

  for (const [name, value] of Object.entries(getThemeCssVariables(theme))) {
    root.style.setProperty(name, value)
  }

  return resolvedTheme
}

export function subscribeToSystemTheme(callback: (theme: ThemeId) => void): () => void {
  const mediaQuery = globalThis.matchMedia?.(SYSTEM_DARK_QUERY)
  if (!mediaQuery) return () => undefined

  const listener = (): void => {
    const preference = getThemePreference()
    if (preference === 'system') {
      callback(applyTheme(preference))
    }
  }

  mediaQuery.addEventListener('change', listener)
  return () => mediaQuery.removeEventListener('change', listener)
}

export function getThemeCssVariables(theme: ThemeDefinition): Record<string, string> {
  return {
    '--color-bg-app': theme.colors.background.app,
    '--color-bg-sidebar': theme.colors.background.sidebar,
    '--color-bg-editor': theme.colors.background.editor,
    '--color-bg-surface': theme.colors.background.surface,
    '--color-bg-elevated': theme.colors.background.elevated,
    '--color-bg-hover': theme.colors.background.hover,
    '--color-bg-active': theme.colors.background.active,
    '--color-bg-selected': theme.colors.background.selected,
    '--color-border-subtle': theme.colors.border.subtle,
    '--color-border-default': theme.colors.border.default,
    '--color-border-strong': theme.colors.border.strong,
    '--color-text-primary': theme.colors.text.primary,
    '--color-text-secondary': theme.colors.text.secondary,
    '--color-text-tertiary': theme.colors.text.tertiary,
    '--color-text-disabled': theme.colors.text.disabled,
    '--color-text-placeholder': theme.colors.text.placeholder,
    '--color-text-link': theme.colors.text.link,
    '--color-text-on-accent': theme.colors.text.onAccent,
    '--color-accent-primary': theme.colors.accent.primary,
    '--color-accent-hover': theme.colors.accent.hover,
    '--color-accent-active': theme.colors.accent.active,
    '--color-accent-soft': theme.colors.accent.soft,
    '--color-focus-ring': theme.colors.accent.focus,
    '--color-selection': theme.colors.accent.selection,
    '--color-editor-block-hover': theme.colors.editor.blockHover,
    '--color-editor-block-selected': theme.colors.editor.blockSelected,
    '--color-editor-block-handle': theme.colors.editor.blockHandle,
    '--color-editor-indent-guide': theme.colors.editor.indentGuide,
    '--color-editor-placeholder': theme.colors.editor.placeholder,
    '--color-editor-quote-border': theme.colors.editor.quoteBorder,
    '--color-editor-code-bg': theme.colors.editor.codeBackground,
    '--color-editor-inline-code-bg': theme.colors.editor.inlineCodeBackground,
    '--color-editor-table-header': theme.colors.editor.tableHeader,
    '--color-editor-table-border': theme.colors.editor.tableBorder,
    '--color-agent-accent': theme.colors.agent.accent,
    '--color-agent-panel-bg': theme.colors.agent.panelBackground,
    '--color-agent-message-bg': theme.colors.agent.messageBackground,
    '--color-agent-thinking-bg': theme.colors.agent.thinkingBackground,
    '--color-agent-suggestion-bg': theme.colors.agent.suggestionBackground,
    '--color-agent-citation-bg': theme.colors.agent.citationBackground,
    '--color-diff-added-bg': theme.colors.diff.addedBackground,
    '--color-diff-added-text': theme.colors.diff.addedText,
    '--color-diff-removed-bg': theme.colors.diff.removedBackground,
    '--color-diff-removed-text': theme.colors.diff.removedText,
    '--color-diff-modified-bg': theme.colors.diff.modifiedBackground,
    '--color-diff-modified-text': theme.colors.diff.modifiedText,
    '--color-status-success': theme.colors.status.success,
    '--color-status-warning': theme.colors.status.warning,
    '--color-status-error': theme.colors.status.error,
    '--color-status-info': theme.colors.status.info,
    ...getContentColorCssVariables(theme),
    '--accent': theme.colors.accent.primary,
    '--accent-hover': theme.colors.accent.hover,
    '--accent-soft': theme.colors.accent.soft,
    '--accent-ring': colorMix(theme.colors.accent.focus, 0.32),
    '--accent-color': theme.colors.accent.primary,
  }
}

export function getCssColorValue(name: string): string {
  const root = globalThis.document?.documentElement
  if (!root) return ''
  return globalThis.getComputedStyle?.(root).getPropertyValue(name).trim() ?? ''
}

function getContentColorCssVariables(theme: ThemeDefinition): Record<string, string> {
  return Object.fromEntries(
    Object.entries(theme.colors.content).flatMap(([name, value]) => [
      [`--color-content-${name}-bg`, value.background],
      [`--color-content-${name}-text`, value.text],
      [`--color-content-${name}-border`, value.border],
    ]),
  )
}

function systemPrefersDark(): boolean {
  return globalThis.matchMedia?.(SYSTEM_DARK_QUERY).matches ?? false
}

function colorMix(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character + character)
          .join('')
      : normalized
  const number = Number.parseInt(value, 16)
  const red = (number >> 16) & 255
  const green = (number >> 8) & 255
  const blue = number & 255
  return `rgb(${red} ${green} ${blue} / ${Math.round(alpha * 100)}%)`
}
