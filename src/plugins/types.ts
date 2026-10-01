import type { Editor, Extension, JSONContent, Node as TiptapNode } from '@tiptap/core'
import type { Component } from 'vue'
import type { EditorFeatureOptions } from '@/models/features'
import type { BlockCommandContext, BlockMenuIcon, RegisteredBlockContextInsert } from './blockContracts'

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
  setup?: (context: EditorPluginContext) => void | (() => void)
}

export interface EditorPluginRegistry {
  plugins: readonly EditorPlugin[]
  blocks: readonly EditorBlockDefinition[]
  marks: readonly EditorMarkDefinition[]
  getBlock(id: string): EditorBlockDefinition | undefined
  getBlockOwner(id: string): EditorPlugin | undefined
  getBlockByNodeName(name: string): EditorBlockDefinition | undefined
  hasBlock(id: string): boolean
}

export interface EditorPluginOptions {
  plugins?: readonly EditorPlugin[]
  pluginRegistry?: EditorPluginRegistry
  renderers?: Record<string, Component>
}

export type PluginContent = JSONContent | JSONContent[]

