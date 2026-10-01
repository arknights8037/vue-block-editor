<script setup lang="ts">
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/vue-3/menus'

defineProps<{
  editor: Editor
  shouldShow: (props: any) => boolean
  appendTo: HTMLElement | (() => HTMLElement)
  options: Record<string, unknown>
}>()
</script>

<template>
  <BubbleMenu class="bubble-menu-layer" :editor="editor" :should-show="shouldShow" :append-to="appendTo" :options="options" plugin-key="format-bubble-menu">
    <slot />
  </BubbleMenu>
</template>
