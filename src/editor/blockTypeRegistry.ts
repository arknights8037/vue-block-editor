import type { Editor, JSONContent, Range, Node as TiptapNode } from '@tiptap/core'

import {
  getCollapsibleHeadingTitle,
  HEADING_LEVEL_LABELS,
  HEADING_LEVELS,
  type HeadingLevel,
} from './headingLevels'
import { isFeatureDisabled, type EditorFeatureOptions } from '@/models/features'
import type { EditorBlockDefinition, EditorPluginRegistry } from '@/plugins/types'
import { toRegisteredBlockType } from './blockDefinitionAdapter'

import type { BlockCommandContext, RegisteredBlockType } from '@/plugins/blockContracts'
export type { BlockMenuIcon, BlockCommandContext, RegisteredBlockType, RegisteredBlockContextInsert } from '@/plugins/blockContracts'

export const BLOCK_TYPE_REGISTRY: RegisteredBlockType[] = [
  {
    id: 'paragraph',
    slashIcon: 'T',
    menuIcon: { kind: 'lucide', name: 'fileText' },
    title: '正文',
    aliases: ['text', 'paragraph', 'p', 'duanluo', 'wenben', '正文', '段落', '文本'],
    description: '普通文本块',
    transform: (editor) => {
      editor.chain().focus().setParagraph().run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).setParagraph().run()
    },
  },
  ...HEADING_LEVELS.map(createHeadingBlockType),
  {
    id: 'bullet-list',
    slashIcon: '•',
    menuIcon: { kind: 'glyph', value: '•' },
    title: '无序列表',
    aliases: ['ul', 'bullet', 'list', 'wuxu', 'liebiao', '无序列表', '列表'],
    description: '项目符号列表',
    transform: (editor) => {
      editor.chain().focus().toggleBulletList().run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).toggleBulletList().run()
    },
  },
  {
    id: 'ordered-list',
    slashIcon: '1.',
    menuIcon: { kind: 'glyph', value: '1.' },
    title: '有序列表',
    aliases: ['ol', 'number', 'list', 'youxu', 'liebiao', '有序列表', '编号'],
    description: '数字编号列表',
    transform: (editor) => {
      editor.chain().focus().toggleOrderedList().run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).toggleOrderedList().run()
    },
  },
  {
    id: 'task-list',
    slashIcon: '☑',
    menuIcon: { kind: 'glyph', value: '☑' },
    title: '代办列表',
    aliases: ['todo', 'task', 'checklist', 'daiban', 'renwu', '代办', '任务', '清单'],
    description: '带复选框的任务列表',
    transform: (editor) => {
      editor.chain().focus().toggleTaskList().run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).toggleTaskList().run()
    },
    contextInsert: {
      kind: 'content',
      content: () => ({
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph' }] },
        ],
      }),
    },
  },
  ...HEADING_LEVELS.map(createCollapsibleHeadingBlockType),
  {
    id: 'collapsible-list',
    slashIcon: '▾',
    menuIcon: { kind: 'glyph', value: '▾' },
    title: '可折叠列表',
    aliases: ['toggle', 'collapse', 'list', 'zhedie', 'liebiao', '折叠', '可折叠列表', '折叠列表'],
    description: '列表内容可以展开或收起',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [createCollapsibleListBlock(), { type: 'paragraph' }])
    },
    contextInsert: {
      kind: 'content',
      content: createCollapsibleListBlock,
    },
  },
  {
    id: 'card',
    slashIcon: '▣',
    menuIcon: { kind: 'glyph', value: '▣' },
    title: '卡片',
    aliases: ['card', 'callout', '提示', '卡片', '信息块'],
    description: '可包含格式化内容的提示卡片',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [
        { type: 'cardBlock', content: [{ type: 'paragraph' }] },
        { type: 'paragraph' },
      ])
    },
    contextInsert: {
      kind: 'content',
      content: () => ({ type: 'cardBlock', content: [{ type: 'paragraph' }] }),
    },
  },
  {
    id: 'blockquote',
    slashIcon: '“',
    menuIcon: { kind: 'lucide', name: 'quote' },
    title: '引用',
    aliases: ['quote', 'blockquote', 'yinyong', '引用'],
    description: '引用块',
    transform: (editor) => {
      editor.chain().focus().setBlockquote().run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).setBlockquote().run()
    },
  },
  {
    id: 'code-block',
    slashIcon: '</>',
    menuIcon: { kind: 'lucide', name: 'code' },
    title: '代码块',
    aliases: ['code', 'pre', 'daima', '代码', '代码块'],
    description: '多行代码',
    transform: (editor) => {
      editor.chain().focus().setCodeBlock({ language: 'plaintext' }).run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).setCodeBlock({ language: 'plaintext' }).run()
    },
  },
  {
    id: 'horizontal-rule',
    slashIcon: '—',
    menuIcon: { kind: 'glyph', value: '—' },
    title: '分割线',
    aliases: ['hr', 'divider', 'line', 'fengexian', '分割线', '横线'],
    description: '水平分割线',
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).setHorizontalRule().run()
    },
    contextInsert: {
      kind: 'content',
      content: () => ({ type: 'horizontalRule' }),
    },
  },
  {
    id: 'image',
    slashIcon: '▧',
    menuIcon: { kind: 'lucide', name: 'image' },
    title: '图片',
    aliases: ['image', 'picture', 'photo', 'tupian', '图片', '照片', '插图'],
    description: '插入图片并添加题注',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [{ type: 'imageFigure' }, { type: 'paragraph' }])
    },
    contextInsert: {
      kind: 'image-upload',
    },
  },
  {
    id: 'attachment',
    slashIcon: '📎',
    menuIcon: { kind: 'glyph', value: '📎' },
    title: '附件',
    aliases: ['file', 'attachment', 'asset', 'fujian', 'wenjian', '附件', '文件', '资料'],
    description: '插入 PDF、文档、压缩包等资料文件',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [{ type: 'attachmentBlock' }, { type: 'paragraph' }])
    },
    contextInsert: {
      kind: 'file-upload',
    },
  },
  {
    id: 'table',
    slashIcon: '▦',
    menuIcon: { kind: 'lucide', name: 'table' },
    title: '表格',
    aliases: ['table', 'biaoge', '表格'],
    description: '插入可编辑表格块',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [{ type: 'tableBlock' }, { type: 'paragraph' }])
    },
    contextInsert: {
      kind: 'content',
      content: () => ({ type: 'tableBlock' }),
    },
  },
  {
    id: 'math-block',
    slashIcon: 'Σ',
    menuIcon: { kind: 'lucide', name: 'sigma' },
    title: '数学公式',
    aliases: ['math', 'formula', 'latex', 'gongshi', 'shuxue', '公式', '数学公式'],
    description: '插入 LaTeX 公式块',
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [{ type: 'mathBlock' }, { type: 'paragraph' }])
    },
    contextInsert: {
      kind: 'content',
      content: () => ({ type: 'mathBlock' }),
    },
  },
]

