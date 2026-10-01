import type { TiptapDocumentJson } from '@/models/document'
import type { EditorJumpAid as JumpAidMode } from '@/models/settings'

export interface EditorOutlineItem {
  id: string
  title: string
  level: number
  index: number
}

interface EditorJsonNode {
  type?: string
  text?: string
  attrs?: Record<string, unknown>
  content?: EditorJsonNode[]
}

export function collectEditorOutlineItems(
  document: TiptapDocumentJson | undefined,
): EditorOutlineItem[] {
  const content = Array.isArray(document?.content) ? (document.content as EditorJsonNode[]) : []
  const items: EditorOutlineItem[] = []

  content.forEach((node, index) => {
    const id = typeof node.attrs?.id === 'string' ? node.attrs.id : ''
    if (!id) return

    if (node.type === 'heading') {
      items.push({
        id,
        index,
        level: clampHeadingLevel(node.attrs?.level),
        title: getNodePlainText(node) || '未命名标题',
      })
      return
    }

    if (node.type === 'collapsibleBlock' && node.attrs?.variant !== 'list') {
      items.push({
        id,
        index,
        level: clampHeadingLevel(node.attrs?.headingLevel),
        title:
          typeof node.attrs?.title === 'string' && node.attrs.title.trim()
            ? node.attrs.title
            : '可折叠标题',
      })
    }
  })

  return items
}

export function filterEditorOutlineItems(
  items: EditorOutlineItem[],
  mode: JumpAidMode,
  maxLevel: number,
): EditorOutlineItem[] {
  if (mode === 'anchors') {
    const primaryLevel = getPrimaryHeadingLevel(items)
    return primaryLevel === null ? [] : items.filter((item) => item.level === primaryLevel)
  }

  return mode === 'outline' ? items.filter((item) => item.level <= maxLevel) : []
}

function getPrimaryHeadingLevel(items: EditorOutlineItem[]): number | null {
  return items.length === 0 ? null : Math.min(...items.map((item) => item.level))
}

function getNodePlainText(node: EditorJsonNode): string {
  if (typeof node.text === 'string') return node.text
  if (!Array.isArray(node.content)) return ''
  return node.content.map(getNodePlainText).join('').trim()
}

function clampHeadingLevel(value: unknown): number {
  const level = Number(value)
  return Number.isFinite(level) ? Math.max(1, Math.min(4, Math.round(level))) : 2
}
