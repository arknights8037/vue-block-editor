import type { JSONContent } from '@tiptap/vue-3'

import { cloneEditorContent, normalizeEditorContent } from '@/document/documentContent'
import type { TiptapDocumentJson } from '@/models/document'

const KNOWN_NODE_TYPES = new Set([
  'doc', 'text', 'paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList',
  'listItem', 'taskList', 'taskItem', 'codeBlock', 'horizontalRule', 'imageFigure',
  'attachmentBlock', 'tableBlock', 'mathBlock', 'collapsibleBlock', 'cardBlock',
])

export interface CoreBlock {
  id: string
  type: string
  text: string
  depth: number
  index: number
  parentId: string | null
  attrs: Record<string, unknown>
}

export interface DocumentSnapshot {
  documentId: string
  revision: number
  schemaVersion: number
  blocks: CoreBlock[]
  content: TiptapDocumentJson
}

export type CoreOperation =
  | { type: 'replace_block'; blockId: string; content: JSONContent[] }
  | { type: 'insert_block'; afterBlockId?: string; beforeBlockId?: string; content: JSONContent[] }
  | { type: 'delete_block'; blockId: string }
  | { type: 'update_attrs'; blockId: string; attrs: Record<string, unknown> }

export interface CoreOperationResult {
  ok: boolean
  content?: TiptapDocumentJson
  changedBlockIds?: string[]
  error?: string
}

export function createDocumentSnapshot(
  documentId: string,
  revision: number,
  input: TiptapDocumentJson,
): DocumentSnapshot {
  const content = normalizeEditorContent(input)
  return {
    documentId,
    revision,
    schemaVersion: content.schemaVersion ?? 0,
    content,
    blocks: collectBlocks(content),
  }
}

export function searchDocumentBlocks(snapshot: DocumentSnapshot, query: string): CoreBlock[] {
  const term = query.trim().toLocaleLowerCase()
  if (!term) return []
  return snapshot.blocks.filter((block) =>
    `${block.text} ${block.type}`.toLocaleLowerCase().includes(term),
  )
}

export function applyCoreOperations(
  snapshot: DocumentSnapshot,
  operations: CoreOperation[],
): CoreOperationResult {
  const content = cloneEditorContent(snapshot.content)
  const changed = new Set<string>()
  for (const operation of operations) {
    let result: CoreOperationResult
    try {
      result = applyOperation(content, operation)
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '操作内容无效。' }
    }
    if (!result.ok) return result
    result.changedBlockIds?.forEach((id) => changed.add(id))
  }
  const normalized = normalizeEditorContent(content)
  return { ok: true, content: normalized, changedBlockIds: [...changed] }
}

function applyOperation(content: TiptapDocumentJson, operation: CoreOperation): CoreOperationResult {
  const root = content.content ?? []
  if (operation.type === 'insert_block') {
    if (operation.afterBlockId && operation.beforeBlockId) return { ok: false, error: '插入操作不能同时指定前后目标。' }
    const anchorId = operation.afterBlockId ?? operation.beforeBlockId
    const location = anchorId ? findNodeArray(content, anchorId) : { nodes: root, index: root.length }
    if (!location) return { ok: false, error: '插入目标块不存在。' }
    const inserted = normalizeOperationNodes(operation.content)
    const index = operation.afterBlockId ? location.index + 1 : location.index
    location.nodes.splice(index, 0, ...inserted)
    return { ok: true, changedBlockIds: inserted.flatMap(collectNodeIds) }
  }
  const location = findNodeArray(content, operation.blockId)
  if (!location) return { ok: false, error: '目标块不存在。' }
  if (operation.type === 'delete_block') {
    location.nodes.splice(location.index, 1)
    return { ok: true, changedBlockIds: [operation.blockId] }
  }
  if (operation.type === 'update_attrs') {
    const node = location.nodes[location.index]
    node.attrs = { ...(node.attrs ?? {}), ...operation.attrs }
    return { ok: true, changedBlockIds: [operation.blockId] }
  }
  const replacement = normalizeOperationNodes(operation.content)
  location.nodes.splice(location.index, 1, ...replacement)
  return { ok: true, changedBlockIds: [operation.blockId, ...replacement.map(readId).filter(Boolean)] }
}

function normalizeOperationNodes(nodes: JSONContent[]): JSONContent[] {
  const invalid = findInvalidNodeType(nodes)
  if (invalid) throw new Error(`不支持的节点类型：${invalid}。`)
  return normalizeEditorContent({ type: 'doc', content: nodes }).content ?? []
}

function findInvalidNodeType(nodes: JSONContent[]): string | null {
  for (const node of nodes) {
    if (typeof node.type !== 'string' || !KNOWN_NODE_TYPES.has(node.type)) return String(node.type ?? '')
    const invalid = node.content ? findInvalidNodeType(node.content) : null
    if (invalid) return invalid
  }
  return null
}

function collectNodeIds(node: JSONContent): string[] {
  const ids = readId(node) ? [readId(node)] : []
  return ids.concat((node.content ?? []).flatMap(collectNodeIds))
}

function collectBlocks(content: TiptapDocumentJson): CoreBlock[] {
  const result: CoreBlock[] = []
  visit(content.content ?? [], null, 0, result)
  return result
}

function visit(nodes: JSONContent[], parentId: string | null, depth: number, result: CoreBlock[]): void {
  nodes.forEach((node, index) => {
    const id = readId(node)
    if (id) result.push({ id, type: String(node.type ?? ''), text: nodeText(node), depth, index, parentId, attrs: { ...(node.attrs ?? {}) } })
    if (node.content) visit(node.content, id || parentId, depth + 1, result)
  })
}

function findNodeArray(content: TiptapDocumentJson, id: string): { nodes: JSONContent[]; index: number } | null {
  function search(nodes: JSONContent[]): { nodes: JSONContent[]; index: number } | null {
    const index = nodes.findIndex((node) => readId(node) === id)
    if (index >= 0) return { nodes, index }
    for (const node of nodes) {
      const found = node.content ? search(node.content) : null
      if (found) return found
    }
    return null
  }
  return search(content.content ?? [])
}

function readId(node: JSONContent): string {
  return typeof node.attrs?.id === 'string' ? node.attrs.id : ''
}

function nodeText(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text
  if (node.type === 'mathBlock' && typeof node.attrs?.latex === 'string') return node.attrs.latex
  if (node.type === 'tableBlock' && Array.isArray(node.attrs?.rows)) return node.attrs.rows.map((row) => Array.isArray(row) ? row.join('\t') : '').join('\n')
  return (node.content ?? []).map(nodeText).join(node.type === 'paragraph' || node.type === 'heading' ? '' : '\n')
}

