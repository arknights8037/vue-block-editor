import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

import { INDENT_ATTRIBUTE, normalizeIndentLevel } from './blockIndent'

export interface TopLevelBlock {
  node: ProseMirrorNode
  pos: number
}

export interface BlockRange {
  from: number
  to: number
}

export function getTopLevelBlockAtSelection(state: EditorState): TopLevelBlock | null {
  const selectionFrom = state.selection.from
  let offset = 0

  for (let index = 0; index < state.doc.childCount; index += 1) {
    const node = state.doc.child(index)
    const end = offset + node.nodeSize
    if (selectionFrom >= offset && selectionFrom <= end) return { node, pos: offset }
    offset = end
  }
  return null
}

export function getTopLevelBlocksInRange(
  state: EditorState,
  from: number,
  to: number,
): TopLevelBlock[] {
  const blocks: TopLevelBlock[] = []
  let offset = 0

  for (let index = 0; index < state.doc.childCount; index += 1) {
    const node = state.doc.child(index)
    const end = offset + node.nodeSize
    if (offset >= from && end <= to) blocks.push({ node, pos: offset })
    offset = end
  }
  return blocks
}

export function getSwapTargetBlock(
  state: EditorState,
  targetBlock: TopLevelBlock,
  sourceIndent: number,
): TopLevelBlock {
  let candidate = targetBlock
  let offset = 0

  for (let index = 0; index < state.doc.childCount; index += 1) {
    const node = state.doc.child(index)
    const nodeStart = offset
    const nodeEnd = nodeStart + node.nodeSize
    if (nodeStart > targetBlock.pos) break

    if (nodeStart <= targetBlock.pos && targetBlock.pos < nodeEnd) {
      if (getIndentLevel(node) <= sourceIndent) candidate = { node, pos: nodeStart }
      break
    }
    if (getIndentLevel(node) <= sourceIndent) candidate = { node, pos: nodeStart }
    offset = nodeEnd
  }
  return candidate
}

export function getControllableTopLevelBlocks(state: EditorState): TopLevelBlock[] {
  const blocks: TopLevelBlock[] = []
  let offset = 0
  for (let index = 0; index < state.doc.childCount; index += 1) {
    const node = state.doc.child(index)
    if (isControllableBlock(node)) blocks.push({ node, pos: offset })
    offset += node.nodeSize
  }
  return blocks
}

export function getMovableBlockRange(state: EditorState, sourcePos: number): BlockRange {
  const sourceNode = state.doc.nodeAt(sourcePos)
  if (!sourceNode) return { from: sourcePos, to: sourcePos }

  const sourceIndent = getIndentLevel(sourceNode)
  let rangeEnd = sourcePos + sourceNode.nodeSize
  let offset = 0
  let foundSource = false

  for (let index = 0; index < state.doc.childCount; index += 1) {
    const node = state.doc.child(index)
    const nodeStart = offset
    const nodeEnd = nodeStart + node.nodeSize
    if (nodeStart === sourcePos) {
      foundSource = true
      rangeEnd = nodeEnd
      offset = nodeEnd
      continue
    }
    if (foundSource) {
      if (getIndentLevel(node) <= sourceIndent) break
      rangeEnd = nodeEnd
    }
    offset = nodeEnd
  }
  return { from: sourcePos, to: rangeEnd }
}

export function getAdjacentControllableBlocks(
  state: EditorState,
  pos: number,
): { previous: TopLevelBlock | null; next: TopLevelBlock | null } {
  const blocks = getControllableTopLevelBlocks(state)
  const index = blocks.findIndex((block) => block.pos === pos)
  return {
    previous: index > 0 ? blocks[index - 1] : null,
    next: index >= 0 && index < blocks.length - 1 ? blocks[index + 1] : null,
  }
}

export function countTrailingEmptyParagraphs(state: EditorState): number {
  let count = 0
  for (let index = state.doc.childCount - 1; index >= 0; index -= 1) {
    if (!isEmptyParagraph(state.doc.child(index))) break
    count += 1
  }
  return count
}

export function isTrailingEmptyParagraph(state: EditorState, block: TopLevelBlock): boolean {
  return block.pos + block.node.nodeSize === state.doc.content.size && isEmptyParagraph(block.node)
}

export function isEmptyParagraph(node: ProseMirrorNode): boolean {
  return node.type.name === 'paragraph' && node.textContent.trim() === ''
}

export function isControllableBlock(node: ProseMirrorNode): boolean {
  return node.type.isBlock && node.type.name !== 'listItem' && node.type.name !== 'taskItem'
}

export function getIndentLevel(node: ProseMirrorNode): number {
  return normalizeIndentLevel(node.attrs[INDENT_ATTRIBUTE])
}
