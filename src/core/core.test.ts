import { describe, expect, it } from 'vitest'
import { createAgentToolAdapter } from '@/agent/toolAdapter'
import { applyCoreOperations, createDocumentSnapshot, searchDocumentBlocks } from './documentCore'
import { normalizeEditorContent } from '@/document/documentContent'

const document = normalizeEditorContent({ type: 'doc', content: [
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '知识库' }] },
  { type: 'paragraph', content: [{ type: 'text', text: '正文' }] },
] })

describe('three-layer document core', () => {
  it('reads nested-independent blocks and applies pure operations', () => {
    const snapshot = createDocumentSnapshot('doc', 2, document)
    expect(snapshot.blocks).toHaveLength(2)
    expect(searchDocumentBlocks(snapshot, '知识')).toHaveLength(1)
    const target = snapshot.blocks[1].id
    const result = applyCoreOperations(snapshot, [{ type: 'update_attrs', blockId: target, attrs: { align: 'center' } }])
    expect(result.ok).toBe(true)
    expect(result.content?.content?.[1].attrs?.align).toBe('center')
    expect(document.content?.[1].attrs?.align).toBeUndefined()
  })

  it('provides revision-checked agent tools without importing Vue components', () => {
    const adapter = createAgentToolAdapter({ getDocument: (id) => id === 'doc' ? { revision: 2, content: document } : null })
    expect(adapter.capabilities.operations).toContain('update_attrs')
    expect(adapter.read({ documentId: 'doc', revision: 2 }).documentId).toBe('doc')
    expect(() => adapter.read({ documentId: 'doc', revision: 1 })).toThrow()
  })

  it('rejects missing insert anchors and supports nested anchors', () => {
    const snapshot = createDocumentSnapshot('doc', 1, {
      type: 'doc',
      content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'nested' }] }] }],
    })
    const nestedId = snapshot.blocks[1].id
    expect(applyCoreOperations(snapshot, [{ type: 'insert_block', afterBlockId: 'missing', content: [{ type: 'paragraph' }] }]).ok).toBe(false)
    const result = applyCoreOperations(snapshot, [{ type: 'insert_block', afterBlockId: nestedId, content: [{ type: 'paragraph' }] }])
    expect(result.ok).toBe(true)
    expect(result.changedBlockIds).toHaveLength(1)
  })

  it('rejects unknown nodes before returning agent content', () => {
    const snapshot = createDocumentSnapshot('doc', 1, document)
    const result = applyCoreOperations(snapshot, [{ type: 'insert_block', content: [{ type: 'unknownNode' }] }])
    expect(result.ok).toBe(false)
    expect(result.error).toContain('不支持的节点类型')
  })
})