export const TRANSFORM_BLOCK_TYPES = BLOCK_TYPE_REGISTRY.filter((blockType) => blockType.transform)

export const CONTEXT_INSERT_BLOCK_TYPES = BLOCK_TYPE_REGISTRY.filter(
  (blockType) => blockType.contextInsert,
)

export const SLASH_COMMAND_BLOCK_TYPES = BLOCK_TYPE_REGISTRY

export function createBuiltinBlockDefinitions(
  nodes: Readonly<Record<string, TiptapNode>>,
): EditorBlockDefinition[] {
  return BLOCK_TYPE_REGISTRY.map((block) => ({
    id: block.id,
    title: block.title,
    aliases: block.aliases,
    description: block.description,
    slashIcon: block.slashIcon,
    menuIcon: block.menuIcon,
    node: nodes[block.id] ?? (
      block.id.startsWith('heading-') || block.id.startsWith('collapsible-heading-')
        ? nodes.heading
        : undefined
    ),
    slash: { command: block.slashCommand },
    transform: block.transform,
    contextInsert: block.contextInsert,
  }))
}

export function getBlockTypes(
  features?: EditorFeatureOptions,
  registry?: EditorPluginRegistry,
): RegisteredBlockType[] {
  const builtins = BLOCK_TYPE_REGISTRY.filter((blockType) => !isFeatureDisabled(blockType.id, features))
  if (!registry) return builtins
  const customIds = new Set(BLOCK_TYPE_REGISTRY.map((blockType) => blockType.id))
  const custom = registry.blocks
    .filter((block) => !customIds.has(block.id) && !isFeatureDisabled(block.id, features))
    .map(toRegisteredBlockType)
  return [...builtins, ...custom]
}

