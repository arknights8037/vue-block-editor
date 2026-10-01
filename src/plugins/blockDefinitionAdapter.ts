import type { Range, Editor } from '@tiptap/core'
import type { EditorBlockDefinition } from '@/plugins/types'
import type { BlockMenuIcon, RegisteredBlockContextInsert, RegisteredBlockType } from './blockContracts'

export function toRegisteredBlockType(block: EditorBlockDefinition): RegisteredBlockType {
  return {
    id: block.id,
    title: block.title,
    aliases: [...(block.aliases ?? [])],
    description: block.description ?? block.title,
    slashIcon: block.slashIcon ?? '□',
    menuIcon: block.menuIcon ?? { kind: 'glyph', value: block.slashIcon ?? '□' },
    slashCommand: block.slash?.command ?? (({ editor, range }: { editor: Editor; range?: Range }) => {
      const chain = editor.chain().focus()
      if (range) chain.deleteRange(range)
      if (block.node) chain.insertContent({ type: block.node.name }).run()
    }),
    transform: block.transform,
    contextInsert: block.contextInsert,
  }
}

export type { BlockMenuIcon, RegisteredBlockContextInsert, RegisteredBlockType }

