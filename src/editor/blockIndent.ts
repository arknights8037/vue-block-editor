export const INDENT_ATTRIBUTE = 'indentLevel'
export const MAX_INDENT_LEVEL = 6

export function normalizeIndentLevel(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.min(MAX_INDENT_LEVEL, Math.max(0, Math.floor(parsed)))
}

export function getBlockIndentAttributes(value: unknown): Record<string, string> {
  const indentLevel = normalizeIndentLevel(value)

  if (indentLevel === 0) {
    return {}
  }

  return {
    'data-indent-level': String(indentLevel),
    style: `--block-indent-level: ${indentLevel};`,
  }
}
