import type { Editor } from '@tiptap/core'
import type { Ref } from 'vue'

export interface BubbleMenuShouldShowProps {
  editor: Editor
  from: number
  to: number
}

export function useEditorBubbleMenu(
  readonly: () => boolean,
  colorPopoverOpen: Ref<boolean>,
  highlightPopoverOpen: Ref<boolean>,
) {
  function shouldShowBubbleMenu({ editor, from, to }: BubbleMenuShouldShowProps): boolean {
    if (
      readonly() ||
      !editor.isEditable ||
      editor.isActive('codeBlock') ||
      isRangeInsideCodeBlock(editor, from, to)
    ) {
      return false
    }

    if (colorPopoverOpen.value || highlightPopoverOpen.value) return true
    return from !== to
  }

  function getBubbleMenuContainer(): HTMLElement {
    return globalThis.document.body
  }

  return { shouldShowBubbleMenu, getBubbleMenuContainer }
}

function isRangeInsideCodeBlock(editor: Editor, from: number, to: number): boolean {
  return isPositionInsideNode(editor, from, 'codeBlock') ||
    isPositionInsideNode(editor, Math.max(from, to - 1), 'codeBlock')
}

function isPositionInsideNode(editor: Editor, position: number, nodeName: string): boolean {
  const resolved = editor.state.doc.resolve(
    Math.max(0, Math.min(position, editor.state.doc.content.size)),
  )
  for (let depth = resolved.depth; depth >= 0; depth -= 1) {
    if (resolved.node(depth).type.name === nodeName) return true
  }
  return false
}
