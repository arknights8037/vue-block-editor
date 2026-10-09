import { describe, expect, it } from 'vitest'
import {
  createAgentToolAdapter,
  createAgentToolDefinitions,
  invokeAgentTool,
  AgentToolError,
} from '@/agent/toolAdapter'
import { DOCUMENT_SCHEMA_VERSION } from '@/models/document'
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
    expect(adapter.capabilities.documentSchemaVersion).toBe(DOCUMENT_SCHEMA_VERSION)
    expect(adapter.capabilities.toolSchemaVersion).toBe(1)
    expect(adapter.capabilities.schemaVersion).toBe(1)
    expect(adapter.capabilities.commit).toBe(false)
    expect(adapter.read({ documentId: 'doc', revision: 2 }).documentId).toBe('doc')
    expect(() => adapter.read({ documentId: 'doc', revision: 1 })).toThrow(AgentToolError)
    expect(() => adapter.read({ documentId: 'doc', revision: 1 })).toThrow('文档版本已变化')
  })

  it('exposes callable tool definitions and a dynamic invocation helper', () => {
    const adapter = createAgentToolAdapter({ getDocument: () => ({ revision: 2, content: document }) })
    const definitions = createAgentToolDefinitions()
    expect(definitions.map((definition) => definition.name)).toEqual(['read', 'search', 'validate', 'apply', 'commit'])
    const result = invokeAgentTool(adapter, 'search', { documentId: 'doc', revision: 2, query: '知识' })
    expect(result).toHaveLength(1)
    expect(() => invokeAgentTool(adapter, 'apply', {
      documentId: 'doc', revision: 2, operations: [{ type: 'delete_block' }],
    })).toThrow('操作缺少有效 blockId')
  })

  it('commits through the host compare-and-swap callback', () => {
    let savedRevision = 2
    let savedContent = document
    const adapter = createAgentToolAdapter({
      getDocument: () => ({ revision: savedRevision, content: savedContent }),
      saveDocument: ({ documentId, expectedRevision, content }) => {
        expect(documentId).toBe('doc')
        if (expectedRevision !== savedRevision) return null
        savedRevision += 1
        savedContent = content
        return { revision: savedRevision }
      },
    })
    const blockId = createDocumentSnapshot('doc', 2, document).blocks[1].id
    const result = adapter.commit({
      documentId: 'doc',
      revision: 2,
      operations: [{ type: 'update_attrs', blockId, attrs: { align: 'center' } }],
    })
    expect(result).toMatchObject({ ok: true, committed: true, revision: 3 })
    expect(savedContent.content?.[1].attrs?.align).toBe('center')
  })

  it('returns a structured commit error when compare-and-swap rejects', () => {
    const adapter = createAgentToolAdapter({
      getDocument: () => ({ revision: 2, content: document }),
      saveDocument: () => null,
    })
    const blockId = createDocumentSnapshot('doc', 2, document).blocks[1].id
    const result = adapter.commit({
      documentId: 'doc',
      revision: 2,
      operations: [{ type: 'update_attrs', blockId, attrs: { align: 'center' } }],
    })
    expect(result).toMatchObject({ ok: false, committed: false, errorCode: 'COMMIT_REJECTED' })
  })

  it('does not pretend to commit when no save callback is configured', () => {
    const adapter = createAgentToolAdapter({ getDocument: () => ({ revision: 2, content: document }) })
    const blockId = createDocumentSnapshot('doc', 2, document).blocks[1].id
    const result = adapter.commit({
      documentId: 'doc',
      revision: 2,
      operations: [{ type: 'update_attrs', blockId, attrs: { align: 'center' } }],
    })
    expect(result).toMatchObject({ ok: false, committed: false, errorCode: 'COMMIT_NOT_CONFIGURED' })
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

