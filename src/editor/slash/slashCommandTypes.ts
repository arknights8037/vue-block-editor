import type { Editor, Range } from '@tiptap/core'

export interface SlashCommandContext {
  editor: Editor
  range: Range
}

export interface SlashCommandItem {
  id: string
  icon: string
  title: string
  aliases: string[]
  description: string
  group?: string
  command: (context: SlashCommandContext) => void
}
