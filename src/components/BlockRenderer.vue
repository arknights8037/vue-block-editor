<script setup lang="ts">
import type { Component } from 'vue'
import type { TiptapDocumentJson } from '@/models/document'
import type { AppSettings } from '@/models/settings'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPlugin, EditorPluginRegistry } from '@/plugins'
import DocumentRenderer from './DocumentRenderer.vue'

const props = withDefaults(
  defineProps<{
    content?: TiptapDocumentJson
    settings?: AppSettings
    ariaLabel?: string
    internalDocuments?: Array<{ id: string; title: string }>
    features?: EditorFeatureOptions
    plugins?: readonly EditorPlugin[]
    pluginRegistry?: EditorPluginRegistry
    renderers?: Record<string, Component>
  }>(),
  {
    content: undefined,
    settings: undefined,
    ariaLabel: 'Document content',
    internalDocuments: () => [],
    features: () => ({}),
    plugins: () => [],
    pluginRegistry: undefined,
    renderers: () => ({}),
  },
)

const emit = defineEmits<{
  openDocument: [documentId: string, blockId?: string]
}>()

function handleOpenDocument(documentId: string, blockId?: string): void {
  emit('openDocument', documentId, blockId)
}
</script>

<template>
  <DocumentRenderer
    :content="content"
    :aria-label="ariaLabel"
    :features="features"
    :plugins="plugins"
    :plugin-registry="pluginRegistry"
    :renderers="renderers"
    @open-document="handleOpenDocument"
  />
</template>
