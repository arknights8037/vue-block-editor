import type { Editor } from '@tiptap/core'
import type { Ref } from 'vue'

export function useEditorFormattingCommands(editor: Ref<Editor | null | undefined>) {
  const isActive = (name: string, attributes?: Record<string, unknown>): boolean =>
    editor.value?.isActive(name, attributes) ?? false

  const toggleBold = () => { editor.value?.chain().focus().toggleBold().run() }
  const toggleItalic = () => { editor.value?.chain().focus().toggleItalic().run() }
  const toggleStrike = () => { editor.value?.chain().focus().toggleStrike().run() }
  const toggleUnderline = () => { editor.value?.chain().focus().toggleUnderline().run() }
  const toggleInlineCode = () => { editor.value?.chain().focus().toggleCode().run() }
  const toggleSubscript = () => toggleMark('subscript')
  const toggleSuperscript = () => toggleMark('superscript')

  const toggleMark = (mark: string): void => {
    editor.value?.chain().focus().toggleMark(mark).run()
  }

  const setTextAlignment = (alignment: 'left' | 'center' | 'right'): void => {
    editor.value?.chain().focus().setTextAlign(alignment).run()
  }

  const isTextAligned = (alignment: 'left' | 'center' | 'right'): boolean =>
    editor.value?.isActive({ textAlign: alignment }) ?? false

  const setLink = (): void => {
    const activeEditor = editor.value
    if (!activeEditor) return
    const currentHref = String(activeEditor.getAttributes('link').href ?? '')
    const href = globalThis.prompt('输入链接地址', currentHref)
    if (href === null) {
      activeEditor.commands.focus()
      return
    }
    if (!href.trim()) {
      activeEditor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    activeEditor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run()
  }

  const undo = (): void => { editor.value?.chain().focus().undo().run() }
  const redo = (): void => { editor.value?.chain().focus().redo().run() }

  return {
    isActive, toggleBold, toggleItalic, toggleStrike, toggleUnderline,
    toggleInlineCode, toggleSubscript, toggleSuperscript, setTextAlignment,
    isTextAligned, setLink, undo, redo,
  }
}
