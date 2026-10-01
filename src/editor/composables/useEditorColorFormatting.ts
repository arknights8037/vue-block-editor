import type { Editor } from '@tiptap/core'
import { ref, type Ref } from 'vue'

import { loadRecentColors, rememberRecentColor } from '../recentColors'

export const TEXT_COLOR_SWATCHES = [
  '#111827',
  '#dc2626',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
]

export const HIGHLIGHT_COLOR_SWATCHES = [
  '#fef08a',
  '#fde68a',
  '#fed7aa',
  '#fecaca',
  '#ddd6fe',
  '#bfdbfe',
  '#bbf7d0',
  '#a7f3d0',
]

const DEFAULT_TEXT_COLOR = '#333333'
const DEFAULT_HIGHLIGHT_COLOR = '#fef08a'
const RECENT_TEXT_COLORS_STORAGE_KEY = 'my-notebook:recent-text-colors'
const RECENT_HIGHLIGHT_COLORS_STORAGE_KEY = 'my-notebook:recent-highlight-colors'

export function useEditorColorFormatting(editor: Readonly<Ref<Editor | null | undefined>>) {
  const textColor = ref(DEFAULT_TEXT_COLOR)
  const highlightColor = ref(DEFAULT_HIGHLIGHT_COLOR)
  const recentTextColors = ref<string[]>(loadRecentColors(RECENT_TEXT_COLORS_STORAGE_KEY))
  const recentHighlightColors = ref<string[]>(loadRecentColors(RECENT_HIGHLIGHT_COLORS_STORAGE_KEY))
  const colorPopoverOpen = ref(false)
  const highlightPopoverOpen = ref(false)

  function setTextColor(color: string | null): void {
    const activeEditor = editor.value
    const nextColor = color?.trim()
    if (!activeEditor || !nextColor) return

    textColor.value = nextColor
    recentTextColors.value = rememberRecentColor(
      nextColor,
      recentTextColors.value,
      RECENT_TEXT_COLORS_STORAGE_KEY,
    )
    activeEditor.chain().focus().setColor(nextColor).run()
  }

  function previewTextColor(color: string | null): void {
    const activeEditor = editor.value
    const nextColor = color?.trim()
    if (!activeEditor || !nextColor) return

    textColor.value = nextColor
    activeEditor.chain().setColor(nextColor).run()
  }

  function setHighlightColor(color: string | null): void {
    const activeEditor = editor.value
    const nextColor = color?.trim()
    if (!activeEditor || !nextColor) return

    highlightColor.value = nextColor
    recentHighlightColors.value = rememberRecentColor(
      nextColor,
      recentHighlightColors.value,
      RECENT_HIGHLIGHT_COLORS_STORAGE_KEY,
    )
    activeEditor.chain().focus().setHighlight({ color: nextColor }).run()
  }

  function previewHighlightColor(color: string | null): void {
    const activeEditor = editor.value
    const nextColor = color?.trim()
    if (!activeEditor || !nextColor) return

    highlightColor.value = nextColor
    activeEditor.chain().setHighlight({ color: nextColor }).run()
  }

  function unsetTextColor(): void {
    const activeEditor = editor.value
    if (!activeEditor) return

    textColor.value = DEFAULT_TEXT_COLOR
    activeEditor.chain().focus().unsetColor().removeEmptyTextStyle().run()
  }

  function unsetHighlightColor(): void {
    const activeEditor = editor.value
    if (!activeEditor) return

    highlightColor.value = DEFAULT_HIGHLIGHT_COLOR
    activeEditor.chain().focus().unsetHighlight().run()
  }

  function syncTextColor(activeEditor: Editor): void {
    textColor.value = getCurrentTextColor(activeEditor) || DEFAULT_TEXT_COLOR
  }

  function syncHighlightColor(activeEditor: Editor): void {
    highlightColor.value = getCurrentHighlightColor(activeEditor) || DEFAULT_HIGHLIGHT_COLOR
  }

  function hasActiveTextColor(): boolean {
    return editor.value ? getCurrentTextColor(editor.value) !== '' : false
  }

  function hasActiveHighlight(): boolean {
    return editor.value ? editor.value.isActive('highlight') : false
  }

  return {
    textColor,
    highlightColor,
    recentTextColors,
    recentHighlightColors,
    colorPopoverOpen,
    highlightPopoverOpen,
    setTextColor,
    previewTextColor,
    setHighlightColor,
    previewHighlightColor,
    unsetTextColor,
    unsetHighlightColor,
    syncTextColor,
    syncHighlightColor,
    hasActiveTextColor,
    hasActiveHighlight,
  }
}

function getCurrentTextColor(editor: Editor): string {
  const attributes = editor.getAttributes('textStyle')
  return isRecord(attributes) && typeof attributes.color === 'string' ? attributes.color : ''
}

function getCurrentHighlightColor(editor: Editor): string {
  const attributes = editor.getAttributes('highlight')
  return isRecord(attributes) && typeof attributes.color === 'string' ? attributes.color : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
