import { normalizeThemePreference, type ThemePreference } from './theme'
export type { EditorFeatureOptions } from './features'

export type EditorContentWidth = 'compact' | 'standard' | 'wide'
export type EditorFontSize = 'small' | 'standard' | 'large'
export type EditorLineHeight = 'compact' | 'comfortable' | 'relaxed'
export type EditorJumpAid = 'off' | 'anchors' | 'outline'
export type EditorJumpAidPosition = 'left' | 'right'
export type EditorJumpAidMaxLevel = 1 | 2 | 3 | 4
export type BlockCopyBehavior = 'duplicate' | 'clipboard'
export type AccentColor = 'blue' | 'violet' | 'green' | 'orange'
export type StartupBehavior = 'last' | 'recent'
export type NewDocumentLocation = 'current' | 'root'
export type ShortcutAction = 'search' | 'newDocument' | 'save' | 'openSettings' | 'importDocument'

export type AppShortcuts = Record<ShortcutAction, string>

export const DEFAULT_CHINESE_FONT_FAMILY =
  'PingFang SC, Microsoft YaHei, Noto Sans CJK SC, Source Han Sans SC, sans-serif'
export const DEFAULT_WESTERN_FONT_FAMILY =
  'Inter, Segoe UI, SF Pro Text, Helvetica Neue, Arial, sans-serif'

export interface AppSettings {
  autosaveDelay: number
  spellcheck: boolean
  showBlockHandles: boolean
  contentWidth: EditorContentWidth
  fontSize: EditorFontSize
  lineHeight: EditorLineHeight
  jumpAid: EditorJumpAid
  jumpAidPosition: EditorJumpAidPosition
  jumpAidMaxLevel: EditorJumpAidMaxLevel
  chineseFontFamily: string
  westernFontFamily: string
  blockCopyBehavior: BlockCopyBehavior
  theme: ThemePreference
  accentColor: AccentColor
  startupBehavior: StartupBehavior
  newDocumentLocation: NewDocumentLocation
  confirmBeforeDelete: boolean
  sensitiveActionPasswordEnabled: boolean
  sensitiveActionPasswordHash: string
  allowDeveloperMode: boolean
  reduceMotion: boolean
  dataDirectory: string | null
  shortcuts: AppShortcuts
}

export const DEFAULT_SHORTCUTS: AppShortcuts = {
  search: 'Ctrl+K',
  newDocument: 'Ctrl+N',
  save: 'Ctrl+S',
  openSettings: 'Ctrl+,',
  importDocument: 'Ctrl+Shift+I',
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autosaveDelay: 800,
  spellcheck: true,
  showBlockHandles: true,
  contentWidth: 'standard',
  fontSize: 'standard',
  lineHeight: 'comfortable',
  jumpAid: 'off',
  jumpAidPosition: 'right',
  jumpAidMaxLevel: 4,
  chineseFontFamily: DEFAULT_CHINESE_FONT_FAMILY,
  westernFontFamily: DEFAULT_WESTERN_FONT_FAMILY,
  blockCopyBehavior: 'duplicate',
  theme: 'system',
  accentColor: 'blue',
  startupBehavior: 'last',
  newDocumentLocation: 'current',
  confirmBeforeDelete: true,
  sensitiveActionPasswordEnabled: false,
  sensitiveActionPasswordHash: '',
  allowDeveloperMode: false,
  reduceMotion: false,
  dataDirectory: null,
  shortcuts: { ...DEFAULT_SHORTCUTS },
}

const SETTINGS_STORAGE_KEY = 'my-notebook:settings'

export function loadAppSettings(): AppSettings {
  try {
    const parsed = JSON.parse(
      globalThis.localStorage?.getItem(SETTINGS_STORAGE_KEY) ?? '{}',
    ) as Partial<AppSettings>

    return normalizeAppSettings(parsed)
  } catch {
    return createDefaultAppSettings()
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    globalThis.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Settings remain active for the current session when storage is unavailable.
  }
}

export function createDefaultAppSettings(): AppSettings {
  return {
    ...DEFAULT_APP_SETTINGS,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  }
}

