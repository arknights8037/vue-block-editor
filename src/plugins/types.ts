import type { Editor, Extension, JSONContent, Node as TiptapNode } from '@tiptap/core'
import type { Component } from 'vue'
import type { EditorFeatureOptions } from '@/models/features'
import type { BlockCommandContext, BlockMenuIcon, RegisteredBlockContextInsert } from './blockContracts'

export interface PluginDocumentImportResult {
  title: string
  content: import('@/models/document').TiptapDocumentJson
  plainText: string
}

export interface PluginDocumentImportContext {
  registry: EditorPluginRegistry
  format: 'markdown' | 'json'
}

export interface PluginDocumentExportContext {
  registry: EditorPluginRegistry
  format: 'markdown' | 'html'
  metadata: object
}

export type PluginDocumentImporter = (
  source: string,
  context: PluginDocumentImportContext,
) => PluginDocumentImportResult | undefined

export type PluginDocumentExporter = (
  content: import('@/models/document').TiptapDocumentJson,
  context: PluginDocumentExportContext,
) => string | Promise<string> | undefined

export type ExtensionFactory = Extension | ((context: EditorPluginContext) => Extension | Extension[])

export interface EditorPluginContext {
  registry: EditorPluginRegistry
  features: EditorFeatureOptions
  editor?: Editor
  emit?: (event: string, payload?: unknown) => void
}

export interface EditorBlockDefinition {
  id: string
  title: string
  aliases?: readonly string[]
  description?: string
  slashIcon?: string
  menuIcon?: BlockMenuIcon
  node?: TiptapNode
  editorView?: Component
  readonlyView?: Component
  slash?: { command: (context: BlockCommandContext) => void }
  transform?: (editor: Editor) => void
  contextInsert?: RegisteredBlockContextInsert
}

export interface EditorMarkDefinition {
  id: string
  mark: Extension
}

export type { BlockCommandContext } from './blockContracts'

export interface EditorPlugin {
  id: string
  version: 1
  /** Declares which host surfaces the plugin is prepared to participate in. */
  capabilities?: {
    editor?: boolean
    renderer?: boolean
    import?: boolean
    export?: boolean
  }
  blocks?: readonly EditorBlockDefinition[]
  marks?: readonly EditorMarkDefinition[]
  extensions?: readonly ExtensionFactory[]
  importers?: Partial<Record<'markdown' | 'json', PluginDocumentImporter>>
  exporters?: Partial<Record<'markdown' | 'html', PluginDocumentExporter>>
  setup?: (context: EditorPluginContext) => void | (() => void)
}

export interface EditorPluginRegistry {
  plugins: readonly EditorPlugin[]
  blocks: readonly EditorBlockDefinition[]
  marks: readonly EditorMarkDefinition[]
  getBlock(id: string): EditorBlockDefinition | undefined
  getBlockOwner(id: string): EditorPlugin | undefined
  getBlockByNodeName(name: string): EditorBlockDefinition | undefined
  importDocument(source: string, format: 'markdown' | 'json'): PluginDocumentImportResult | undefined
  exportDocument(
    content: import('@/models/document').TiptapDocumentJson,
    format: 'markdown' | 'html',
    metadata: object,
  ): Promise<string | undefined>
  hasBlock(id: string): boolean
}

export interface EditorPluginOptions {
  plugins?: readonly EditorPlugin[]
  pluginRegistry?: EditorPluginRegistry
  renderers?: Record<string, Component>
}

export type PluginContent = JSONContent | JSONContent[]

