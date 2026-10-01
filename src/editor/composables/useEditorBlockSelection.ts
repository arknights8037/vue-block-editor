import type { Editor, JSONContent } from '@tiptap/core'
import type { Ref } from 'vue'
import type { SelectedBlock } from '@/models/agent'
import { getNodePlainText, preserveReplacedBlockIds } from '@/editor/agentBlockPatch'
import { parseMarkdownDocument } from '@/editor/markdownImport'

export interface EditorBlockSnapshot extends SelectedBlock {
  from: number
  to: number
  json: JSONContent
}

export function useEditorBlockSelection(editor: Ref<Editor | undefined>) {
  function getCurrentDocumentBlocks(): EditorBlockSnapshot[] {
    const activeEditor = editor.value
    if (!activeEditor) return []
    const blocks: EditorBlockSnapshot[] = []
    activeEditor.state.doc.forEach((node, offset, index) => {
      const id = typeof node.attrs?.id === 'string' ? node.attrs.id : ''
      if (!id) return
      blocks.push({ id, type: node.type.name, text: getNodePlainText(node.toJSON()).trim(), index, from: offset, to: offset + node.nodeSize, json: node.toJSON() })
    })
    return blocks
  }

  function getSelectedBlocks(): EditorBlockSnapshot[] {
    const activeEditor = editor.value
    if (!activeEditor) return []
    const { from, to, empty } = activeEditor.state.selection
    const blocks = getCurrentDocumentBlocks()
    if (empty) return blocks.filter((block) => from >= block.from && from <= block.to).slice(0, 1)
    return blocks.filter((block) => block.to >= from && block.from <= to)
  }

  function replaceBlocksWithMarkdown(blockIds: string[], markdown: string): boolean {
    const activeEditor = editor.value
    if (!activeEditor || !activeEditor.isEditable || blockIds.length === 0 || !markdown.trim()) return false
    const targetIds = new Set(blockIds)
    const targetBlocks = getCurrentDocumentBlocks().filter((block) => targetIds.has(block.id))
    if (targetBlocks.length !== targetIds.size || targetIds.size !== blockIds.length) return false
    const orderedTargets = [...targetBlocks].sort((left, right) => left.index - right.index)
    if (orderedTargets.some((block, index) => index > 0 && block.index !== orderedTargets[index - 1].index + 1)) return false
    const content = parseMarkdownDocument(markdown, 'AI 输出').content.content ?? [{ type: 'paragraph' }]
    preserveReplacedBlockIds(content, orderedTargets.map((block) => block.id))
    return activeEditor.chain().focus().insertContentAt({ from: orderedTargets[0].from, to: orderedTargets[orderedTargets.length - 1].to }, content).run()
  }

  return { getCurrentDocumentBlocks, getSelectedBlocks, replaceBlocksWithMarkdown }
}
