import type { JSONContent } from '@tiptap/vue-3'

import { safeLinkUrl } from './safeLinkUrl'
import { ensureTopLevelBlockIds } from './blockId'
import { normalizeTableRows } from './structuredBlocks'
import type { TiptapDocumentJson } from '@/models/document'
import type { EditorPluginRegistry } from '@/plugins'

export interface MarkdownImportResult {
  title: string
  content: TiptapDocumentJson
  plainText: string
}

export interface MarkdownImportOptions {
  pluginRegistry?: EditorPluginRegistry
}

interface ListItemDraft {
  text: string
  ordered: boolean
  taskChecked?: boolean
}

const DEFAULT_IMPORTED_TITLE = '导入的 Markdown'

export function parseMarkdownDocument(
  markdown: string,
  fallbackTitle = DEFAULT_IMPORTED_TITLE,
  options: MarkdownImportOptions = {},
): MarkdownImportResult {
  const pluginResult = options.pluginRegistry?.importDocument(markdown, 'markdown')
  if (pluginResult) return pluginResult
  const normalizedMarkdown = markdown.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const lines = normalizedMarkdown.split('\n')
  const content: JSONContent[] = []
  const plainTextLines: string[] = []
  let paragraphLines: string[] = []
  let quoteLines: string[] = []
  let listItems: ListItemDraft[] = []
  let codeLines: string[] = []
  let codeLanguage: string | null = null
  let mathLines: string[] = []
  let mathFenceEnd: '$$' | '\\]' | null = null
  let isInCodeBlock = false
  let isInMathBlock = false
  let firstHeadingTitle = ''

  function flushParagraph(): void {
    if (paragraphLines.length === 0) return

    const text = paragraphLines.join(' ')
    content.push(createTextBlock('paragraph', text))
    plainTextLines.push(text)
    paragraphLines = []
  }

  function flushQuote(): void {
    if (quoteLines.length === 0) return

    const text = quoteLines.join('\n')
    content.push({
      type: 'blockquote',
      content: [createTextBlock('paragraph', text)],
    })
    plainTextLines.push(text)
    quoteLines = []
  }

  function flushList(): void {
    if (listItems.length === 0) return

    const isOrdered = listItems[0]?.ordered ?? false
    const isTaskList = !isOrdered && listItems.some((item) => item.taskChecked !== undefined)
    content.push({
      type: isTaskList ? 'taskList' : isOrdered ? 'orderedList' : 'bulletList',
      content: listItems.map((item) => ({
        type: isTaskList ? 'taskItem' : 'listItem',
        attrs: isTaskList ? { checked: item.taskChecked === true } : undefined,
        content: [createTextBlock('paragraph', item.text)],
      })),
    })
    plainTextLines.push(...listItems.map((item) => item.text))
    listItems = []
  }

  function flushCodeBlock(): void {
    const codeText = codeLines.join('\n')
    if (isCardFenceLanguage(codeLanguage)) {
      const cardContent = parseMarkdownDocument(codeText, '卡片').content.content ?? [
        { type: 'paragraph' },
      ]
      content.push({
        type: 'cardBlock',
        attrs: { variant: 'card' },
        content: cardContent,
      })
      plainTextLines.push(codeText)
      codeLines = []
      codeLanguage = null
      return
    }

    if (isMathFenceLanguage(codeLanguage)) {
      content.push({
        type: 'mathBlock',
        attrs: { latex: codeText.trim() },
      })
      plainTextLines.push(codeText)
      codeLines = []
      codeLanguage = null
      return
    }

    content.push({
      type: 'codeBlock',
      attrs: codeLanguage ? { language: codeLanguage } : undefined,
      content: codeLines.length > 0 ? [{ type: 'text', text: codeText }] : undefined,
    })
    plainTextLines.push(codeText)
    codeLines = []
    codeLanguage = null
  }

  function flushMathBlock(): void {
    const latex = mathLines.join('\n').trim()
    content.push({
      type: 'mathBlock',
      attrs: { latex },
    })
    plainTextLines.push(latex)
    mathLines = []
    mathFenceEnd = null
  }

  function flushOpenBlocks(): void {
    flushParagraph()
    flushQuote()
    flushList()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (isInCodeBlock) {
      if (/^```/.test(line)) {
        flushCodeBlock()
        isInCodeBlock = false
      } else {
        codeLines.push(line)
      }
      continue
    }

    if (isInMathBlock) {
      const closingIndex = mathFenceEnd ? line.indexOf(mathFenceEnd) : -1
      if (closingIndex >= 0) {
        mathLines.push(line.slice(0, closingIndex))
        flushMathBlock()
        isInMathBlock = false
      } else {
        mathLines.push(line)
      }
      continue
    }

    const codeFenceMatch = line.match(/^```([\w-]+)?\s*$/)
    if (codeFenceMatch) {
      flushOpenBlocks()
      isInCodeBlock = true
      codeLanguage = codeFenceMatch[1] ?? null
      continue
    }

    const mathFenceStart = parseMathFenceStart(line)
    if (mathFenceStart) {
      flushOpenBlocks()
      if (mathFenceStart.closed) {
        mathLines = [mathFenceStart.latex]
        flushMathBlock()
      } else {
        isInMathBlock = true
        mathFenceEnd = mathFenceStart.end
        mathLines = mathFenceStart.latex ? [mathFenceStart.latex] : []
      }
      continue
    }

    if (isMarkdownTableStart(lines, index)) {
      flushOpenBlocks()
      const tableRows = [parseMarkdownTableRow(line)]
      index += 2

      while (index < lines.length && isMarkdownTableBodyRow(lines[index])) {
        tableRows.push(parseMarkdownTableRow(lines[index]))
        index += 1
      }

      index -= 1
      const rows = normalizeTableRows(tableRows)
      content.push({
        type: 'tableBlock',
        attrs: { rows },
      })
      plainTextLines.push(...rows.map((row) => row.join('\t')))
      continue
    }

    if (/^\s*$/.test(line)) {
      flushOpenBlocks()
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushOpenBlocks()
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      if (!firstHeadingTitle && level === 1) {
        firstHeadingTitle = stripMarkdownInlineSyntax(text)
      }
      content.push(createTextBlock('heading', text, { level }))
      plainTextLines.push(stripMarkdownInlineSyntax(text))
      continue
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushOpenBlocks()
      content.push({ type: 'horizontalRule' })
      continue
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      quoteLines.push(quoteMatch[1])
      continue
    }

    const taskListMatch = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.+)$/)
    const unorderedListMatch = line.match(/^\s*[-*+]\s+(.+)$/)
    const orderedListMatch = line.match(/^\s*\d+\.\s+(.+)$/)
    if (taskListMatch || unorderedListMatch || orderedListMatch) {
      flushParagraph()
      flushQuote()
      const ordered = Boolean(orderedListMatch)
      const isTask = Boolean(taskListMatch)
      if (
        listItems.length > 0 &&
        (listItems[0].ordered !== ordered || (listItems[0].taskChecked !== undefined) !== isTask)
      ) {
        flushList()
      }
      listItems.push({
        text: (taskListMatch?.[2] ?? unorderedListMatch?.[1] ?? orderedListMatch?.[1] ?? '').trim(),
        ordered,
        taskChecked: taskListMatch ? taskListMatch[1].toLowerCase() === 'x' : undefined,
      })
      continue
    }

    flushQuote()
    flushList()
    paragraphLines.push(line.trim())
  }

  if (isInCodeBlock) {
    flushCodeBlock()
  }
  if (isInMathBlock) {
    flushMathBlock()
  }
  flushOpenBlocks()

  const fallback = fallbackTitle.replace(/\.(md|markdown)$/i, '').trim()
  const title = firstHeadingTitle || fallback || DEFAULT_IMPORTED_TITLE
  const documentContent: TiptapDocumentJson = {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  }

  return {
    title,
    content: ensureTopLevelBlockIds(documentContent),
    plainText: plainTextLines.filter(Boolean).join('\n'),
  }
}