export function getTransformBlockTypes(features?: EditorFeatureOptions, registry?: EditorPluginRegistry): RegisteredBlockType[] {
  return getBlockTypes(features, registry).filter((blockType) => blockType.transform)
}

export function getContextInsertBlockTypes(features?: EditorFeatureOptions, registry?: EditorPluginRegistry): RegisteredBlockType[] {
  return getBlockTypes(features, registry).filter((blockType) => blockType.contextInsert)
}

export function getContextInsertContent(
  blockType: RegisteredBlockType,
): JSONContent | JSONContent[] | null {
  return blockType.contextInsert?.kind === 'content' ? blockType.contextInsert.content() : null
}

function withOptionalDeletedRange(editor: Editor, range?: Range) {
  const chain = editor.chain().focus()
  return range ? chain.deleteRange(range) : chain
}

function insertSlashContent(
  editor: Editor,
  range: Range | undefined,
  content: JSONContent[],
): void {
  withOptionalDeletedRange(editor, range).insertContent(content).run()
}

function createHeadingBlockType(level: HeadingLevel): RegisteredBlockType {
  const label = HEADING_LEVEL_LABELS[level]

  return {
    id: `heading-${level}`,
    slashIcon: `H${level}`,
    menuIcon: { kind: 'lucide', name: `heading${level}` },
    title: `${label}级标题`,
    aliases: [`h${level}`, 'title', 'biaoti', `${label}级标题`, `标题${level}`],
    description: `${label}级标题`,
    transform: (editor) => {
      editor.chain().focus().setHeading({ level }).run()
    },
    slashCommand: ({ editor, range }) => {
      withOptionalDeletedRange(editor, range).setHeading({ level }).run()
    },
  }
}

function createCollapsibleHeadingBlockType(level: HeadingLevel): RegisteredBlockType {
  const title = getCollapsibleHeadingTitle(level)

  return {
    id: `collapsible-heading-${level}`,
    slashIcon: `▸H${level}`,
    menuIcon: { kind: 'glyph', value: `▸${level}` },
    title,
    aliases: [
      `toggle-h${level}`,
      `collapse-h${level}`,
      'zhedie',
      'biaoti',
      '折叠',
      '可折叠标题',
      '折叠标题',
      title,
      `折叠标题${level}`,
    ],
    description: `${HEADING_LEVEL_LABELS[level]}级标题，下方内容可以展开或收起`,
    slashCommand: ({ editor, range }) => {
      insertSlashContent(editor, range, [
        createCollapsibleHeadingBlock(level),
        { type: 'paragraph' },
      ])
    },
    contextInsert: {
      kind: 'content',
      content: () => createCollapsibleHeadingBlock(level),
    },
  }
}

function createCollapsibleHeadingBlock(level: HeadingLevel): JSONContent {
  return {
    type: 'collapsibleBlock',
    attrs: {
      variant: 'heading',
      headingLevel: level,
      title: getCollapsibleHeadingTitle(level),
      collapsed: false,
    },
    content: [{ type: 'paragraph' }],
  }
}

function createCollapsibleListBlock(): JSONContent {
  return {
    type: 'collapsibleBlock',
    attrs: { variant: 'list', title: '可折叠列表', collapsed: false },
    content: [
      {
        type: 'bulletList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
      },
    ],
  }
}

