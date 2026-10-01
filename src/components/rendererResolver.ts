import { generateHTML, type JSONContent } from '@tiptap/core'
import type { Component } from 'vue'

import type { TiptapDocumentJson } from '@/models/document'
import { isFeatureHidden, type EditorFeatureOptions } from '@/models/features'
import type { EditorPluginRegistry } from '@/plugins'
import { createEditorExtensions } from '@/editor/createEditorExtensions'
import { isPluginEnabled } from '@/plugins'

export interface RendererSegment {
  node: JSONContent
  index: number
  component?: Component
  html: string
}

export function resolveRendererSegments(
  content: TiptapDocumentJson,
  features: EditorFeatureOptions,
  registry: EditorPluginRegistry,
  renderers: Record<string, Component>,
): RendererSegment[] {
  const extensions = createEditorExtensions(features, registry, true)
  const configured = new Map(Object.entries(renderers))
  return (content.content ?? []).flatMap<RendererSegment>((node, index) => {
    const definition = registry.getBlock(node.type ?? '') ?? registry.getBlockByNodeName(node.type ?? '')
    const owner = definition ? registry.getBlockOwner(definition.id) : undefined
    if (owner && !isPluginEnabled(owner, 'renderer')) {
      return [fallbackSegment(node, index, `渲染器已禁用：${node.type ?? 'unknown'}`)]
    }

    const blockId = definition?.id ?? node.type ?? ''
    if (isFeatureHidden(blockId, features) || isFeatureHidden(node.type ?? '', features)) return []

    const component = configured.get(blockId) ?? configured.get(node.type ?? '') ?? definition?.readonlyView
    if (component) return [{ node, index, component, html: '' }]

    try {
      return [{ node, index, html: generateHTML({ ...content, content: [node] }, extensions) }]
    } catch {
      return [fallbackSegment(node, index, `不支持的块：${node.type ?? 'unknown'}`)]
    }
  })
}

function fallbackSegment(node: JSONContent, index: number, message: string): RendererSegment {
  const nodeType = node.type ?? 'unknown'
  return {
    node,
    index,
    html: `<div class="document-renderer__unknown" data-node-type="${escapeHtml(nodeType)}">${escapeHtml(message)}</div>`,
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] ?? character)
}
