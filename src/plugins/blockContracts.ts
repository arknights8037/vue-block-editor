import type { Editor, JSONContent, Range } from '@tiptap/core'

export type BlockMenuIcon =
  | {
      kind: 'lucide'
      name:
        | 'code'
        | 'fileText'
        | 'heading1'
        | 'heading2'
        | 'heading3'
        | 'heading4'
        | 'image'
        | 'quote'
        | 'sigma'
        | 'table'
    }
  | {
      kind: 'glyph'
      value: string
    }

export interface BlockCommandContext {
  editor: Editor
  range?: Range
}

export interface RegisteredBlockType {
  id: string
  title: string
  aliases: string[]
  description: string
  slashIcon: string
  menuIcon: BlockMenuIcon
  slashCommand: (context: BlockCommandContext) => void
  transform?: (editor: Editor) => void
  contextInsert?: RegisteredBlockContextInsert
}

export type RegisteredBlockContextInsert =
  | {
      kind: 'content'
      content: () => JSONContent | JSONContent[]
    }
  | {
      kind: 'image-upload'
    }
  | {
      kind: 'file-upload'
    }


