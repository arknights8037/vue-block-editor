import type { TiptapDocumentJson } from '@/models/document'
import {
  applyCoreOperations,
  createDocumentSnapshot,
  searchDocumentBlocks,
  type CoreOperation,
  type DocumentSnapshot,
} from '@/core/documentCore'

export interface AgentDocumentToolRequest {
  documentId: string
  revision: number
}

export interface AgentToolAdapter {
  readonly capabilities: {
    schemaVersion: number
    operations: readonly CoreOperation['type'][]
  }
  read(request: AgentDocumentToolRequest): DocumentSnapshot
  search(request: AgentDocumentToolRequest & { query: string }): ReturnType<typeof searchDocumentBlocks>
  validate(request: AgentDocumentToolRequest & { operations: CoreOperation[] }): ReturnType<typeof applyCoreOperations>
  apply(request: AgentDocumentToolRequest & { operations: CoreOperation[] }): ReturnType<typeof applyCoreOperations>
}

export function createAgentToolAdapter(options: {
  getDocument: (documentId: string) => { revision: number; content: TiptapDocumentJson } | null
}): AgentToolAdapter {
  const load = (request: AgentDocumentToolRequest): DocumentSnapshot => {
    const record = options.getDocument(request.documentId)
    if (!record) throw new Error('文档不存在。')
    if (record.revision !== request.revision) throw new Error('文档版本已变化，需要重新读取。')
    return createDocumentSnapshot(request.documentId, record.revision, record.content)
  }
  return {
    capabilities: { schemaVersion: 1, operations: ['replace_block', 'insert_block', 'delete_block', 'update_attrs'] },
    read: load,
    search: (request) => searchDocumentBlocks(load(request), request.query),
    validate: (request) => applyCoreOperations(load(request), request.operations),
    apply: (request) => applyCoreOperations(load(request), request.operations),
  }
}
