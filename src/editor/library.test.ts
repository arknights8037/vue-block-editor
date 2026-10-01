import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NativeTableEditor from './NativeTableEditor.vue'
import { exportDocumentToHtml, exportDocumentToMarkdown } from './documentExport'
import { migrateEditorContent, normalizeEditorContent, parseEditorContentJson, serializeEditorContent } from './editorContent'
import { parseMarkdownDocument } from './markdownImport'
import { validateDocumentNodeIds } from './blockId'
import { DOCUMENT_SCHEMA_VERSION } from '@/models/document'
import { filterSlashCommandItems } from './slashCommand'
import { applyAgentBlockPatches } from './agentBlockPatch'
import EditorContextMenu from './EditorContextMenu.vue'
import SlashCommandMenu from './slash/SlashCommandMenu.vue'
import DocumentRenderer from '@/components/DocumentRenderer.vue'
import { Node } from '@tiptap/core'
import UiProvider from '@/ui/UiProvider.vue'
import { useAssetService, type AssetService } from '@/infrastructure/assets/AssetService'

describe('vue block editor library', () => {
  it('imports and exports the core block formats', async () => {
    const imported = parseMarkdownDocument(
      ['# Title', '', '| Name | Value |', '| --- | --- |', '| A | 1 |', '', '$$', 'x^2', '$$'].join('\n'),
    )
    expect(imported.content.content?.some((node) => node.type === 'tableBlock')).toBe(true)
    expect(imported.content.content?.some((node) => node.type === 'mathBlock')).toBe(true)

    const markdown = await exportDocumentToMarkdown(imported.content, { title: imported.title })
    expect(markdown).toContain('| Name | Value |')
    expect(markdown).toContain('x^2')
  })

  it('sanitizes unsafe markdown link protocols', () => {
    const imported = parseMarkdownDocument('[危险链接](javascript:alert(1))')
    const mark = imported.content.content?.[0]?.content?.[0]?.marks?.[0]
    expect(mark?.attrs?.href).toBe('#')
  })

  it('provides trigger and content slots for context menu extensions', () => {
    const wrapper = mount(EditorContextMenu, {
      slots: {
        trigger: '<button>触发菜单</button>',
        content: '<div>自定义 Agent 操作</div>',
      },
    })
    expect(wrapper.text()).toContain('触发菜单')
    expect(wrapper.vm.$slots.content).toBeTypeOf('function')
  })

  it('renders slash command items as a Vue component', async () => {
    const wrapper = mount(SlashCommandMenu, {
      props: {
        items: [{ id: 'paragraph', icon: 'T', title: '正文', aliases: [], description: '普通文本块', command: () => undefined }],
        selectedIndex: 0,
      },
    })
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true)
    expect(wrapper.find('[role="option"]').attributes('aria-selected')).toBe('true')
    await wrapper.find('button').trigger('mousedown')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  it('round-trips legacy card fences as card blocks', async () => {
    const imported = parseMarkdownDocument(
      ['```card', '## 提示', '', '- **检查结果**', '```'].join('\n'),
    )
    const card = imported.content.content?.find((node) => node.type === 'cardBlock')

    expect(card?.attrs?.variant).toBe('card')
    expect(card?.content?.[0]?.type).toBe('heading')
    expect(card?.content?.[1]?.type).toBe('bulletList')

    const markdown = await exportDocumentToMarkdown(imported.content, { title: 'Cards' })
    const html = await exportDocumentToHtml(imported.content, { title: 'Cards' })
    expect(markdown).toContain('```card')
    expect(markdown).toContain('## 提示')
    expect(html).toContain('data-card-block')
    expect(html).toContain('markdown-card')
  })

  it('renders native editable and readonly tables without VTable', async () => {
    const rows = [
      ['Name', 'Value'],
      ['A', '1'],
    ]
    const editable = mount(NativeTableEditor, { props: { rows } })
    expect(editable.findAll('th')).toHaveLength(2)
    expect(editable.findAll('textarea')).toHaveLength(2)
    await editable.find('textarea').setValue('B')
    expect(editable.emitted('update')?.at(-1)?.[0]).toEqual([
      ['Name', 'Value'],
      ['B', '1'],
    ])

    const readonly = mount(NativeTableEditor, { props: { rows, readonly: true } })
    expect(readonly.findAll('textarea')).toHaveLength(0)
    expect(readonly.text()).toContain('A')
  })

  it('renders readonly documents without mounting the editor shell', () => {
    const wrapper = mount(DocumentRenderer, {
      props: {
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'readonly' }] }] },
      },
    })
    expect(wrapper.find('.document-renderer__content').text()).toContain('readonly')
  })

  it('injects an asset service through the UI provider', () => {
    const service: AssetService = {
      storeFile: async () => ({ id: 'asset-test', documentId: null, relativePath: '', originalName: 'test', mimeType: 'text/plain', sizeBytes: 0, contentHash: '', width: null, height: null, createdAt: 0, updatedAt: 0 }),
      findAsset: async () => null,
      resolveAssetUrl: async () => '',
      openAsset: async () => undefined,
    }
    const consumer = defineComponent({
      setup: () => {
        const assets = useAssetService()
        return () => h('span', { class: 'asset-service-id' }, assets === service ? 'injected' : 'fallback')
      },
    })
    const wrapper = mount(UiProvider, { props: { assetService: service }, slots: { default: consumer } })
    expect(wrapper.find('.asset-service-id').text()).toBe('injected')
  })

  it('uses a plugin renderer for custom readonly blocks', () => {
    const customView = defineComponent({
      props: { node: { type: Object, required: true } },
      setup: (props) => () => h('aside', { class: 'custom-view' }, (props.node as { attrs?: { label?: string } }).attrs?.label),
    })
    const plugin = {
      id: 'library-test',
      version: 1 as const,
      blocks: [{
        id: 'library-note',
        title: 'Library note',
        node: Node.create({ name: 'libraryNote', group: 'block', atom: true, addAttributes: () => ({ label: { default: '' } }), renderHTML: ({ node }) => ['aside', { 'data-library-note': '', 'data-label': node.attrs.label }] }),
        readonlyView: customView,
      }],
    }
    const wrapper = mount(DocumentRenderer, {
      props: {
        plugins: [plugin],
        content: { type: 'doc', content: [{ type: 'libraryNote', attrs: { label: 'plugin content' } }] },
      },
    })
    expect(wrapper.find('.custom-view').text()).toBe('plugin content')

    const override = defineComponent({ setup: () => () => h('strong', { class: 'override-view' }, 'override') })
    const overridden = mount(DocumentRenderer, {
      props: {
        plugins: [plugin],
        renderers: { 'library-note': override },
        content: { type: 'doc', content: [{ type: 'libraryNote', attrs: { label: 'plugin content' } }] },
      },
    })
    expect(overridden.find('.override-view').text()).toBe('override')
  })

  it('keeps unknown readonly blocks visible through a safe fallback', () => {
    const wrapper = mount(DocumentRenderer, {
      props: { content: { type: 'doc', content: [{ type: 'futureBlock' }] } },
    })
    expect(wrapper.find('.document-renderer__unknown').attributes('data-node-type')).toBe('futureBlock')
  })

  it('normalizes the public document contract with schema version and stable ids', () => {
    const first = normalizeEditorContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hello' }] }],
    })
    const second = normalizeEditorContent(first)

    expect(first.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION)
    expect(validateDocumentNodeIds(first).valid).toBe(true)
    expect(serializeEditorContent(first)).toBe(serializeEditorContent(second))
    expect(second.content?.[0]?.attrs?.id).toBe(first.content?.[0]?.attrs?.id)
  })

  it('applies host schema migrations before normalizing the document', () => {
    const migrated = migrateEditorContent(
      { type: 'doc', schemaVersion: 1, content: [{ type: 'paragraph', attrs: { legacy: true } }] },
      [{
        fromVersion: 1,
        toVersion: 2,
        migrate: (document) => ({
          ...document,
          content: document.content?.map((node) => ({
            ...node,
            attrs: { ...(node.attrs ?? {}), migrated: true },
          })),
        }),
      }],
    )

    expect(migrated.schemaVersion).toBe(DOCUMENT_SCHEMA_VERSION)
    expect(migrated.content?.[0]?.attrs?.migrated).toBe(true)
    expect(validateDocumentNodeIds(migrated).valid).toBe(true)
    expect(() => migrateEditorContent(
      { type: 'doc', schemaVersion: 1 },
      [{ fromVersion: 1, toVersion: 3, migrate: (document) => document }],
    )).toThrow('Invalid document migration')
  })

  it('rejects malformed document JSON instead of passing it to Tiptap', () => {
    expect(() => parseEditorContentJson('{"type":"doc","content":"invalid"}')).toThrow(
      'Invalid Tiptap document JSON.',
    )
    expect(() => parseEditorContentJson('{"type":"doc","content":[null]}')).toThrow(
      'Invalid Tiptap document JSON.',
    )
    expect(() => parseEditorContentJson('{"type":"doc","schemaVersion":999}')).toThrow(
      'Invalid Tiptap document JSON.',
    )
  })

  it('filters disabled block features from slash commands without changing document data', () => {
    expect(filterSlashCommandItems('', { disabledBlocks: ['taskList'] }).some((item) => item.id === 'task-list')).toBe(false)
    expect(filterSlashCommandItems('card', { disabledBlocks: ['task-list'] }).length).toBeGreaterThan(0)
  })

  it('rejects non-contiguous agent replacements and preserves ids for matching replacements', () => {
    const first = '11111111-1111-4111-8111-111111111111'
    const middle = '22222222-2222-4222-8222-222222222222'
    const last = '33333333-3333-4333-8333-333333333333'
    const source = normalizeEditorContent({
      type: 'doc',
      content: [
        { type: 'paragraph', attrs: { id: first }, content: [{ type: 'text', text: 'A' }] },
        { type: 'paragraph', attrs: { id: middle }, content: [{ type: 'text', text: 'B' }] },
        { type: 'paragraph', attrs: { id: last }, content: [{ type: 'text', text: 'C' }] },
      ],
    })
    const base = { patchId: 'patch', taskId: 'task', documentId: 'doc', blockId: first, targetBlockIds: [first], expectedVersion: 1, before: 'A', after: '改后', reason: '更新', accepted: true, operation: 'replace' as const }
    const result = applyAgentBlockPatches(source, [base], { documentId: 'doc', expectedVersion: 1 })
    expect(result.ok).toBe(true)
    expect(result.content?.content?.[0]?.attrs?.id).toBe(first)
    expect(result.content?.content?.[0]?.content?.[0]?.text).toBe('改后')
    expect(applyAgentBlockPatches(source, [{ ...base, targetBlockIds: [first, last], before: 'A\n\nC' }], { documentId: 'doc', expectedVersion: 1 }).ok).toBe(false)
  })
})
