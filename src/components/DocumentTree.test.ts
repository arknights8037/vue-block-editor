import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DocumentTreeNode from './DocumentTreeNode.vue'
import type { SidebarDocumentNode } from './documentTree'

const summary = (id: string, title: string, parentId: string | null) => ({
  id, title, documentKind: 'article' as const, parentId,
  tags: [], sourceUrl: '', author: '', description: '', plainText: '',
  revision: 1, sortOrder: 0, isDeleted: false, createdAt: 0, updatedAt: 0,
})

const root: SidebarDocumentNode = {
  document: summary('root', '根页面', null),
  children: [
    {
      document: summary('child', '子页面', 'root'),
      children: [],
    },
  ],
}

describe('DocumentTreeNode', () => {
  it('renders recursive children and forwards node actions with document ids', async () => {
    const wrapper = mount(DocumentTreeNode, {
      props: {
        node: root,
        currentDocumentId: 'root',
        collapsedDocumentIds: new Set<string>(),
        draggedArticleId: null,
        busy: false,
      },
      global: {
        stubs: {
          DocumentTreeContextMenu: {
            template: '<div><slot name="trigger" /><slot name="content" /></div>',
          },
          DocumentTreeNodeActions: {
            emits: ['createChild', 'properties', 'rename', 'delete'],
            template: '<button class="node-action" @click="$emit(\'createChild\')" />',
          },
          NTooltip: { template: '<span><slot name="trigger" /><slot /></span>' },
        },
      },
    })

    expect(wrapper.findAll('.document-list__item')).toHaveLength(2)

    await wrapper.find('.document-list__select').trigger('click')
    expect(wrapper.emitted('select')).toEqual([['root']])

    await wrapper.find('.node-action').trigger('click')
    expect(wrapper.emitted('createChild')).toEqual([['root']])
  })
})
