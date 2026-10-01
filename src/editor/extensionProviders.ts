import type { Extensions } from '@tiptap/vue-3'

import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPluginRegistry } from '@/plugins/types'
import { createPluginContext, getPluginExtensions, isPluginEnabled } from '@/plugins/registry'
import { renderVueNodeView } from './vueNodeView'

export function resolvePluginExtensions(
  registry: EditorPluginRegistry | undefined,
  features: EditorFeatureOptions,
  readonly: boolean,
): Extensions {
  if (!registry) return []
  const context = createPluginContext(registry, features)
  const surface = readonly ? 'renderer' : 'editor'
  const extensions = getPluginExtensions(registry, context, surface)
  const nodes = registry.plugins
    .filter((plugin) => plugin.id !== 'core-blocks' && isPluginEnabled(plugin, surface))
    .flatMap((plugin) => plugin.blocks ?? [])
    .filter((block) => block.node)
    .map((block) => {
      const view = readonly ? block.readonlyView : block.editorView
      if (!view) return block.node!
      return block.node!.extend({
        addNodeView() {
          return renderVueNodeView(view)
        },
      })
    })
  return [...nodes, ...extensions]
}
