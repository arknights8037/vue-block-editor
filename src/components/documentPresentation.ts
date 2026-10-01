import type { DocumentSummary } from '@/models/document'

export const UNTITLED_DOCUMENT_TITLE = '未命名文档'

export function normalizeDocumentTitle(title: string): string {
  const normalized = title.trim()
  return normalized.length > 0 ? normalized.slice(0, 80) : UNTITLED_DOCUMENT_TITLE
}

export function parseDocumentTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[，,、#\n]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 40)),
    ),
  ).slice(0, 20)
}

export function displayDocumentTitle(document: DocumentSummary): string {
  return normalizeDocumentTitle(document.title)
}

export function formatDocumentTimestamp(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export function formatDocumentUpdatedAt(updatedAt: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(updatedAt))
}
