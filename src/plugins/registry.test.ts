import { describe, expect, it } from 'vitest'
import { Node } from '@tiptap/core'

import { createEditorPluginRegistry, isPluginEnabled } from './registry'
import { createEditorExtensions } from '@/editor/createEditorExtensions'
import { filterSlashCommandItems } from '@/editor/slashCommand'
import { parseMarkdownDocument } from '@/editor/markdownImport'
import { exportDocumentToMarkdown } from '@/editor/documentExport'

const demoNode = Node.create({ name: 'demoBlock' })
const otherNode = Node.create({ name: 'otherBlock' })

describe('editor plugin registry', () => {
  it('registers blocks and exposes lookup helpers', () => {
    const registry = createEditorPluginRegistry([{
      id: 'demo',
      version: 1,
      blocks: [{ id: 'demo-block', title: 'Demo', node: demoNode }],
    }])

    expect(registry.hasBlock('demo-block')).toBe(true)
    expect(registry.hasBlock('paragraph')).toBe(true)
    expect(registry.blocks.filter((block) => block.id !== 'demo-block').every((block) => block.node)).toBe(true)
    expect(registry.getBlock('demo-block')?.node?.name).toBe('demoBlock')
    expect(registry.getBlockOwner('demo-block')?.id).toBe('demo')
    expect(registry.getBlockByNodeName('demoBlock')?.id).toBe('demo-block')
  })

  it('rejects duplicate plugin and block identifiers', () => {
    expect(() => createEditorPluginRegistry([
      { id: 'demo', version: 1 },
      { id: 'demo', version: 1 },
    ])).toThrow('Duplicate editor plugin id')

    expect(() => createEditorPluginRegistry([
      { id: 'a', version: 1, blocks: [{ id: 'same', title: 'A', node: demoNode }] },
      { id: 'b', version: 1, blocks: [{ id: 'same', title: 'B', node: otherNode }] },
    ])).toThrow('Duplicate editor block id')
  })

  it('normalizes block metadata without mutating the host plugin object', () => {
    const block = { id: 'command-block', title: 'Command', node: demoNode, slashIcon: undefined, slash: { command: () => undefined } }
    const plugin = { id: 'command-plugin', version: 1 as const, blocks: [block] }
    const registry = createEditorPluginRegistry([plugin])
    expect(block.slashIcon).toBeUndefined()
    expect(registry.getBlock('command-block')?.slashIcon).toBe('□')
  })

  it('rejects an unsupported API version', () => {
    expect(() => createEditorPluginRegistry([{ id: 'future', version: 2 as 1 }])).toThrow(
      'expected id and version 1',
    )
  })

  it('injects a registered node into the editor extension set', () => {
    const registry = createEditorPluginRegistry([{
      id: 'demo',
      version: 1,
      blocks: [{ id: 'demo-block', title: 'Demo', node: demoNode }],
    }])
    expect(createEditorExtensions({}, registry).some((extension) => extension.name === 'demoBlock')).toBe(true)
    expect(createEditorExtensions({}, registry, true).some((extension) => extension.name === 'slashCommand')).toBe(false)
    expect(filterSlashCommandItems('demo', {}, registry).some((item) => item.id === 'demo-block')).toBe(true)
  })

  it('exposes explicit plugin surface capabilities with safe defaults', () => {
    const plugin = { id: 'renderer-only', version: 1 as const, capabilities: { editor: false } }
    expect(isPluginEnabled(plugin, 'editor')).toBe(false)
    expect(isPluginEnabled(plugin, 'renderer')).toBe(true)
    expect(isPluginEnabled({ id: 'default', version: 1 as const }, 'renderer')).toBe(true)
  })

  it('respects surface capabilities when installing plugin nodes', () => {
    const registry = createEditorPluginRegistry([{
      id: 'renderer-only',
      version: 1,
      capabilities: { editor: false },
      blocks: [{ id: 'demo-block', title: 'Demo', node: demoNode }],
    }, {
      id: 'editor-only',
      version: 1,
      capabilities: { renderer: false },
      blocks: [{ id: 'other-block', title: 'Other', node: otherNode }],
    }])
    const editorNames = createEditorExtensions({}, registry).map((extension) => extension.name)
    const rendererNames = createEditorExtensions({}, registry, true).map((extension) => extension.name)
    expect(editorNames).not.toContain('demoBlock')
    expect(editorNames).toContain('otherBlock')
    expect(rendererNames).toContain('demoBlock')
    expect(rendererNames).not.toContain('otherBlock')
  })

  it('routes import and export adapters through capability checks', async () => {
    const registry = createEditorPluginRegistry([{
      id: 'format-plugin',
      version: 1,
      importers: {
        markdown: () => ({ title: 'Plugin import', content: { type: 'doc', content: [{ type: 'paragraph' }] }, plainText: 'plugin' }),
      },
      exporters: {
        markdown: () => '# Plugin export\n',
      },
    }])
    expect(parseMarkdownDocument('ordinary markdown', undefined, { pluginRegistry: registry }).title).toBe('Plugin import')
    await expect(exportDocumentToMarkdown({ type: 'doc', content: [] }, { title: 'ignored' }, { pluginRegistry: registry }))
      .resolves.toBe('# Plugin export\n')

    const disabledRegistry = createEditorPluginRegistry([{
      id: 'disabled-format-plugin',
      version: 1,
      capabilities: { import: false, export: false },
      importers: {
        markdown: () => ({ title: 'should not run', content: { type: 'doc', content: [] }, plainText: '' }),
      },
      exporters: { markdown: () => 'should not run' },
    }])
    expect(parseMarkdownDocument('# Real heading', undefined, { pluginRegistry: disabledRegistry }).title).toBe('Real heading')
    await expect(exportDocumentToMarkdown({ type: 'doc', content: [] }, { title: 'Real title' }, { pluginRegistry: disabledRegistry }))
      .resolves.toContain('# Real title')
  })
})
