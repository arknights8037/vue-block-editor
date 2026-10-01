<script setup lang="ts">
import { Bold, Code, Italic, Link, Strikethrough, Subscript, Superscript, Underline } from '@lucide/vue'
import { NButton, NButtonGroup, NIcon, NTooltip } from '@/ui'

const props = defineProps<{ active: (name: string) => boolean; commands: Record<string, () => void> }>()
const buttons = [
  ['bold', '粗体', Bold], ['italic', '斜体', Italic], ['strike', '删除线', Strikethrough],
  ['underline', '下划线', Underline], ['code', '行内代码', Code], ['subscript', '下标（Ctrl+,）', Subscript],
  ['superscript', '上标（Ctrl+.）', Superscript], ['link', '链接', Link],
] as const
</script>

<template>
  <NButtonGroup class="bubble-toolbar__mark-buttons" role="group" aria-label="行内格式">
    <NTooltip v-for="([name, label, icon]) in buttons" :key="name" trigger="hover">
      <template #trigger>
        <NButton class="bubble-toolbar__button" :class="{ 'bubble-toolbar__button--active': props.active(name) }" size="small" quaternary circle :aria-label="label" @click="props.commands[name]">
          <template #icon><NIcon :size="16"><component :is="icon" /></NIcon></template>
        </NButton>
      </template>{{ label }}
    </NTooltip>
  </NButtonGroup>
</template>
