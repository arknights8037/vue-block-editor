export const HEADING_LEVELS = [1, 2, 3, 4] as const

export type HeadingLevel = (typeof HEADING_LEVELS)[number]

export const HEADING_LEVEL_LABELS: Record<HeadingLevel, string> = {
  1: '一',
  2: '二',
  3: '三',
  4: '四',
}

export function normalizeHeadingLevel(value: unknown): HeadingLevel {
  const level = Number(value)
  return HEADING_LEVELS.includes(level as HeadingLevel) ? (level as HeadingLevel) : 1
}

export function getCollapsibleHeadingTitle(level: HeadingLevel): string {
  return `${HEADING_LEVEL_LABELS[level]}级折叠标题`
}
