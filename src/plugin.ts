import type { App, Component, Plugin } from 'vue'

import BlockRenderer from './components/BlockRenderer.vue'
import DocumentTree from './components/DocumentTree.vue'
import BlockEditor from './editor/EditorShell.vue'
import NativeTableEditor from './editor/NativeTableEditor.vue'
import DocumentRenderer from './components/DocumentRenderer.vue'
import EditorProvider from './ui/UiProvider.vue'

export interface VueBlockEditorPluginOptions {
  /** Prefix applied to every globally registered component name. */
  prefix?: string
  /** Register EditorProvider together with the editor components. */
  registerProvider?: boolean
}

export const blockEditorComponents: Record<
  'BlockEditor' | 'BlockRenderer' | 'DocumentRenderer' | 'DocumentTree' | 'NativeTableEditor' | 'EditorProvider',
  Component
> = {
  BlockEditor,
  BlockRenderer,
  DocumentRenderer,
  DocumentTree,
  NativeTableEditor,
  EditorProvider,
}

export type BlockEditorComponentName = keyof typeof blockEditorComponents

export function registerVueBlockEditor(
  app: App,
  options: VueBlockEditorPluginOptions = {},
): void {
  const prefix = options.prefix ?? ''
  const registerProvider = options.registerProvider ?? true

  for (const [name, component] of Object.entries(blockEditorComponents)) {
    if (name === 'EditorProvider' && !registerProvider) continue
    app.component(`${prefix}${name}`, component as Component)
  }
}

export function createVueBlockEditorPlugin(
  options: VueBlockEditorPluginOptions = {},
): Plugin {
  return {
    install(app) {
      registerVueBlockEditor(app, options)
    },
  }
}

/** Vue plugin that globally registers the package components. */
export const VueBlockEditorPlugin: Plugin = createVueBlockEditorPlugin()
