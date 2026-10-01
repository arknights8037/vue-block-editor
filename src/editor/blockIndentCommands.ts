import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'

import { INDENT_ATTRIBUTE, normalizeIndentLevel } from './blockIndent'
import {
  getIndentLevel,
  getTopLevelBlockAtSelection,
  isControllableBlock,
  type TopLevelBlock,
} from './blockRanges'

export function indentSelectedBlock(editor: Editor, delta: 1 | -1): boolean {
  if (!editor.isEditable || editor.isActive('codeBlock')) return false

  const activeBlock = getTopLevelBlockAtSelection(editor.state)
  if (!activeBlock || !isControllableBlock(activeBlock.node)) return false

  const currentIndent = getIndentLevel(activeBlock.node)
  const nextIndent = normalizeIndentLevel(currentIndent + delta)
  if (nextIndent === currentIndent) return true

  editor
    .chain()
    .focus()
    .setNodeSelection(activeBlock.pos)
    .updateAttributes(activeBlock.node.type.name, { [INDENT_ATTRIBUTE]: nextIndent })
    .run()

  focusInsideBlock(editor, activeBlock.pos)
  return true
}

export function outdentIndentedBlockOnBackspace(editor: Editor): boolean {
  if (!editor.isEditable || editor.isActive('codeBlock')) return false

  const { selection } = editor.state
  if (!selection.empty || !(selection instanceof TextSelection)) return false

  const activeBlock = getTopLevelBlockAtSelection(editor.state)
  if (!activeBlock || !isControllableBlock(activeBlock.node)) return false

  const currentIndent = getIndentLevel(activeBlock.node)
  if (currentIndent === 0 || !isCursorAtStartOfBlock(activeBlock, selection.from)) return false

  const nextIndent = activeBlock.node.textContent.trim() === '' ? 0 : currentIndent - 1
  editor
    .chain()
    .focus()
    .setNodeSelection(activeBlock.pos)
    .updateAttributes(activeBlock.node.type.name, { [INDENT_ATTRIBUTE]: nextIndent })
    .run()

  focusInsideBlock(editor, activeBlock.pos)
  return true
}

export function selectBlock(editor: Editor, pos: number): void {
  const node = editor.state.doc.nodeAt(pos)
  if (!node) return
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)))
  editor.view.focus()
}

export function focusInsideBlock(editor: Editor, pos: number): void {
  const node = editor.state.doc.nodeAt(pos)
  if (!node) return
  const textPosition = Math.min(pos + 1, editor.state.doc.content.size)
  editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, textPosition)))
  editor.view.focus()
}

function isCursorAtStartOfBlock(block: TopLevelBlock, cursorPosition: number): boolean {
  const offsetInsideBlock = cursorPosition - block.pos - 1
  if (offsetInsideBlock < 0) return false
  return block.node.textBetween(0, offsetInsideBlock, '\n', '\n').length === 0
}

