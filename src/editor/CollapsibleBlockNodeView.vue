<script setup lang="ts">
import { ChevronRight } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import { computed } from 'vue'

import { getBlockIndentAttributes, INDENT_ATTRIBUTE } from './blockIndent'
import {
  getCollapsibleHeadingTitle,
  normalizeHeadingLevel,
  type HeadingLevel,
} from './headingLevels'

interface CollapsibleNode {
  attrs: {
    title?: string | null
    collapsed?: boolean | null
    headingLevel?: number | null
    variant?: string | null
    [INDENT_ATTRIBUTE]?: number | null
  }
}

const props = defineProps<{
  node: CollapsibleNode
  selected: boolean
  updateAttributes: (attributes: Record<string, unknown>) => void
}>()

const title = computed(() => props.node.attrs.title || defaultTitle.value)
const collapsed = computed(() => props.node.attrs.collapsed === true)
const headingLevel = computed<HeadingLevel>(() =>
  normalizeHeadingLevel(props.node.attrs.headingLevel),
)
const isHeading = computed(() => props.node.attrs.variant !== 'list')
const toggleLabel = computed(() => (collapsed.value ? '展开折叠块' : '收起折叠块'))
const defaultTitle = computed(() =>
  isHeading.value ? getCollapsibleHeadingTitle(headingLevel.value) : '可折叠列表',
)
const wrapperAttributes = computed(() =>
  getBlockIndentAttributes(props.node.attrs[INDENT_ATTRIBUTE]),
)

function toggleCollapsed(): void {
  props.updateAttributes({ collapsed: !collapsed.value })
}

function toggleFromSummary(event: InstanceType<typeof globalThis.MouseEvent>): void {
  if (event.target instanceof globalThis.HTMLInputElement) {
    return
  }

  toggleCollapsed()
}

function updateTitle(event: InstanceType<typeof globalThis.Event>): void {
  const input = event.target as InstanceType<typeof globalThis.HTMLInputElement>
  props.updateAttributes({ title: input.value })
}
</script>

<template>
  <NodeViewWrapper
    as="section"
    class="collapsible-block"
    :class="{
      'collapsible-block--collapsed': collapsed,
      'collapsible-block--selected': selected,
      [`collapsible-block--${node.attrs.variant || 'heading'}`]: true,
      [`collapsible-block--heading-${headingLevel}`]: isHeading,
    }"
    :data-heading-level="isHeading ? headingLevel : undefined"
    v-bind="wrapperAttributes"
  >
    <div class="collapsible-block__summary" contenteditable="false" @click="toggleFromSummary">
      <button
        type="button"
        class="collapsible-block__toggle"
        :aria-label="toggleLabel"
        :aria-expanded="!collapsed"
        :title="toggleLabel"
        @click.stop="toggleCollapsed"
      >
        <ChevronRight :size="16" />
      </button>
      <input
        class="collapsible-block__title"
        :value="title"
        :placeholder="defaultTitle"
        aria-label="折叠块标题"
        @input="updateTitle"
      />
    </div>

    <NodeViewContent v-show="!collapsed" class="collapsible-block__content" />
  </NodeViewWrapper>
</template>