function parseMathFenceStart(
  line: string,
): { end: '$$' | '\\]'; latex: string; closed: boolean } | null {
  const trimmed = line.trim()

  if (trimmed.startsWith('$$')) {
    const rest = trimmed.slice(2)
    const closingIndex = rest.lastIndexOf('$$')
    return {
      end: '$$',
      latex: closingIndex >= 0 ? rest.slice(0, closingIndex).trim() : rest.trim(),
      closed: closingIndex >= 0,
    }
  }

  if (trimmed.startsWith('\\[')) {
    const rest = trimmed.slice(2)
    const closingIndex = rest.lastIndexOf('\\]')
    return {
      end: '\\]',
      latex: closingIndex >= 0 ? rest.slice(0, closingIndex).trim() : rest.trim(),
      closed: closingIndex >= 0,
    }
  }

  return null
}

function isMathFenceLanguage(language: string | null): boolean {
  return ['math', 'latex', 'tex'].includes((language ?? '').toLowerCase())
}

function isCardFenceLanguage(language: string | null): boolean {
  return ['card', 'callout'].includes((language ?? '').toLowerCase())
}

function isMarkdownTableStart(lines: string[], index: number): boolean {
  const currentLine = lines[index]
  const separatorLine = lines[index + 1]

  return isMarkdownTableRow(currentLine) && isMarkdownTableDelimiterLine(separatorLine)
}

function isMarkdownTableBodyRow(line: string | undefined): boolean {
  return isMarkdownTableRow(line) && !isMarkdownTableDelimiterLine(line)
}

function isMarkdownTableRow(line: string | undefined): boolean {
  return typeof line === 'string' && line.includes('|') && parseMarkdownTableRow(line).length > 1
}

function isMarkdownTableDelimiterLine(line: string | undefined): boolean {
  if (typeof line !== 'string' || !isMarkdownTableRow(line)) return false

  return parseMarkdownTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))
}

function parseMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => stripMarkdownInlineSyntax(cell.replace(/\\\|/g, '|').trim()))
}

function createTextBlock(
  type: 'paragraph' | 'heading',
  text: string,
  attrs?: Record<string, unknown>,
): JSONContent {
  const content = parseInlineMarkdown(text)

  return {
    type,
    attrs,
    content: content.length > 0 ? content : undefined,
  }
}

function parseInlineMarkdown(text: string): JSONContent[] {
  const nodes: JSONContent[] = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    nodes.push(createInlineNode(match[0]))
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return nodes.filter((node) => node.text !== '')
}

function createInlineNode(token: string): JSONContent {
  if (token.startsWith('`') && token.endsWith('`')) {
    return {
      type: 'text',
      text: token.slice(1, -1),
      marks: [{ type: 'code' }],
    }
  }

  if (token.startsWith('**') && token.endsWith('**')) {
    return {
      type: 'text',
      text: token.slice(2, -2),
      marks: [{ type: 'bold' }],
    }
  }

  if (token.startsWith('*') && token.endsWith('*')) {
    return {
      type: 'text',
      text: token.slice(1, -1),
      marks: [{ type: 'italic' }],
    }
  }

  const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
  if (linkMatch) {
    return {
      type: 'text',
      text: linkMatch[1],
      marks: [{ type: 'link', attrs: { href: safeLinkUrl(linkMatch[2]) } }],
    }
  }

  return { type: 'text', text: token }
}

function stripMarkdownInlineSyntax(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
}