export function normalizeAppSettings(settings: Partial<AppSettings>): AppSettings {
  const shortcuts = settings.shortcuts as Partial<AppShortcuts> | undefined
  const sensitiveActionPasswordHash =
    typeof settings.sensitiveActionPasswordHash === 'string' &&
    /^[a-f0-9]{64}$/i.test(settings.sensitiveActionPasswordHash)
      ? settings.sensitiveActionPasswordHash.toLowerCase()
      : ''

  return {
    autosaveDelay: [400, 800, 1500].includes(settings.autosaveDelay ?? 0)
      ? (settings.autosaveDelay as number)
      : DEFAULT_APP_SETTINGS.autosaveDelay,
    spellcheck:
      typeof settings.spellcheck === 'boolean'
        ? settings.spellcheck
        : DEFAULT_APP_SETTINGS.spellcheck,
    showBlockHandles:
      typeof settings.showBlockHandles === 'boolean'
        ? settings.showBlockHandles
        : DEFAULT_APP_SETTINGS.showBlockHandles,
    contentWidth: isOneOf(settings.contentWidth, ['compact', 'standard', 'wide'])
      ? settings.contentWidth
      : DEFAULT_APP_SETTINGS.contentWidth,
    fontSize: isOneOf(settings.fontSize, ['small', 'standard', 'large'])
      ? settings.fontSize
      : DEFAULT_APP_SETTINGS.fontSize,
    lineHeight: isOneOf(settings.lineHeight, ['compact', 'comfortable', 'relaxed'])
      ? settings.lineHeight
      : DEFAULT_APP_SETTINGS.lineHeight,
    jumpAid: isOneOf(settings.jumpAid, ['off', 'anchors', 'outline'])
      ? settings.jumpAid
      : DEFAULT_APP_SETTINGS.jumpAid,
    jumpAidPosition: isOneOf(settings.jumpAidPosition, ['left', 'right'])
      ? settings.jumpAidPosition
      : DEFAULT_APP_SETTINGS.jumpAidPosition,
    jumpAidMaxLevel: normalizeJumpAidMaxLevel(settings.jumpAidMaxLevel),
    chineseFontFamily: normalizeFontFamily(
      settings.chineseFontFamily,
      DEFAULT_APP_SETTINGS.chineseFontFamily,
    ),
    westernFontFamily: normalizeFontFamily(
      settings.westernFontFamily,
      DEFAULT_APP_SETTINGS.westernFontFamily,
    ),
    blockCopyBehavior: isOneOf(settings.blockCopyBehavior, ['duplicate', 'clipboard'])
      ? settings.blockCopyBehavior
      : DEFAULT_APP_SETTINGS.blockCopyBehavior,
    theme: normalizeThemePreference(settings.theme),
    accentColor: isOneOf(settings.accentColor, ['blue', 'violet', 'green', 'orange'])
      ? settings.accentColor
      : DEFAULT_APP_SETTINGS.accentColor,
    startupBehavior: isOneOf(settings.startupBehavior, ['last', 'recent'])
      ? settings.startupBehavior
      : DEFAULT_APP_SETTINGS.startupBehavior,
    newDocumentLocation: isOneOf(settings.newDocumentLocation, ['current', 'root'])
      ? settings.newDocumentLocation
      : DEFAULT_APP_SETTINGS.newDocumentLocation,
    confirmBeforeDelete:
      typeof settings.confirmBeforeDelete === 'boolean'
        ? settings.confirmBeforeDelete
        : DEFAULT_APP_SETTINGS.confirmBeforeDelete,
    sensitiveActionPasswordEnabled:
      typeof settings.sensitiveActionPasswordEnabled === 'boolean' && sensitiveActionPasswordHash
        ? settings.sensitiveActionPasswordEnabled
        : DEFAULT_APP_SETTINGS.sensitiveActionPasswordEnabled,
    sensitiveActionPasswordHash,
    allowDeveloperMode:
      typeof settings.allowDeveloperMode === 'boolean'
        ? settings.allowDeveloperMode
        : DEFAULT_APP_SETTINGS.allowDeveloperMode,
    reduceMotion:
      typeof settings.reduceMotion === 'boolean'
        ? settings.reduceMotion
        : DEFAULT_APP_SETTINGS.reduceMotion,
    dataDirectory:
      typeof settings.dataDirectory === 'string' && settings.dataDirectory.trim()
        ? settings.dataDirectory.trim()
        : null,
    shortcuts: {
      search: normalizeShortcut(shortcuts?.search, DEFAULT_SHORTCUTS.search),
      newDocument: normalizeShortcut(shortcuts?.newDocument, DEFAULT_SHORTCUTS.newDocument),
      save: normalizeShortcut(shortcuts?.save, DEFAULT_SHORTCUTS.save),
      openSettings: normalizeShortcut(shortcuts?.openSettings, DEFAULT_SHORTCUTS.openSettings),
      importDocument: normalizeShortcut(
        shortcuts?.importDocument,
        DEFAULT_SHORTCUTS.importDocument,
      ),
    },
  }
}

export function shortcutFromKeyboardEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
): string | null {
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) return null

  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')

  const key = normalizeShortcutKey(event.key)
  if (!key || (parts.length === 0 && key.length === 1)) return null
  return [...parts, key].join('+')
}

export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  shortcut: string,
): boolean {
  return shortcutFromKeyboardEvent(event)?.toLocaleLowerCase() === shortcut.toLocaleLowerCase()
}

function normalizeShortcut(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 && value.length <= 40 ? value : fallback
}

function normalizeFontFamily(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const normalized = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
    .slice(0, 220)
  return normalized || fallback
}

function normalizeJumpAidMaxLevel(value: unknown): EditorJumpAidMaxLevel {
  const level = typeof value === 'string' ? Number(value) : value
  return level === 1 || level === 2 || level === 3 || level === 4
    ? level
    : DEFAULT_APP_SETTINGS.jumpAidMaxLevel
}

function normalizeShortcutKey(key: string): string {
  const aliases: Record<string, string> = {
    ' ': 'Space',
    Escape: 'Esc',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  }
  return aliases[key] ?? (key.length === 1 ? key.toLocaleUpperCase() : key)
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T)
}
