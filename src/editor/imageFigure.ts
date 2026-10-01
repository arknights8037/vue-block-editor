import { mergeAttributes, Node } from '@tiptap/vue-3'

import ImageFigureNodeView from './ImageFigureNodeView.vue'
import { renderVueNodeView } from './vueNodeView'

export const ImageFigure = Node.create({
  name: 'imageFigure',
  group: 'block',
  content: 'inline*',
  defining: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (element) => element.querySelector('img')?.getAttribute('src') ?? '',
        renderHTML: () => ({}),
      },
      alt: {
        default: '',
        parseHTML: (element) => element.querySelector('img')?.getAttribute('alt') ?? '',
        renderHTML: () => ({}),
      },
      originalName: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-original-name') ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'figure[data-image-figure]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, {
        'data-image-figure': '',
        'data-original-name': node.attrs.originalName || undefined,
      }),
      ['img', { src: node.attrs.src, alt: node.attrs.alt }],
      ['figcaption', 0],
    ]
  },

  addNodeView() {
    return renderVueNodeView(ImageFigureNodeView)
  },
})
