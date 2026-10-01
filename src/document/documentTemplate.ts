import { ensureTopLevelBlockIds } from './blockId'
import type { TiptapDocumentJson } from '@/models/document'

export function createInitialDocumentContent(title: string): TiptapDocumentJson {
  return ensureTopLevelBlockIds({
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: title }],
      },
      { type: 'paragraph' },
    ],
  })
}

export function createEmptyDocumentContent(): TiptapDocumentJson {
  return ensureTopLevelBlockIds({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  })
}

