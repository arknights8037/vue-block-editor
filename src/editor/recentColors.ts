const MAX_RECENT_COLORS = 6

export function loadRecentColors(storageKey: string): string[] {
  try {
    const stored = globalThis.localStorage?.getItem(storageKey)
    if (!stored) return []
    const colors: unknown = JSON.parse(stored)
    return Array.isArray(colors)
      ? colors.filter((color): color is string => typeof color === 'string').slice(0, MAX_RECENT_COLORS)
      : []
  } catch {
    return []
  }
}

export function rememberRecentColor(
  color: string,
  recentColors: string[],
  storageKey: string,
): string[] {
  const normalizedColor = color.toLowerCase()
  const nextColors = [
    normalizedColor,
    ...recentColors.filter((recentColor) => recentColor.toLowerCase() !== normalizedColor),
  ].slice(0, MAX_RECENT_COLORS)

  try {
    globalThis.localStorage?.setItem(storageKey, JSON.stringify(nextColors))
  } catch {
    // Restricted webviews may disable storage; callers can still use the returned in-memory history.
  }

  return nextColors
}
