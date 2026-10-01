import type { App } from 'vue'
import { describe, expect, it } from 'vitest'

import {
  createVueBlockEditorPlugin,
  registerVueBlockEditor,
  VueBlockEditorPlugin,
} from './plugin'

function createFakeApp(): { app: App; names: string[] } {
  const names: string[] = []
  const app = {
    component(name: string) {
      names.push(name)
      return app
    },
  } as unknown as App

  return { app, names }
}

describe('VueBlockEditorPlugin', () => {
  it('registers all public components with the default names', () => {
    const { app, names } = createFakeApp()

    VueBlockEditorPlugin.install?.(app)

    expect(names).toEqual([
      'BlockEditor',
      'BlockRenderer',
      'DocumentRenderer',
      'DocumentTree',
      'NativeTableEditor',
      'EditorProvider',
    ])
  })

  it('supports a prefix and opting out of the provider', () => {
    const { app, names } = createFakeApp()

    registerVueBlockEditor(app, { prefix: 'N', registerProvider: false })
    expect(names).toEqual(['NBlockEditor', 'NBlockRenderer', 'NDocumentRenderer', 'NDocumentTree', 'NNativeTableEditor'])

    const second = createFakeApp()
    createVueBlockEditorPlugin({ prefix: 'Editor' }).install?.(second.app)
    expect(second.names[0]).toBe('EditorBlockEditor')
  })
})
