import { createBuiltinBlockDefinitions } from '@/editor/blockTypeRegistry'
import { Node } from '@tiptap/core'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Heading } from '@tiptap/extension-heading'
import { Blockquote } from '@tiptap/extension-blockquote'
import { BulletList, OrderedList, TaskList } from '@tiptap/extension-list'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { CodeBlock } from '@tiptap/extension-code-block'
import { AttachmentBlock } from '@/editor/attachmentBlock'
import { CardBlock } from '@/editor/cardBlock'
import { CollapsibleBlock } from '@/editor/collapsibleBlock'
import { ImageFigure } from '@/editor/imageFigure'
import { MathBlock, TableBlock } from '@/editor/structuredBlocks'
import type { EditorPlugin } from './types'

const BUILTIN_NODES: Record<string, Node> = {
  paragraph: Paragraph,
  'bullet-list': BulletList,
  'ordered-list': OrderedList,
  'task-list': TaskList,
  blockquote: Blockquote,
  'code-block': CodeBlock,
  'horizontal-rule': HorizontalRule,
  image: ImageFigure,
  attachment: AttachmentBlock,
  table: TableBlock,
  'math-block': MathBlock,
  card: CardBlock,
  'collapsible-list': CollapsibleBlock,
}

/** Metadata plugin for the built-in block command registry. Node extensions remain in the core factory. */
export const builtinEditorPlugins: readonly EditorPlugin[] = [
  {
    id: 'core-blocks',
    version: 1,
    blocks: createBuiltinBlockDefinitions({ ...BUILTIN_NODES, heading: Heading }),
  },
]
