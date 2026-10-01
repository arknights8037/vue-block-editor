import type { JSONContent } from '@tiptap/vue-3'

export const DOCUMENT_SCHEMA_VERSION = 2

export type DocumentId = string
export type DocumentKind = 'article' | 'group'

export interface TiptapDocumentJson extends JSONContent {
  type: 'doc'
  /** Persisted document schema version used by import/export adapters. */
  schemaVersion?: number
  content?: JSONContent[]
}

export const EMPTY_TIPTAP_DOCUMENT: TiptapDocumentJson = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
}

export interface DocumentRecord {
  id: DocumentId
  parentId: DocumentId | null
  documentKind: DocumentKind
  title: string
  tags: string[]
  sourceUrl: string
  author: string
  description: string
  contentJson: string
  plainText: string
  schemaVersion: number
  revision: number
  sortOrder: number
  isDeleted: boolean
  createdAt: number
  updatedAt: number
}

export interface DocumentSummary {
  id: DocumentId
  parentId: DocumentId | null
  documentKind: DocumentKind
  title: string
  tags: string[]
  sourceUrl: string
  author: string
  description: string
  plainText: string
  revision: number
  sortOrder: number
  isDeleted: boolean
  createdAt: number
  updatedAt: number
}

export interface CreateDocumentInput {
  id: DocumentId
  parentId?: DocumentId | null
  documentKind?: DocumentKind
  title?: string
  tags?: string[]
  sourceUrl?: string
  author?: string
  description?: string
  contentJson?: string
  plainText?: string
  sortOrder?: number
}

export interface UpdateDocumentInput {
  id: DocumentId
  expectedRevision: number
  parentId?: DocumentId | null
  documentKind?: DocumentKind
  title?: string
  tags?: string[]
  sourceUrl?: string
  author?: string
  description?: string
  contentJson?: string
  plainText?: string
  sortOrder?: number
}

export interface SaveDocumentInput {
  id: DocumentId
  expectedRevision: number | null
  parentId?: DocumentId | null
  documentKind?: DocumentKind
  title: string
  tags?: string[]
  sourceUrl?: string
  author?: string
  description?: string
  contentJson: string
  plainText: string
  sortOrder?: number
}
