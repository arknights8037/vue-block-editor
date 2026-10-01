import type { JSONContent } from '@tiptap/vue-3'

import { ensureTopLevelBlockIds } from './blockId'
import { cloneEditorContent } from './editorContent'
import { parseMarkdownDocument } from './markdownImport'
import { validateBlockPatch, type BlockPatch } from '@/models/agent'
import type { TiptapDocumentJson } from '@/models/document'

export interface ApplyBlockPatchResult {
  ok: boolean
  content?: TiptapDocumentJson
  plainText?: string
  error?: string
}

/** Validates a batch against the host snapshot and returns detached content; the host must compare-and-save atomically. */
export function applyAgentBlockPatches(
  source: TiptapDocumentJson,
  patches: BlockPatch[],
  context: { documentId: string; expectedVersion: number },
): ApplyBlockPatchResult {
  if (!context || !context.documentId || !Number.isInteger(context.expectedVersion) || context.expectedVersion < 0) {
    return { ok: false, error: '缺少有效的当前文档和版本。' }
  }
  if (patches.some((patch) => patch.operation === 'create_document')) {
    return { ok: false, error: '新建文档提案必须由文档事务执行器处理。' }
  }
  const content = cloneEditorContent(source)
  const blocks = content.content ?? []
  const sourceBlocks = blocks.map((block) => ({
    id: readBlockId(block),
    type: String(block.type ?? ''),
    text: getNodePlainText(block),
    index: 0,
  }))
  for (const patch of patches) {
    if (!['replace', 'insert_before', 'insert_after', 'append'].includes(patch.operation)) {
      return { ok: false, error: `不支持的补丁操作：${patch.operation}。` }
    }
    if (!patch.accepted) return { ok: false, error: '只能执行已接受的 Agent 补丁。' }
    const validation = validateBlockPatch(patch, {
      ...context,
      availableBlockIds: sourceBlocks.map((block) => block.id),
      currentBlocks: sourceBlocks,
    })
    if (!validation.ok) return { ok: false, error: validation.error ?? '补丁校验失败。' }
  }
  const resolved = patches.map((patch) => resolvePatchRange(blocks, patch))
  const failure = resolved.find((item) => typeof item === 'string')
  if (failure) return { ok: false, error: failure }

  const ranges = resolved as Array<{ patch: BlockPatch; from: number; to: number }>
  const targetedIds = new Set<string>()
  for (const range of ranges) {
    for (const blockId of range.patch.targetBlockIds) {
      if (targetedIds.has(blockId)) return { ok: false, error: '多个补丁不能修改同一个目标块。' }
      targetedIds.add(blockId)
    }
  }
  const ordered = [...ranges].sort((left, right) => right.from - left.from)

  for (const item of ordered) {
    const parsed = parseMarkdownDocument(item.patch.after, 'AI 输出')
    const replacement = parsed.content.content ?? [{ type: 'paragraph' }]
    if (item.patch.operation === 'replace') {
      preserveReplacedBlockIds(replacement, blocks.slice(item.from, item.to + 1).map(readBlockId))
      blocks.splice(item.from, item.to - item.from + 1, ...replacement)
    } else if (item.patch.operation === 'insert_before') {
      blocks.splice(item.from, 0, ...replacement)
    } else {
      blocks.splice(item.to + 1, 0, ...replacement)
    }
  }
  content.content = blocks
  const normalized = ensureTopLevelBlockIds(content)
  return { ok: true, content: normalized, plainText: getDocumentPlainText(normalized) }
}

export function preserveReplacedBlockIds(replacement: JSONContent[], targetIds: string[]): void {
  // Keep stable references when the replacement has the same number of top-level blocks.
  if (replacement.length === targetIds.length) {
    replacement.forEach((node, index) => {
      const attrs = { ...(node.attrs ?? {}), id: targetIds[index] }
      node.attrs = attrs
    })
    return
  }
  if (replacement.length > 0) {
    replacement[0].attrs = { ...(replacement[0].attrs ?? {}), id: targetIds[0] }
  }
}

function resolvePatchRange(
  blocks: JSONContent[],
  patch: BlockPatch,
): { patch: BlockPatch; from: number; to: number } | string {
  const targetIds = new Set(patch.targetBlockIds)
  const indexes = blocks
    .map((block, index) => (targetIds.has(readBlockId(block)) ? index : -1))
    .filter((index) => index >= 0)
  if (indexes.length !== patch.targetBlockIds.length) return '目标块已不存在，需要重新生成。'

  const from = Math.min(...indexes)
  const to = Math.max(...indexes)
  for (let index = from; index <= to; index += 1) {
    if (!targetIds.has(readBlockId(blocks[index] ?? {}))) {
      return '替换补丁的目标块必须连续，已阻止写入。'
    }
  }
  return { patch, from, to }
}

function readBlockId(block: JSONContent): string {
  const attrs = block.attrs
  return attrs && typeof attrs.id === 'string' ? attrs.id : ''
}

export function getDocumentPlainText(content: TiptapDocumentJson): string {
  return (content.content ?? [])
    .map((node) => getNodePlainText(node))
    .filter(Boolean)
    .join('\n')
}

export function getNodePlainText(node: JSONContent): string {
  if (typeof node.text === 'string') return node.text
  if (node.type === 'mathBlock' && typeof node.attrs?.latex === 'string') return node.attrs.latex
  if (node.type === 'tableBlock' && Array.isArray(node.attrs?.rows)) {
    return node.attrs.rows
      .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '')).join('\t') : ''))
      .join('\n')
  }
  if (node.type === 'hardBreak') return '\n'
  const inline = ['paragraph', 'heading', 'codeBlock', 'imageFigure'].includes(node.type ?? '')
  return (node.content ?? []).map((child) => getNodePlainText(child)).join(inline ? '' : '\n')
}
