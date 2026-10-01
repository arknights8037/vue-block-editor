import { mergeAttributes, Node } from '@tiptap/vue-3'

import CollapsibleBlockNodeView from './CollapsibleBlockNodeView.vue'
import { renderVueNodeView } from './vueNodeView'
import { getCollapsibleHeadingTitle, normalizeHeadingLevel } from './headingLevels'

export const CollapsibleBlock = Node.create({
  name: 'collapsibleBlock',
  group: 'block',
  content: 'block*',
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-title') ?? '',
        renderHTML: (attributes) => ({
          'data-title': attributes.title || '',
        }),
      },
      collapsed: {
        default: false,
        parseHTML: (element) => element.getAttribute('data-collapsed') === 'true',
        renderHTML: (attributes) => ({
          'data-collapsed': attributes.collapsed === true ? 'true' : 'false',
        }),
      },
      headingLevel: {
        default: 1,
        parseHTML: (element) => normalizeHeadingLevel(element.getAttribute('data-heading-level')),
        renderHTML: (attributes) => ({
          'data-heading-level': normalizeHeadingLevel(attributes.headingLevel),
        }),
      },
      variant: {
        default: 'heading',
        parseHTML: (element) => element.getAttribute('data-variant') ?? 'heading',
        renderHTML: (attributes) => ({
          'data-variant': attributes.variant || 'heading',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-collapsible-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const title =
      node.attrs.title ||
      (node.attrs.variant === 'list'
        ? '可折叠列表'
        : getCollapsibleHeadingTitle(normalizeHeadingLevel(node.attrs.headingLevel)))
    return [
      'section',
      mergeAttributes(HTMLAttributes, { 'data-collapsible-block': '' }),
      ['button', { type: 'button', 'data-collapsible-summary': '' }, title],
      ['div', { 'data-collapsible-content': '' }, 0],
    ]
  },

  addNodeView() {
    return renderVueNodeView(CollapsibleBlockNodeView)
  },
})
