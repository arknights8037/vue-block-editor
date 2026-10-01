<script setup lang="ts">
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

import { getBlockIndentAttributes, INDENT_ATTRIBUTE } from './blockIndent'
import { BLOCK_ID_ATTRIBUTE } from './blockId'

interface BlockContainerNode {
  type: {
    name: string
  }
  attrs: {
    level?: number | null
    [BLOCK_ID_ATTRIBUTE]?: string | null
    textAlign?: string | null
    [INDENT_ATTRIBUTE]?: number | null
  }
}

const props = defineProps<{
  node: BlockContainerNode
}>()

const contentTag = computed(() => {
  if (props.node.type.name === 'heading') {
    return `h${props.node.attrs.level ?? 1}`
  }

  if (props.node.type.name === 'bulletList') {
    return 'ul'
  }

  if (props.node.type.name === 'orderedList') {
    return 'ol'
  }

  if (props.node.type.name === 'taskList') {
    return 'ul'
  }

  if (props.node.type.name === 'blockquote') {
    return 'blockquote'
  }

  return 'p'
})

const contentClass = computed(() => [
  'editor-block-container__content',
  `editor-block-container__content--${props.node.type.name}`,
])

const alignmentClass = computed(() => {
  const textAlign = props.node.attrs.textAlign
  return textAlign === 'left' || textAlign === 'center' || textAlign === 'right'
    ? `editor-block-container--align-${textAlign}`
    : undefined
})

const wrapperAttributes = computed(() =>
  getBlockIndentAttributes(props.node.attrs[INDENT_ATTRIBUTE]),
)

const nodeViewKey = computed(() => {
  const blockId = props.node.attrs[BLOCK_ID_ATTRIBUTE]
  return typeof blockId === 'string' && blockId.length > 0
    ? blockId
    : `${props.node.type.name}:${props.node.attrs.level ?? ''}`
})
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="editor-block-container"
    :class="alignmentClass"
    :data-node-view-key="nodeViewKey"
    v-bind="wrapperAttributes"
  >
    <NodeViewContent :key="nodeViewKey" :as="contentTag" :class="contentClass" />
  </NodeViewWrapper>
</template>
