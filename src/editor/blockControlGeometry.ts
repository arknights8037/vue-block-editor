import type { EditorView } from '@tiptap/pm/view'
import type { BlockRange } from './blockRanges'
import { getBlockElement } from './blockGeometry'
import { getTopLevelBlocksInRange } from './blockRanges'

const BLOCK_CONTROL_GUTTER_LEFT = 44
const BLOCK_CONTROL_HANDLE_WIDTH = 24

export function getHandleTopOffset(blockElement: HTMLElement): number {
  return Math.max(blockElement.getBoundingClientRect().height * 0.5 - 14, 0)
}

export function getHandleLeftOffset(): number {
  return Math.max((BLOCK_CONTROL_GUTTER_LEFT - BLOCK_CONTROL_HANDLE_WIDTH) * 0.5, 0)
}

export function getBlockRangeDomElements(view: EditorView, range: BlockRange): HTMLElement[] {
  return getTopLevelBlocksInRange(view.state, range.from, range.to)
    .map((block) => getBlockElement(view, block.pos))
    .filter((element): element is HTMLElement => element !== null)
}
