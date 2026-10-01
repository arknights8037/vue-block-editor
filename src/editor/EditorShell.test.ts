import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { Node } from '@tiptap/core'

import EditorShell from './EditorShell.vue'
import type { TiptapDocumentJson } from '@/models/document'

const content: TiptapDocumentJson = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '协议测试' }],
    },
  ],
}

describe('EditorShell public contract', () => {
  it('runs a custom plugin block through the editable editor contract', async () => {
    const wrapper = mount(EditorShell, {
      props: {
        modelValue: content,
        plugins: [{
          id: 'editor-test-plugin',
          version: 1 as const,
          blocks: [{
            id: 'badge-block',
            title: 'Badge',
            node: Node.create({ name: 'badgeBlock', group: 'block', atom: true, addAttributes: () => ({ label: { default: '' } }), renderHTML: ({ node }) => ['div', { 'data-badge-block': '', 'data-label': node.attrs.label }] }),
          }],
        }],
      },
    })
    await flushPromises()
    const editor = (wrapper.vm as unknown as { editor: { commands: { insertContent: (content: unknown) => boolean }; getJSON: () => TiptapDocumentJson } }).editor
    editor.commands.insertContent({ type: 'badgeBlock', attrs: { label: 'custom' } })
    await flushPromises()
    expect(JSON.stringify(editor.getJSON())).toContain('badgeBlock')
    wrapper.unmount()
  })

  it('renders content in readonly mode without update events', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const wrapper = mount(EditorShell, {
      props: { modelValue: content, readonly: true },
    })
    await flushPromises()

    expect(wrapper.find('.editor-shell--readonly').exists()).toBe(true)
    expect(wrapper.text()).toContain('协议测试')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(warn.mock.calls.some(([message]) => String(message).includes('ContextMenuPortal'))).toBe(false)

    wrapper.unmount()
    warn.mockRestore()
  })

  it('updates the editor when the external model changes', async () => {
    const wrapper = mount(EditorShell, {
      props: { modelValue: content },
    })
    await flushPromises()

    await wrapper.setProps({
      modelValue: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '外部更新' }] }],
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('外部更新')
    expect(wrapper.text()).not.toContain('协议测试')

    wrapper.unmount()
  })

  it('renders a card block through the same editor contract', async () => {
    const wrapper = mount(EditorShell, {
      props: {
        modelValue: {
          type: 'doc',
          content: [
            {
              type: 'cardBlock',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '卡片内容' }] }],
            },
          ],
        },
        readonly: true,
      },
    })
    await flushPromises()

    expect(wrapper.find('.card-block').exists()).toBe(true)
    expect(wrapper.find('.card-block').text()).toContain('卡片内容')

    wrapper.unmount()
  })

  it('keeps disabled content but hides configured renderers', async () => {
    const wrapper = mount(EditorShell, {
      props: {
        modelValue: {
          type: 'doc',
          content: [
            {
              type: 'taskList',
              content: [{ type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: '隐藏任务' }] }] }],
            },
          ],
        },
        readonly: true,
        features: { hiddenBlocks: ['taskList'] },
      },
    })
    await flushPromises()

    const hiddenBlock = wrapper.find('.editor-block--hidden')
    expect(hiddenBlock.exists()).toBe(true)
    expect(hiddenBlock.text()).toContain('隐藏任务')

    wrapper.unmount()
  })
})

 describe('replacement integrity', () => {
  it('rejects invalid targets, retains IDs and returns command failure', async () => {
    const wrapper = mount(EditorShell, { props: { modelValue: { type: 'doc', content: ['A','B','C'].map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) } } })
    await flushPromises()
    const api = wrapper.vm
    const ids = api.getCurrentDocumentBlocks().map(b => b.id)
    const original = api.getJSON()
    expect(api.replaceBlocksWithMarkdown([ids[0],ids[0]], 'new')).toBe(false)
    expect(api.replaceBlocksWithMarkdown([ids[0],'missing'], 'new')).toBe(false)
    expect(api.replaceBlocksWithMarkdown([ids[0],ids[2]], 'new')).toBe(false)
    expect(api.getJSON()).toEqual(original)
    expect(api.replaceBlocksWithMarkdown([ids[0]], 'new')).toBe(true)
    expect(api.getCurrentDocumentBlocks()[0].id).toBe(ids[0])
    const chain = api.editor!.chain()
    vi.spyOn(chain, 'run').mockReturnValue(false)
    vi.spyOn(api.editor!, 'chain').mockReturnValue(chain)
    expect(api.replaceBlocksWithMarkdown([ids[0]], 'again')).toBe(false)
    vi.restoreAllMocks()
    wrapper.unmount()
  })
  it('rejects future versions passed directly as modelValue', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() => mount(EditorShell, { props: { modelValue: { type: 'doc', schemaVersion: 999 } } })).toThrow()
    expect(warn.mock.calls.some(([message]) => String(message).includes('ContextMenuPortal'))).toBe(false)
    warn.mockRestore()
  })
})
