import type { EditorView } from '@tiptap/pm/view'

import {
  getAdjacentControllableBlocks,
  getControllableTopLevelBlocks,
  getTopLevelBlocksInRange,
  isTrailingEmptyParagraph,
  type BlockRange,
  type TopLevelBlock,
} from './blockRanges'

export interface BlockClientRect {
  top: number
  bottom: number
  left: number
  width: number
  height: number
}

export function getBlockRangeClientRect(
  view: EditorView,
  range: BlockRange,
): BlockClientRect | null {
  const blocks = getTopLevelBlocksInRange(view.state, range.from, range.to)
  if (blocks.length === 0) return null

  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  let left = Number.POSITIVE_INFINITY
  for (const block of blocks) {
    const rect = getInteractiveBlockClientRect(view, block.pos)
    if (!rect) continue
    top = Math.min(top, rect.top)
    right = Math.max(right, rect.left + rect.width)
    bottom = Math.max(bottom, rect.bottom)
    left = Math.min(left, rect.left)
  }
  if (![top, right, bottom, left].every(Number.isFinite)) return null
  return { top, bottom, left, width: right - left, height: bottom - top }
}

export function getTopLevelBlockAtPoint(
  view: EditorView,
  top: number,
  excludedRange?: BlockRange,
): TopLevelBlock | null {
  let closestBlock: TopLevelBlock | null = null
  let closestDistance = Number.POSITIVE_INFINITY
  let firstBlockTop = Number.POSITIVE_INFINITY
  let lastBlockBottom = Number.NEGATIVE_INFINITY

  for (const block of getControllableTopLevelBlocks(view.state)) {
    if (excludedRange && block.pos >= excludedRange.from && block.pos < excludedRange.to) continue
    if (isTrailingEmptyParagraph(view.state, block)) continue

    const rect = getInteractiveBlockClientRect(view, block.pos)
    if (!rect) continue
    firstBlockTop = Math.min(firstBlockTop, rect.top)
    lastBlockBottom = Math.max(lastBlockBottom, rect.bottom)
    if (top >= rect.top && top <= rect.bottom) return block

    const distance = top < rect.top ? rect.top - top : top - rect.bottom
    if (distance < closestDistance) {
      closestDistance = distance
      closestBlock = block
    }
  }
  return top < firstBlockTop || top > lastBlockBottom ? null : closestBlock
}

export function getInteractiveBlockClientRect(
  view: EditorView,
  pos: number,
): BlockClientRect | null {
  const element = getBlockElement(view, pos)
  if (!element) return null

  const rect = element.getBoundingClientRect()
  const adjacentBlocks = getAdjacentControllableBlocks(view.state, pos)
  const previousRect = adjacentBlocks.previous
    ? getRawBlockClientRect(view, adjacentBlocks.previous.pos)
    : null
  const nextRect = adjacentBlocks.next ? getRawBlockClientRect(view, adjacentBlocks.next.pos) : null
  const top = previousRect ? (previousRect.bottom + rect.top) * 0.5 : rect.top
  const bottom = nextRect ? (rect.bottom + nextRect.top) * 0.5 : rect.bottom
  return { top, bottom, left: rect.left, width: rect.width, height: bottom - top }
}

export function getBlockElement(view: EditorView, pos: number): HTMLElement | null {
  const nodeDom = view.nodeDOM(pos)
  if (nodeDom instanceof HTMLElement) {
    if (nodeDom.matches('[data-editor-block-pos]')) return nodeDom
    const decoratedAncestor = nodeDom.closest<HTMLElement>('[data-editor-block-pos]')
    if (decoratedAncestor) return decoratedAncestor
  }
  const element = view.dom.querySelector(`[data-editor-block-pos="${pos}"]`)
  return element instanceof HTMLElement ? element : null
}

function getRawBlockClientRect(view: EditorView, pos: number): DOMRect | null {
  return getBlockElement(view, pos)?.getBoundingClientRect() ?? null
}
