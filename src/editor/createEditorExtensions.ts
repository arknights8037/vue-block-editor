import { Blockquote } from '@tiptap/extension-blockquote'
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { Color } from '@tiptap/extension-color'
import { Heading } from '@tiptap/extension-heading'
import { Highlight } from '@tiptap/extension-highlight'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TaskItem } from '@tiptap/extension-task-item'
import { TaskList } from '@tiptap/extension-task-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import { UniqueID } from '@tiptap/extension-unique-id'
import { StarterKit } from '@tiptap/starter-kit'
import type { Extensions } from '@tiptap/vue-3'
import { createLowlight } from 'lowlight'

import { BLOCK_ID_ATTRIBUTE, BLOCK_ID_NODE_TYPES, generateBlockId } from './blockId'
import { AttachmentBlock } from './attachmentBlock'
import { BlockControls } from './blockControls'
import { CardBlock } from './cardBlock'
import BlockContainerNodeView from './BlockContainerNodeView.vue'
import CodeBlockNodeView from './CodeBlockNodeView.vue'
import { CollapsibleBlock } from './collapsibleBlock'
import HorizontalRuleNodeView from './HorizontalRuleNodeView.vue'
import { HEADING_LEVELS } from './headingLevels'
import { ImageFigure } from './imageFigure'
import { SlashCommand } from './slashCommand'
import { SubscriptMark, SuperscriptMark } from './scriptMarks'
import { MathBlock, TableBlock } from './structuredBlocks'
import { renderVueNodeView } from './vueNodeView'
import { resolvePluginExtensions } from './extensionProviders'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPluginRegistry } from '@/plugins/types'

const lowlight = createLowlight()
let commonLanguagesPromise: Promise<void> | undefined

function loadCommonLanguages(): void {
  commonLanguagesPromise ??= import('lowlight').then(({ common }) => {
    lowlight.register(common)
  })
}

export function createEditorExtensions(
  features: EditorFeatureOptions = {},
  registry?: EditorPluginRegistry,
  readonly = false,
): Extensions {
  loadCommonLanguages()
  const hiddenBlockTypes = [
    ...(features.hiddenBlocks ?? []),
    ...(features.disabledRenderers ?? []),
  ]

  const pluginExtensions = resolvePluginExtensions(registry, features, readonly)

  return [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      codeBlock: false,
      heading: false,
      horizontalRule: false,
      listItem: false,
      listKeymap: false,
      orderedList: false,
      paragraph: false,
      link: {
        autolink: true,
        defaultProtocol: 'https',
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      },
    }),
    Paragraph.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }),
    Heading.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }).configure({
      levels: [...HEADING_LEVELS],
    }),
    Blockquote.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }),
    BulletList.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }),
    OrderedList.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }),
    ListItem,
    ListKeymap,
    TaskList.extend({
      addNodeView() {
        return renderVueNodeView(BlockContainerNodeView)
      },
    }),
    TaskItem.configure({
      nested: true,
    }),
    HorizontalRule.extend({
      addNodeView() {
        return renderVueNodeView(HorizontalRuleNodeView)
      },
    }),
    CodeBlockLowlight.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          title: {
            default: '',
            parseHTML: (element) => element.getAttribute('data-code-title') ?? '',
            renderHTML: (attributes) => {
              if (!attributes.title) {
                return {}
              }

              return {
                'data-code-title': attributes.title,
              }
            },
          },
          wrap: {
            default: true,
            parseHTML: (element) => element.getAttribute('data-code-wrap') !== 'false',
            renderHTML: (attributes) => ({
              'data-code-wrap': attributes.wrap === false ? 'false' : 'true',
            }),
          },
        }
      },
      addNodeView() {
        return renderVueNodeView(CodeBlockNodeView)
      },
    }).configure({
      lowlight,
      defaultLanguage: 'plaintext',
      languageClassPrefix: 'language-',
      HTMLAttributes: {
        class: 'code-block-node',
        spellcheck: 'false',
      },
    }),
    ImageFigure,
    AttachmentBlock,
    TableBlock,
    MathBlock,
    CollapsibleBlock,
    CardBlock,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    SubscriptMark,
    SuperscriptMark,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
      alignments: ['left', 'center', 'right'],
    }),
    ...(readonly ? [] : [Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') {
          return '标题'
        }

        return '输入 / 插入块'
      },
      showOnlyWhenEditable: true,
      includeChildren: true,
    })]),
    UniqueID.configure({
      attributeName: BLOCK_ID_ATTRIBUTE,
      types: [...BLOCK_ID_NODE_TYPES],
      generateID: generateBlockId,
    }),
    BlockControls.configure({
      hiddenBlockTypes,
      disabledBlockTypes: features.disabledBlocks ?? [],
    }),
    ...(readonly ? [] : [SlashCommand.configure({
      features,
      registry,
      menuComponent: features.slashMenuComponent,
      menuProps: features.slashMenuProps,
    })]),
    ...pluginExtensions,
  ]
}
