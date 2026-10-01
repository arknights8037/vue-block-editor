import { Node, mergeAttributes } from '@tiptap/vue-3'

import MathBlockNodeView from './MathBlockNodeView.vue'
import TableBlockNodeView from './TableBlockNodeView.vue'
import { applyTableFieldsToRows, normalizeTableFields } from './tableFields'
import { renderVueNodeView } from './vueNodeView'

export function createDefaultTableRows(): string[][] {
  return [
    ['字段', '说明'],
    ['', ''],
  ]
}

export function normalizeTableRows(value: unknown): string[][] {
  if (!Array.isArray(value) || value.length === 0) return createDefaultTableRows()

  const width = Math.max(1, ...value.map((row) => (Array.isArray(row) ? row.length : 0)))

  return value.map((row) => {
    const cells = Array.isArray(row) ? row : []
    return Array.from({ length: width }, (_, index) => {
      const cell = cells[index]
      return typeof cell === 'string' ? cell : String(cell ?? '')
    })
  })
}

function parseTableRows(element: HTMLElement): string[][] | undefined {
  const rows = Array.from(element.querySelectorAll('tr')).map((row) =>
    Array.from(row.querySelectorAll('th,td')).map((cell) => cell.textContent?.trim() ?? ''),
  )

  return rows.length > 0 ? normalizeTableRows(rows) : undefined
}

function parseTableFields(element: HTMLElement): unknown {
  const rawFields = element.getAttribute('data-table-fields')
  if (!rawFields) return undefined

  try {
    return JSON.parse(rawFields)
  } catch {
    return undefined
  }
}

export const TableBlock = Node.create({
  name: 'tableBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      rows: {
        default: createDefaultTableRows(),
        parseHTML: (element) => parseTableRows(element),
        renderHTML: () => ({}),
      },
      fields: {
        default: [],
        parseHTML: (element) => parseTableFields(element),
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-table-block]' }, { tag: 'table' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const rawRows = normalizeTableRows(node.attrs.rows)
    const fields = normalizeTableFields(node.attrs.fields, rawRows)
    const rows = applyTableFieldsToRows(rawRows, fields)
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-table-block': '',
        'data-table-fields': JSON.stringify(fields),
      }),
      ['table', ['tbody', ...rows.map((row) => ['tr', ...row.map((cell) => ['td', cell])])]],
    ]
  },

  addNodeView() {
    return renderVueNodeView(TableBlockNodeView)
  },
})

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      latex: {
        default: 'E = mc^2',
        parseHTML: (element) =>
          (element.getAttribute('data-latex') ?? element.textContent ?? '').trim(),
        renderHTML: () => ({}),
      },
      mathml: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-mathml') ?? '',
        renderHTML: () => ({}),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-math-block]' }, { tag: 'script[type="math/tex; mode=display"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-math-block': '',
        'data-latex': node.attrs.latex,
        'data-mathml': node.attrs.mathml,
      }),
      node.attrs.mathml || node.attrs.latex,
    ]
  },

  addNodeView() {
    return renderVueNodeView(MathBlockNodeView)
  },
})
