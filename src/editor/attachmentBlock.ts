import { mergeAttributes, Node } from '@tiptap/vue-3'

import AttachmentBlockNodeView from './AttachmentBlockNodeView.vue'
import { renderVueNodeView } from './vueNodeView'

export const AttachmentBlock = Node.create({
  name: 'attachmentBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      assetId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-asset-id') ?? '',
        renderHTML: () => ({}),
      },
      name: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-name') ?? '',
        renderHTML: () => ({}),
      },
      mimeType: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-mime-type') ?? '',
        renderHTML: () => ({}),
      },
      sizeBytes: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute('data-size-bytes') ?? 0),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'section[data-attachment-block]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-attachment-block': '',
        'data-asset-id': node.attrs.assetId,
        'data-name': node.attrs.name,
        'data-mime-type': node.attrs.mimeType,
        'data-size-bytes': String(node.attrs.sizeBytes ?? 0),
      }),
      ['a', { href: node.attrs.assetId ? `asset://${node.attrs.assetId}` : '#' }, node.attrs.name || '附件'],
    ]
  },

  addNodeView() {
    return renderVueNodeView(AttachmentBlockNodeView)
  },
})
