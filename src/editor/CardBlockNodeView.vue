<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

import { getBlockIndentAttributes, INDENT_ATTRIBUTE } from './blockIndent'

const props = defineProps<{
  node: {
    attrs: {
      variant?: string | null
      [INDENT_ATTRIBUTE]?: number | null
    }
  }
  selected: boolean
}>()

const variant = computed(() => props.node.attrs.variant || 'card')
const wrapperAttributes = computed(() =>
  getBlockIndentAttributes(props.node.attrs[INDENT_ATTRIBUTE]),
)
</script>

<template>
  <NodeViewWrapper
    as="section"
    class="card-block markdown-card"
    :class="[`card-block--${variant}`, { 'card-block--selected': selected }]"
    v-bind="wrapperAttributes"
  >
    <NodeViewContent class="card-block__content" />
  </NodeViewWrapper>
</template>

