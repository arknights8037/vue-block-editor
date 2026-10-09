/**
 * Runtime-neutral document kernel for server, desktop and Web UI hosts.
 * This entry intentionally has no Vue, DOM or CSS dependency.
 */
import { createDocumentSnapshot, searchDocumentBlocks, type DocumentSnapshot } from './core/documentCore'
import { normalizeEditorContent } from './document/documentContent'
import type { DocumentRecord, DocumentSummary, TiptapDocumentJson } from './models/document'

export * from './core'

export interface KernelEndpoint {
  id: string
  name: string
  kind: 'local' | 'remote'
  url?: string
}

export interface KernelDocumentInput {
  id: string
  title: string
  content: TiptapDocumentJson
  parentId?: string | null
}

export interface DocumentKernel {
  readonly endpoints: readonly KernelEndpoint[]
  listDocuments(): DocumentSummary[]
  getDocument(id: string): DocumentRecord | undefined
  saveDocument(input: KernelDocumentInput): DocumentRecord
  search(query: string): DocumentSnapshot['blocks']
}

function toSummary(record: DocumentRecord): DocumentSummary {
  const { contentJson: _contentJson, schemaVersion: _schemaVersion, ...summary } = record
  return summary
}

export function createDocumentKernel(options: {
  endpoint?: KernelEndpoint
  documents?: KernelDocumentInput[]
} = {}): DocumentKernel {
  const endpoint = options.endpoint ?? { id: 'local', name: '本地端点', kind: 'local' as const }
  const records = new Map<string, DocumentRecord>()
  const now = () => Date.now()

  for (const input of options.documents ?? []) {
    const content = normalizeEditorContent(input.content)
    const timestamp = now()
    records.set(input.id, {
      id: input.id,
      parentId: input.parentId ?? null,
      documentKind: 'article',
      title: input.title,
      tags: [],
      sourceUrl: '',
      author: '',
      description: '',
      contentJson: JSON.stringify(content),
      plainText: '',
      schemaVersion: content.schemaVersion ?? 0,
      revision: 1,
      sortOrder: records.size,
      isDeleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  return {
    endpoints: [endpoint],
    listDocuments: () => [...records.values()].filter(record => !record.isDeleted).map(toSummary),
    getDocument: (id) => records.get(id),
    saveDocument: (input) => {
      const previous = records.get(input.id)
      const content = normalizeEditorContent(input.content)
      const timestamp = now()
      const record: DocumentRecord = {
        id: input.id,
        parentId: input.parentId ?? previous?.parentId ?? null,
        documentKind: 'article',
        title: input.title,
        tags: previous?.tags ?? [],
        sourceUrl: previous?.sourceUrl ?? '',
        author: previous?.author ?? '',
        description: previous?.description ?? '',
        contentJson: JSON.stringify(content),
        plainText: '',
        schemaVersion: content.schemaVersion ?? 0,
        revision: (previous?.revision ?? 0) + 1,
        sortOrder: previous?.sortOrder ?? records.size,
        isDeleted: false,
        createdAt: previous?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }
      records.set(input.id, record)
      return record
    },
    search: (query) => [...records.values()].flatMap((record) => {
      if (record.isDeleted) return []
      const content = JSON.parse(record.contentJson) as TiptapDocumentJson
      return searchDocumentBlocks(createDocumentSnapshot(record.id, record.revision, content), query)
    }),
  }
}
