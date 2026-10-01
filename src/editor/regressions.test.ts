import { describe, it, expect } from 'vitest'
import { applyAgentBlockPatches, getNodePlainText } from './agentBlockPatch'
import { normalizeEditorContent, serializeEditorContent, parseEditorContentJson } from './editorContent'
import { parseMarkdownDocument } from './markdownImport'
import { exportDocumentToHtml, exportDocumentToMarkdown } from './documentExport'
import type { BlockPatch } from '@/models/agent'

const context = { documentId: 'doc', expectedVersion: 3 }
const source = () => normalizeEditorContent({ type: 'doc', content: ['A', 'B', 'C'].map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) })
function patch(id: string, overrides: Partial<BlockPatch> = {}): BlockPatch {
  return { patchId: 'p', taskId: 't', documentId: 'doc', expectedVersion: 3, operation: 'replace', blockId: id, targetBlockIds: [id], before: 'A', after: 'new', accepted: true, reason: '', ...overrides }
}
describe('data integrity regressions', () => {
  it.each(['insert_before', 'insert_after', 'append'] as const)('keeps original IDs during %s', operation => {
    const doc = source(); const ids = doc.content!.map(n => n.attrs!.id as string)
    const result = applyAgentBlockPatches(doc, [patch(ids[0], { operation })], context)
    expect(result.ok).toBe(true)
    for (const [i, id] of ids.entries()) expect(getNodePlainText(result.content!.content!.find(n => n.attrs!.id === id)!)).toBe(['A','B','C'][i])
    expect(new Set(result.content!.content!.map(n => n.attrs!.id)).size).toBe(4)
    expect(doc.content).toHaveLength(3)
  })
  it('uses document order for replacement IDs even when targets are reversed', () => {
    const doc = source(); const [a,b] = doc.content!.map(n => n.attrs!.id as string)
    const result = applyAgentBlockPatches(doc, [patch(a, { targetBlockIds: [b,a], before: 'B\n\nA', after: 'X\n\nY' })], context)
    expect(result.ok).toBe(true)
    expect(result.content!.content!.slice(0,2).map(n => n.attrs!.id)).toEqual([a,b])
  })
  it('rejects stale, wrong-document and partially invalid batches without mutating the source', () => {
    const doc = source(); const id = doc.content![0].attrs!.id as string; const saved = JSON.stringify(doc)
    for (const override of [{ expectedVersion: 2 }, { documentId: 'wrong' }, { before: 'old' }, { targetBlockIds: [id,id] }, { targetBlockIds: ['missing'] }]) {
      expect(applyAgentBlockPatches(doc, [patch(id, override)], context).ok).toBe(false)
    }
    expect(applyAgentBlockPatches(doc, [patch(id), patch(id, { expectedVersion: 0 })], context).ok).toBe(false)
    expect(JSON.stringify(doc)).toBe(saved)
  })
  it('does not introduce line breaks between rich text runs', () => {
    const doc = normalizeEditorContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello', marks: [{ type: 'bold' }] }, { type: 'text', text: 'world' }] }] })
    expect(getNodePlainText(doc.content![0])).toBe('helloworld')
    expect(applyAgentBlockPatches(doc, [patch(doc.content![0].attrs!.id, { before: 'helloworld' })], context).ok).toBe(true)
  })
  it('rejects future versions at parse, normalize and serialize boundaries', () => {
    const doc = { ...source(), schemaVersion: 999 }
    expect(() => normalizeEditorContent(doc)).toThrow()
    expect(() => serializeEditorContent(doc)).toThrow()
    expect(() => parseEditorContentJson(JSON.stringify(doc))).toThrow()
    expect(doc.schemaVersion).toBe(999)
  })
  it('preserves code tags, scripts, generics and inline code as text', async () => {
    const code = '<div>text</div>\n<script>alert(1)</script>\nArray<T>'
    const doc = parseMarkdownDocument('```html\n' + code + '\n```\n\n`Map<K,V>`').content
    expect(doc.content![0].content![0].text).toBe(code)
    expect(doc.content![1].content![0].text).toBe('Map<K,V>')
    const html = await exportDocumentToHtml(doc, { title: '' })
    expect(html).not.toContain('<script>alert')
    expect(html).toContain('&lt;script&gt;')
  })
  it.each(['./guide.md', '../page', 'docs/start', '#document=abc', 'https://example.com'])('preserves valid link %s', async href => {
    const doc = parseMarkdownDocument(`[link](${href})`).content
    expect(doc.content![0].content![0].marks![0].attrs!.href).toBe(href)
    expect(await exportDocumentToHtml(doc, { title: '' })).toContain(`href="${href}"`)
  })
  it('blocks executable protocols on HTML export too', async () => {
    const doc = source(); doc.content![0].content![0].marks = [{ type: 'link', attrs: { href: 'java\nscript:alert(1)' } }]
    expect(await exportDocumentToHtml(doc, { title: '', sourceUrl: 'data:text/html,bad' })).toContain('href="#"')
    expect(await exportDocumentToHtml(doc, { title: '' })).not.toContain('script:')
  })
  it('round trips pipes inside table cells', async () => {
    const doc = normalizeEditorContent({ type: 'doc', content: [{ type: 'tableBlock', attrs: { rows: [['Name','Value'], ['A|B','C']] } }] })
    const md = await exportDocumentToMarkdown(doc, { title: '', includeTitle: false })
    expect(parseMarkdownDocument(md).content.content![0].attrs!.rows).toEqual([['Name','Value'], ['A|B','C']])
  })
})
