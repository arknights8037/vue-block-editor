import type { BlockRange } from './blockRanges'

export function resolveDropInsertPosition(
  sourceRange: BlockRange,
  targetRange: BlockRange,
  shouldInsertAfter: boolean,
): number {
  const naturalInsertPos = shouldInsertAfter ? targetRange.to : targetRange.from
  if (naturalInsertPos === sourceRange.from && targetRange.to === sourceRange.from) {
    return targetRange.from
  }
  if (naturalInsertPos === sourceRange.to && targetRange.from === sourceRange.to) {
    return targetRange.to
  }
  return naturalInsertPos
}
