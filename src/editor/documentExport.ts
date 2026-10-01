import { safeLinkUrl } from './safeLinkUrl'
import type { JSONContent } from '@tiptap/vue-3'

import { assetService, type AssetService } from '@/infrastructure/assets/AssetService'
import { parseAssetUrl } from '@/models/asset'
import type { DocumentRecord, DocumentSummary, TiptapDocumentJson } from '@/models/document'

const CODE_FENCE = String.fromCharCode(96).repeat(3)

export interface ExportableDocumentMetadata {
  title: string
  /** When false, export only the document body without a generated title header. */
  includeTitle?: boolean
  tags?: string[]
  sourceUrl?: string
  author?: string
  description?: string
  updatedAt?: number
}

export interface HtmlExportOptions {
  assetService?: AssetService
}

export async function exportDocumentToMarkdown(
  content: TiptapDocumentJson,
  metadata: ExportableDocumentMetadata,
): Promise<string> {
  const lines = metadata.includeTitle === false ? [] : ['# ' + (metadata.title || '未命名文档'), '']
  if (metadata.tags?.length) lines.push('标签：' + metadata.tags.join('、'))
  if (metadata.author) lines.push('作者：' + metadata.author)
  if (metadata.sourceUrl) lines.push('来源：' + metadata.sourceUrl)
  if (metadata.description) lines.push('说明：' + metadata.description)
  if (lines.length > 2) lines.push('')
  lines.push(...nodesToMarkdown(content.content ?? []))
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

export async function exportDocumentToHtml(
  content: TiptapDocumentJson,
  metadata: ExportableDocumentMetadata,
  options: HtmlExportOptions = {},
): Promise<string> {
  const body = await nodesToHtml(content.content ?? [], options.assetService ?? assetService)
  const tags = metadata.tags?.length
    ? '<p class="doc-tags">' +
      metadata.tags.map((tag) => '<span>' + escapeHtml(tag) + '</span>').join('') +
      '</p>'
    : ''
  const source = metadata.sourceUrl
    ? '<p class="doc-source">来源：<a href="' +
      escapeAttribute(safeLinkUrl(metadata.sourceUrl)) +
      '">' +
      escapeHtml(metadata.sourceUrl) +
      '</a></p>'
    : ''
  const author = metadata.author ? '<p class="doc-meta">作者：' + escapeHtml(metadata.author) + '</p>' : ''
  const description = metadata.description
    ? '<p class="doc-description">' + escapeHtml(metadata.description) + '</p>'
    : ''

  return [
    '<!doctype html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>' + escapeHtml(metadata.title || '未命名文档') + '</title>',
    '<style>',
    'body{margin:0;background:#f6f4ef;color:#242424;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;}',
    'main{max-width:860px;margin:0 auto;padding:56px 28px 80px;background:#fffdf8;min-height:100vh;box-shadow:0 18px 60px rgba(32,24,12,.08);}',
    'h1,h2,h3,h4{line-height:1.25}p,li{line-height:1.75}pre{overflow:auto;padding:16px;border-radius:12px;background:#1f2937;color:#f9fafb}code{font-family:Consolas,monospace}',
    'blockquote{margin:1em 0;padding:.1em 1em;border-left:4px solid #d7b56d;background:#fff7df}table{border-collapse:collapse;width:100%;margin:1em 0}td,th{border:1px solid #ddd6c7;padding:8px 10px}',
    'figure{margin:24px 0}img{max-width:100%;border-radius:12px}figcaption{color:#706a5f;font-size:14px;text-align:center;margin-top:8px}',
    '.markdown-card{margin:18px 0;padding:16px 20px;border:1px solid #dce2e7;border-left:3px solid #7898b6;border-radius:8px;background:#f6f8fa}.markdown-card>:first-child{margin-top:0}.markdown-card>:last-child{margin-bottom:0}',
    '.doc-tags span{display:inline-block;margin:0 8px 8px 0;padding:3px 10px;border-radius:999px;background:#ede7d8;color:#665b43;font-size:13px}',
    '.attachment{display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #e5dece;border-radius:12px;background:#fffaf0}.math{overflow-x:auto;padding:12px;border-radius:12px;background:#f7f2e8;font-family:Consolas,monospace}',
    '</style>',
    '</head>',
    '<body><main><article><header>',
    '<h1>' + escapeHtml(metadata.title || '未命名文档') + '</h1>',
    tags,
    author,
    source,
    description,
    '</header>',
    body,
    '</article></main></body></html>',
  ].join('\n')
}

export function metadataFromDocument(
  document: DocumentRecord | DocumentSummary,
): ExportableDocumentMetadata {
  return {
    title: document.title || '未命名文档',
    tags: document.tags,
    sourceUrl: document.sourceUrl,
    author: document.author,
    description: document.description,
    updatedAt: document.updatedAt,
  }
}

function nodesToMarkdown(nodes: JSONContent[]): string[] {
  return nodes.flatMap((node) => nodeToMarkdown(node))
}

function nodeToMarkdown(node: JSONContent): string[] {
  if (node.type === 'heading') return ['#'.repeat(Number(node.attrs?.level ?? 1)) + ' ' + inlineText(node), '']
  if (node.type === 'paragraph') return [inlineText(node), '']
  if (node.type === 'blockquote') return [inlineText(node).split('\n').map((line) => '> ' + line).join('\n'), '']
  if (node.type === 'bulletList') return (node.content ?? []).map((item) => '- ' + inlineText(item)).concat('')
  if (node.type === 'orderedList') return (node.content ?? []).map((item, index) => String(index + 1) + '. ' + inlineText(item)).concat('')
  if (node.type === 'taskList') return (node.content ?? []).map((item) => '- [' + (item.attrs?.checked ? 'x' : ' ') + '] ' + inlineText(item)).concat('')
  if (node.type === 'cardBlock') return [CODE_FENCE + 'card', ...nodesToMarkdown(node.content ?? []), CODE_FENCE, '']
  if (node.type === 'codeBlock') return [CODE_FENCE + String(node.attrs?.language ?? ''), textContent(node), CODE_FENCE, '']
  if (node.type === 'horizontalRule') return ['---', '']
  if (node.type === 'imageFigure') return ['![' + (inlineText(node) || String(node.attrs?.alt ?? '图片')) + '](' + String(node.attrs?.src ?? '') + ')', '']
  if (node.type === 'attachmentBlock') return ['[📎 ' + String(node.attrs?.name ?? '附件') + '](asset://' + String(node.attrs?.assetId ?? '') + ')', '']
  if (node.type === 'tableBlock') return tableMarkdown(node)
  if (node.type === 'mathBlock') return ['$$', String(node.attrs?.latex ?? ''), '$$', '']
  if (node.type === 'collapsibleBlock') return ['<details><summary>' + escapeHtml(String(node.attrs?.title ?? '折叠内容')) + '</summary>', '', ...nodesToMarkdown(node.content ?? []), '</details>', '']
  return textContent(node) ? [textContent(node), ''] : []
}

async function nodesToHtml(nodes: JSONContent[], assets: AssetService): Promise<string> {
  return (await Promise.all(nodes.map((node) => nodeToHtml(node, assets)))).join('\n')
}

async function nodeToHtml(node: JSONContent, assets: AssetService): Promise<string> {
  if (node.type === 'heading') {
    const level = Math.min(Math.max(Number(node.attrs?.level ?? 1), 1), 4)
    return '<h' + level + '>' + inlineHtml(node) + '</h' + level + '>'
  }
  if (node.type === 'paragraph') return '<p>' + (inlineHtml(node) || '<br />') + '</p>'
  if (node.type === 'blockquote') return '<blockquote>' + (await nodesToHtml(node.content ?? [], assets)) + '</blockquote>'
  if (node.type === 'bulletList') return '<ul>' + (await listItemsToHtml(node, assets)) + '</ul>'
  if (node.type === 'orderedList') return '<ol>' + (await listItemsToHtml(node, assets)) + '</ol>'
  if (node.type === 'taskList') return '<ul>' + (node.content ?? []).map((item) => '<li>' + (item.attrs?.checked ? '☑' : '☐') + ' ' + inlineHtml(item) + '</li>').join('') + '</ul>'
  if (node.type === 'cardBlock') return '<section class="markdown-card" data-card-block data-card-variant="' + escapeAttribute(String(node.attrs?.variant ?? 'card')) + '">' + (await nodesToHtml(node.content ?? [], assets)) + '</section>'
  if (node.type === 'codeBlock') return '<pre><code>' + escapeHtml(textContent(node)) + '</code></pre>'
  if (node.type === 'horizontalRule') return '<hr />'
  if (node.type === 'imageFigure') {
    const rawSrc = String(node.attrs?.src ?? '')
    const src = parseAssetUrl(rawSrc) ? await assets.resolveAssetUrl(rawSrc) : rawSrc
    const caption = inlineHtml(node)
    return '<figure><img src="' + escapeAttribute(src) + '" alt="' + escapeAttribute(String(node.attrs?.alt ?? '')) + '" />' + (caption ? '<figcaption>' + caption + '</figcaption>' : '') + '</figure>'
  }
  if (node.type === 'attachmentBlock') {
    const name = String(node.attrs?.name ?? '附件')
    return '<section class="attachment">📎 <span><strong>' + escapeHtml(name) + '</strong><br /><small>' + escapeHtml(String(node.attrs?.mimeType ?? '')) + ' · ' + formatFileSize(Number(node.attrs?.sizeBytes ?? 0)) + '</small></span></section>'
  }
  if (node.type === 'tableBlock') return tableHtml(node)
  if (node.type === 'mathBlock') return '<div class="math">' + escapeHtml(String(node.attrs?.latex ?? '')) + '</div>'
  if (node.type === 'collapsibleBlock') return '<details open><summary>' + escapeHtml(String(node.attrs?.title ?? '折叠内容')) + '</summary>' + (await nodesToHtml(node.content ?? [], assets)) + '</details>'
  return textContent(node) ? '<p>' + escapeHtml(textContent(node)) + '</p>' : ''
}

async function listItemsToHtml(node: JSONContent, assets: AssetService): Promise<string> {
  return (await Promise.all((node.content ?? []).map(async (item) => '<li>' + (await nodesToHtml(item.content ?? [], assets)) + '</li>'))).join('')
}

function tableMarkdown(node: JSONContent): string[] {
  const rows = Array.isArray(node.attrs?.rows) ? (node.attrs.rows as unknown[][]) : []
  if (rows.length === 0) return []
  const normalized = rows.map((row) => row.map((cell) => String(cell ?? '').replace(/\|/g, '\\|')))
  const width = Math.max(1, ...normalized.map((row) => row.length))
  const padded = normalized.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ''))
  return ['| ' + padded[0].join(' | ') + ' |', '| ' + Array.from({ length: width }, () => '---').join(' | ') + ' |', ...padded.slice(1).map((row) => '| ' + row.join(' | ') + ' |'), '']
}

