<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'
import { computed, markRaw, toRaw } from 'vue'
import type { Component } from 'vue'

import type { TiptapDocumentJson } from '@/models/document'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPlugin, EditorPluginRegistry } from '@/plugins'
import { createEditorPluginRegistry } from '@/plugins'
import { normalizeEditorContent } from '@/document/documentContent'
import { parseInternalDocumentHref } from '@/models/documentLink'
import { resolveRendererSegments, type RendererSegment } from './rendererResolver'

const props = withDefaults(defineProps<{
  content?: TiptapDocumentJson
  features?: EditorFeatureOptions
  plugins?: readonly EditorPlugin[]
  pluginRegistry?: EditorPluginRegistry
  renderers?: Record<string, Component>
  ariaLabel?: string
}>(), {
  content: undefined,
  features: () => ({}),
  plugins: () => [],
  pluginRegistry: undefined,
  renderers: () => ({}),
  ariaLabel: 'Document content',
})

const emit = defineEmits<{ openDocument: [documentId: string, blockId?: string] }>()
const registry = computed(() => props.pluginRegistry ?? createEditorPluginRegistry(props.plugins ?? []))
const normalized = computed(() => normalizeEditorContent(props.content))
const segments = computed(() => resolveRendererSegments(
  normalized.value,
  props.features,
  registry.value,
  props.renderers,
).map((segment) => segment.component
  ? { ...segment, component: markRaw(toRaw(segment.component)) }
  : segment))

function handleClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const anchor = target.closest('a')
  const parsed = parseInternalDocumentHref(anchor?.getAttribute('href') ?? '')
  if (!parsed) return
  event.preventDefault()
  emit('openDocument', parsed.documentId, parsed.blockId)
}

function customComponentProps(node: JSONContent) {
  return { node, attrs: node.attrs ?? {}, content: node.content ?? [], readonly: true }
}

</script>

<template>
  <div class="document-renderer" :aria-label="ariaLabel" @click="handleClick">
    <div
      v-for="entry in segments"
      :key="entry.node.attrs?.id ?? entry.index"
      class="document-renderer__segment"
    >
      <component
        v-if="entry.component"
        :is="entry.component"
        class="document-renderer__custom-block"
        v-bind="customComponentProps(entry.node)"
      />
      <div v-else class="document-renderer__content" v-html="entry.html" />
    </div>
  </div>
</template>

