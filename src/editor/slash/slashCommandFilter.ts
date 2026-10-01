import { getBlockTypes } from '../blockTypeRegistry'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPluginRegistry } from '@/plugins/types'
import { SLASH_COMMAND_ITEMS } from './slashCommandItems'
import type { SlashCommandItem } from './slashCommandTypes'

export function filterSlashCommandItems(query: string, features?: EditorFeatureOptions, registry?: EditorPluginRegistry): SlashCommandItem[] {
  const registered = getBlockTypes(features, registry)
  const availableIds = new Set(registered.map((blockType) => blockType.id))
  const registeredItems = new Map(registered.map((blockType) => [blockType.id, {
    id: blockType.id,
    icon: blockType.slashIcon,
    title: blockType.title,
    aliases: blockType.aliases,
    description: blockType.description,
    command: blockType.slashCommand,
  }]))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const items = registry ? [...registeredItems.values()] : SLASH_COMMAND_ITEMS
  return items.filter((item) => {
    if (!availableIds.has(item.id)) return false
    if (!normalizedQuery) return true
    return [item.title, item.description, ...item.aliases]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  })
}
