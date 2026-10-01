import { mergeAttributes, Node } from '@tiptap/vue-3'

import CardBlockNodeView from './CardBlockNodeView.vue'
import { renderVueNodeView } from './vueNodeView'

/** A Markdown-compatible callout/card that can contain normal block content. */
export const CardBlock = Node.create({
  name: 'cardBlock',
  group: 'block',
  content: 'block*',
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      variant: {
        default: 'card',
        parseHTML: (element) => element.getAttribute('data-card-variant') ?? 'card',
        renderHTML: (attributes) => ({
          'data-card-variant': attributes.variant || 'card',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-card-block]' }, { tag: 'section.markdown-card' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-card-block': '',
        'data-card-variant': node.attrs.variant || 'card',
      }),
      ['div', { 'data-card-content': '' }, 0],
    ]
  },

  addNodeView() {
    return renderVueNodeView(CardBlockNodeView)
  },
})