function tableHtml(node: JSONContent): string {
  const rows = Array.isArray(node.attrs?.rows) ? (node.attrs.rows as unknown[][]) : []
  return '<table><tbody>' + rows.map((row) => '<tr>' + row.map((cell) => '<td>' + escapeHtml(String(cell ?? '')) + '</td>').join('') + '</tr>').join('') + '</tbody></table>'
}

function inlineText(node: JSONContent): string {
  return (node.content ?? []).map((child) => textContent(child)).join('')
}

function inlineHtml(node: JSONContent): string {
  return (node.content ?? []).map((child) => inlineNodeHtml(child)).join('')
}

function inlineNodeHtml(node: JSONContent): string {
  if (node.type !== 'text') return inlineHtml(node)
  let html = escapeHtml(node.text ?? '')
  for (const mark of node.marks ?? []) {
    if (mark.type === 'bold') html = '<strong>' + html + '</strong>'
    if (mark.type === 'italic') html = '<em>' + html + '</em>'
    if (mark.type === 'strike') html = '<s>' + html + '</s>'
    if (mark.type === 'code') html = '<code>' + html + '</code>'
    if (mark.type === 'link') html = '<a href="' + escapeAttribute(safeLinkUrl(String(mark.attrs?.href ?? ''))) + '">' + html + '</a>'
  }
  return html
}

function textContent(node: JSONContent): string {
  return String(node.text ?? '') + (node.content ?? []).map((child) => textContent(child)).join('')
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/\n/g, ' ')
}

function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '未知大小'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1) + ' ' + units[unitIndex]
}
