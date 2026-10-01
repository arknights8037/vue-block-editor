<script setup lang="ts">
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

import { getBlockIndentAttributes, INDENT_ATTRIBUTE } from './blockIndent'

const props = defineProps<{
  node: {
    attrs: {
      [INDENT_ATTRIBUTE]?: number | null
    }
  }
}>()

const wrapperAttributes = computed(() => getBlockIndentAttributes(props.node.attrs[INDENT_ATTRIBUTE]))
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="editor-block-container editor-block-container--horizontal-rule"
    v-bind="wrapperAttributes"
  >
    <hr class="editor-block-container__content editor-block-container__content--horizontal-rule" contenteditable="false" />
  </NodeViewWrapper>
</template>
