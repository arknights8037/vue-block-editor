import { NodeSelection, PluginKey, TextSelection } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export interface BlockControlsFocusMeta {
  isFocused: boolean
}

export function isBlockControlsFocusMeta(value: unknown): value is BlockControlsFocusMeta {
  return (
    typeof value === 'object' &&
    value !== null &&
    'isFocused' in value &&
    typeof (value as BlockControlsFocusMeta).isFocused === 'boolean'
  )
}

export function setBlockControlsFocused(
  view: EditorView,
  pluginKey: PluginKey<any>,
  isFocused: boolean,
): void {
  const pluginState = pluginKey.getState(view.state) as { isFocused?: boolean } | undefined
  if (pluginState?.isFocused === isFocused) return

  view.dispatch(
    view.state.tr.setMeta(pluginKey, { isFocused }).setMeta('addToHistory', false),
  )
}

export function isEditorInteractionTarget(view: EditorView, target: Node): boolean {
  if (view.dom.contains(target)) return true

  const element = target instanceof globalThis.Element ? target : (target.parentElement ?? null)
  if (!element) return false

  return Boolean(
    element.closest(
      [
        '.block-control-handle',
        '.block-transform-menu',
        '.bubble-menu-layer',
        '.bubble-color-panel',
        '.editor-context-menu',
      ].join(','),
    ),
  )
}

export function blurEditorCompletely(view: EditorView, pluginKey: PluginKey<any>): void {
  let transaction = view.state.tr
  const { selection } = view.state

  if (!selection.empty || selection instanceof NodeSelection) {
    const position = Math.max(0, Math.min(selection.to, view.state.doc.content.size))
    transaction = transaction.setSelection(TextSelection.near(view.state.doc.resolve(position), 1))
  }

  transaction = transaction
    .setMeta(pluginKey, { isFocused: false })
    .setMeta('addToHistory', false)

  if (transaction.docChanged || transaction.selectionSet || transaction.getMeta(pluginKey)) {
    view.dispatch(transaction)
  }

  view.dom.blur()
  globalThis.getSelection()?.removeAllRanges()
}
