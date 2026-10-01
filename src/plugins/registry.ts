import type { EditorFeatureOptions } from '@/models/features'
import type { Extension } from '@tiptap/core'
import { isFeatureDisabled } from '@/models/features'
import type { RegisteredBlockType } from './blockContracts'
import type { EditorPlugin, EditorPluginContext, EditorPluginRegistry, ExtensionFactory } from './types'
import { builtinEditorPlugins } from './builtins'
import { toRegisteredBlockType } from './blockDefinitionAdapter'

export const PLUGIN_API_VERSION = 1 as const

export function createEditorPluginRegistry(
  plugins: readonly EditorPlugin[] = [],
): EditorPluginRegistry {
  const configuredPlugins = plugins.some((plugin) => plugin.id === 'core-blocks')
    ? [...plugins]
    : [...builtinEditorPlugins, ...plugins]
  const pluginIds = new Set<string>()
  const blockIds = new Set<string>()
  const nodeNames = new Set<string>()
  const markIds = new Set<string>()
  const blocks = [] as import('./types').EditorBlockDefinition[]
  const marks = [] as import('./types').EditorMarkDefinition[]
  const blockOwners = new Map<string, EditorPlugin>()
  const blocksByNodeName = new Map<string, import('./types').EditorBlockDefinition>()

  for (const plugin of configuredPlugins) {
    if (!plugin || plugin.version !== PLUGIN_API_VERSION || !plugin.id?.trim()) {
      throw new Error(`Invalid editor plugin: expected id and version ${PLUGIN_API_VERSION}`)
    }
    if (pluginIds.has(plugin.id)) throw new Error(`Duplicate editor plugin id: ${plugin.id}`)
    pluginIds.add(plugin.id)
    const pluginAliases = new Set<string>()

    for (const block of plugin.blocks ?? []) {
      if (!block.id?.trim() || !block.title?.trim()) throw new Error(`Invalid block in plugin ${plugin.id}`)
      if (plugin.id !== 'core-blocks' && !block.node) {
        throw new Error(`Block ${block.id} in plugin ${plugin.id} must declare a Tiptap node`)
      }
      if (blockIds.has(block.id)) throw new Error(`Duplicate editor block id: ${block.id}`)
      if (block.node && nodeNames.has(block.node.name) && plugin.id !== 'core-blocks') throw new Error(`Duplicate editor node name: ${block.node.name}`)
      if (block.node && !nodeNames.has(block.node.name)) nodeNames.add(block.node.name)
      blockIds.add(block.id)
      if (plugin.id !== 'core-blocks') {
        for (const alias of block.aliases ?? []) {
          const normalized = alias.replace(/[-_\s]/g, '').toLowerCase()
          if (normalized && pluginAliases.has(normalized)) {
            throw new Error(`Duplicate slash alias in plugin ${plugin.id}: ${alias}`)
          }
          pluginAliases.add(normalized)
        }
      }
      const normalizedBlock = block.slash?.command && !block.slashIcon
        ? { ...block, slashIcon: '□' }
        : block
      blocks.push(normalizedBlock)
      blockOwners.set(normalizedBlock.id, plugin)
      if (normalizedBlock.node) blocksByNodeName.set(normalizedBlock.node.name, normalizedBlock)
    }
    for (const mark of plugin.marks ?? []) {
      if (markIds.has(mark.id)) throw new Error(`Duplicate editor mark id: ${mark.id}`)
      markIds.add(mark.id)
      if (nodeNames.has(mark.mark.name)) throw new Error(`Duplicate editor node or mark name: ${mark.mark.name}`)
      nodeNames.add(mark.mark.name)
      marks.push(mark)
    }
  }

  const blockMap = new Map(blocks.map((block) => [block.id, block]))
  return {
    plugins: configuredPlugins,
    blocks,
    marks,
    getBlock: (id) => blockMap.get(id),
    getBlockOwner: (id) => blockOwners.get(id),
    getBlockByNodeName: (name) => blocksByNodeName.get(name),
    hasBlock: (id) => blockMap.has(id),
  }
}

export function createPluginContext(
  registry: EditorPluginRegistry,
  features: EditorFeatureOptions,
): EditorPluginContext {
  return { registry, features }
}

export function getPluginExtensions(
  registry: EditorPluginRegistry,
  context: EditorPluginContext,
  surface: 'editor' | 'renderer' = 'editor',
): Extension[] {
  return registry.plugins.flatMap((plugin) => {
    if (!isPluginEnabled(plugin, surface)) return []
    return (plugin.extensions ?? []).flatMap((factory: ExtensionFactory) =>
      typeof factory === 'function' ? factory(context) : factory,
    )
  })
}

export function isPluginEnabled(
  plugin: EditorPlugin,
  surface: 'editor' | 'renderer' | 'import' | 'export',
): boolean {
  return plugin.capabilities?.[surface] !== false
}

export function getPluginBlockTypes(
  registry: EditorPluginRegistry,
  features?: EditorFeatureOptions,
): RegisteredBlockType[] {
  return registry.blocks
    .filter((block) => !isFeatureDisabled(block.id, features))
    .map(toRegisteredBlockType)
}

