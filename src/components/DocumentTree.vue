<script setup lang="ts">
import type { SidebarDocumentNode } from './documentTree'
import DocumentTreeNode from './DocumentTreeNode.vue'
import type { DocumentId, DocumentSummary } from '@/models/document'

defineOptions({ name: 'DocumentTree' })

type BrowserDragEvent = InstanceType<typeof globalThis.DragEvent>

const props = withDefaults(
  defineProps<{
    nodes: SidebarDocumentNode[]
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
</script>

<template>
  <DocumentTreeNode
    v-for="node in props.nodes"
    :key="node.document.id"
    :node="node"
    :current-document-id="props.currentDocumentId"
    :collapsed-document-ids="props.collapsedDocumentIds"
    :dragged-article-id="props.draggedArticleId"
    :busy="props.busy"
    :depth="props.depth"
    @select="emit('select', $event)"
    @toggle="emit('toggle', $event)"
    @create-child="emit('createChild', $event)"
    @properties="emit('properties', $event)"
    @rename="emit('rename', $event)"
    @delete="emit('delete', $event)"
    @drag-start="emit('dragStart', $event)"
    @drag-end="emit('dragEnd')"
  />
</template>
