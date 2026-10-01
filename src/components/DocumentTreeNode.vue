<script setup lang="ts">
import { ChevronDown, ChevronRight, FileText } from '@lucide/vue'

import DocumentTreeContextMenu from './DocumentTreeContextMenu.vue'
import type { SidebarDocumentNode } from './documentTree'
import DocumentTreeNodeActions from './DocumentTreeNodeActions.vue'
import type { DocumentId, DocumentSummary } from '@/models/document'
import { NTooltip } from '@/ui'

defineOptions({ name: 'DocumentTreeNode' })

type BrowserDragEvent = InstanceType<typeof globalThis.DragEvent>

const props = withDefaults(
  defineProps<{
    node: SidebarDocumentNode
    currentDocumentId: DocumentId
    collapsedDocumentIds: Set<DocumentId>
    draggedArticleId: DocumentId | null
    busy: boolean
    depth?: number
  }>(),
  { depth: 0 },
)

const emit = defineEmits<{
  select: [documentId: DocumentId]
  toggle: [documentId: DocumentId]
  createChild: [documentId: DocumentId]
  properties: [document: DocumentSummary]
  rename: [document: DocumentSummary]
  delete: [document: DocumentSummary]
  dragStart: [payload: { event: BrowserDragEvent; document: DocumentSummary }]
  dragEnd: []
}>()

function displayTitle(document: DocumentSummary): string {
  const title = document.title.trim()
  return title.length > 0 ? title : '未命名文档'
}

function emitDocumentEvent(type: 'properties' | 'rename' | 'delete'): void {
  switch (type) {
    case 'properties':
      emit('properties', props.node.document)
      break
    case 'rename':
      emit('rename', props.node.document)
      break
    case 'delete':
      emit('delete', props.node.document)
      break
  }
}
</script>

<template>
  <DocumentTreeContextMenu
    :document="node.document"
    @create-child="emit('createChild', node.document.id)"
    @properties="emitDocumentEvent('properties')"
    @rename="emitDocumentEvent('rename')"
    @delete="emitDocumentEvent('delete')"
  >
    <template #trigger>
      <div
        class="document-list__item document-list__item--article document-list__item--tree"
        :class="{
          'document-list__item--active': node.document.id === currentDocumentId,
          'document-list__item--dragging': node.document.id === draggedArticleId,
        }"
        :style="{ '--document-tree-depth': depth }"
        draggable="true"
        @dragstart="emit('dragStart', { event: $event, document: node.document })"
        @dragend="emit('dragEnd')"
      >
        <button
          v-if="node.children.length > 0"
          type="button"
          class="document-list__toggle"
          :aria-label="collapsedDocumentIds.has(node.document.id) ? '展开子页面' : '收起子页面'"
          @click.stop="emit('toggle', node.document.id)"
        >
          <ChevronRight v-if="collapsedDocumentIds.has(node.document.id)" :size="14" />
          <ChevronDown v-else :size="14" />
        </button>
        <span v-else class="document-list__toggle-spacer" aria-hidden="true"></span>

        <button
          type="button"
          class="document-list__select"
          :disabled="busy"
          @click="emit('select', node.document.id)"
        >
          <FileText :size="16" />
          <span class="document-list__main">
            <NTooltip trigger="hover">
              <template #trigger>
                <span class="document-list__title">{{ displayTitle(node.document) }}</span>
              </template>
              {{ displayTitle(node.document) }}
            </NTooltip>
            <span v-if="node.children.length > 0" class="document-list__meta">
              {{ node.children.length }} 个子页面
            </span>
          </span>
        </button>

        <span class="document-list__actions document-list__actions--menu">
          <DocumentTreeNodeActions
            :document="node.document"
            :busy="busy"
            @create-child="emit('createChild', node.document.id)"
            @properties="emitDocumentEvent('properties')"
            @rename="emitDocumentEvent('rename')"
            @delete="emitDocumentEvent('delete')"
          />
        </span>
      </div>
    </template>
  </DocumentTreeContextMenu>

  <div v-if="node.children.length > 0 && !collapsedDocumentIds.has(node.document.id)">
    <DocumentTreeNode
      v-for="child in node.children"
      :key="child.document.id"
      :node="child"
      :current-document-id="currentDocumentId"
      :collapsed-document-ids="collapsedDocumentIds"
      :dragged-article-id="draggedArticleId"
      :busy="busy"
      :depth="depth + 1"
      @select="emit('select', $event)"
      @toggle="emit('toggle', $event)"
      @create-child="emit('createChild', $event)"
      @properties="emit('properties', $event)"
      @rename="emit('rename', $event)"
      @delete="emit('delete', $event)"
      @drag-start="emit('dragStart', $event)"
      @drag-end="emit('dragEnd')"
    />
  </div>
</template>
