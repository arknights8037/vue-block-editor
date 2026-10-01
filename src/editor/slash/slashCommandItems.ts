import { SLASH_COMMAND_BLOCK_TYPES } from '../blockTypeRegistry'
import type { SlashCommandItem } from './slashCommandTypes'

export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = SLASH_COMMAND_BLOCK_TYPES.map((blockType) => ({
  id: blockType.id,
  icon: blockType.slashIcon,
  title: blockType.title,
  aliases: blockType.aliases,
  description: blockType.description,
  command: (context) => blockType.slashCommand(context),
}))
