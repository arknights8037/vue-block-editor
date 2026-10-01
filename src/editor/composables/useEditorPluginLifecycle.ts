import type { Editor } from '@tiptap/core'
import type { EditorPluginRegistry } from '@/plugins'
import { createPluginContext } from '@/plugins'
import type { EditorFeatureOptions } from '@/models/features'

export function useEditorPluginLifecycle(
  registry: () => EditorPluginRegistry,
  features: () => EditorFeatureOptions,
  emit: (event: string, payload?: unknown) => void,
) {
  let cleanups: Array<() => void> = []

  function setup(editor: Editor): void {
    cleanups = registry().plugins
      .map((plugin) => plugin.setup?.({
        ...createPluginContext(registry(), features()),
        editor,
        emit,
      }))
      .filter((cleanup): cleanup is () => void => typeof cleanup === 'function')
  }

  function dispose(): void {
    for (const cleanup of cleanups.splice(0)) cleanup()
  }

  return { setup, dispose }
}
