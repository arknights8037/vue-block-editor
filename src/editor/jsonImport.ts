import type { JSONContent } from '@tiptap/vue-3'

import { ensureTopLevelBlockIds } from './blockId'
import { normalizeEditorContent } from './editorContent'
import type { TiptapDocumentJson } from '@/models/document'

export interface JsonImportResult {
  title: string
  content: TiptapDocumentJson
  plainText: string
}

const DEFAULT_IMPORTED_TITLE = '导入的 JSON'

export function parseNotebookJsonDocument(
  jsonText: string,
  fallbackTitle = DEFAULT_IMPORTED_TITLE,
): JsonImportResult {
  const parsed: unknown = JSON.parse(jsonText)
  const content = extractDocumentContent(parsed)
  const normalizedContent = ensureTopLevelBlockIds(normalizeEditorContent(content))
  const plainText = extractPlainText(normalizedContent)
  const title =
    extractDocumentTitle(parsed) ||
    findFirstHeadingText(normalizedContent) ||
    normalizeFallbackTitle(fallbackTitle)

  return {
    title,
    content: normalizedContent,
    plainText: extractPlainTextFromRecord(parsed) || plainText,
  }
}

function extractDocumentContent(value: unknown): TiptapDocumentJson {
  if (isTiptapDocument(value)) {
    return value
  }

  if (!isRecord(value)) {
    throw new Error('JSON 文件不是有效的文档对象。')
  }

  if (typeof value.contentJson === 'string') {
    const parsedContent: unknown = JSON.parse(value.contentJson)
    if (isTiptapDocument(parsedContent)) {
      return parsedContent
    }
  }

  if (isTiptapDocument(value.content)) {
    return value.content
  }

  throw new Error('JSON 文件中没有找到本软件支持的文档内容。')
}

function isTiptapDocument(value: unknown): value is TiptapDocumentJson {
  return isRecord(value) && value.type === 'doc'
}

function extractDocumentTitle(value: unknown): string {
  if (!isRecord(value) || typeof value.title !== 'string') return ''
  return value.title.trim().slice(0, 80)
}

function extractPlainTextFromRecord(value: unknown): string {
  if (!isRecord(value) || typeof value.plainText !== 'string') return ''
  return value.plainText
}

function findFirstHeadingText(document: TiptapDocumentJson): string {
  const heading = document.content?.find((node) => node.type === 'heading')
  return heading ? extractNodeText(heading).trim().slice(0, 80) : ''
}

function normalizeFallbackTitle(title: string): string {
  return (
    title
      .replace(/\.json$/i, '')
      .trim()
      .slice(0, 80) || DEFAULT_IMPORTED_TITLE
  )
}

function extractPlainText(document: TiptapDocumentJson): string {
  return (document.content ?? [])
    .map((node) => extractNodeText(node).trim())
    .filter(Boolean)
    .join('\n')
}

function extractNodeText(node: JSONContent): string {
  const ownText = typeof node.text === 'string' ? node.text : ''
  const childrenText = (node.content ?? []).map((child) => extractNodeText(child)).join('')
  return ownText + childrenText
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
