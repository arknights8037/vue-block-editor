export interface InternalDocumentTarget {
  documentId: string
  blockId?: string
}

export function createInternalDocumentHref(documentId: string, blockId?: string): string {
  const params = new URLSearchParams({ document: documentId })
  if (blockId?.trim()) params.set('block', blockId.trim())
  return `#${params.toString()}`
}

export function parseInternalDocumentHref(href: string): InternalDocumentTarget | null {
  if (!href.startsWith('#document=')) return null
  const params = new URLSearchParams(href.slice(1))
  const documentId = params.get('document')?.trim() ?? ''
  if (!documentId) return null
  const blockId = params.get('block')?.trim() || undefined
  return { documentId, blockId }
}
