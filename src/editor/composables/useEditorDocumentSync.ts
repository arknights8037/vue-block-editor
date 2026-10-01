import type { Editor } from '@tiptap/core'
import { nextTick, watch, type Ref } from 'vue'
import type { TiptapDocumentJson } from '@/models/document'
import { ensureTopLevelBlockIds } from '@/document/blockId'
import { isSameEditorContent, normalizeEditorContent } from '@/document/documentContent'

export function useEditorDocumentSync(
  editor: Ref<Editor | undefined>,
  options: {
    readonly: () => boolean
    spellcheck: () => boolean
    content: () => TiptapDocumentJson | undefined
    scheduleJumpAidSync: () => void
  },
): void {
  watch(options.readonly, (readonly) => editor.value?.setEditable(!readonly, false))
  watch(options.spellcheck, (spellcheck) => {
    editor.value?.view.dom.setAttribute('spellcheck', spellcheck ? 'true' : 'false')
  })
  watch(options.content, (nextContent) => {
    if (!editor.value || !nextContent) return
    const currentContent = editor.value.getJSON() as TiptapDocumentJson
    const contentWithBlockIds = ensureTopLevelBlockIds(normalizeEditorContent(nextContent))
    if (isSameEditorContent(currentContent, contentWithBlockIds)) return
    editor.value.commands.setContent(contentWithBlockIds, {
      emitUpdate: false,
      errorOnInvalidContent: true,
    })
    void nextTick(options.scheduleJumpAidSync)
  })
}


