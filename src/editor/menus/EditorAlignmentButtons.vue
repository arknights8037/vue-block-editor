<script setup lang="ts">
import { AlignCenter, AlignLeft, AlignRight } from '@lucide/vue'
import { NButton, NButtonGroup, NIcon, NTooltip } from '@/ui'

const props = defineProps<{ active: (value: 'left' | 'center' | 'right') => boolean; set: (value: 'left' | 'center' | 'right') => void }>()
const items = [['left', '左对齐', AlignLeft], ['center', '居中对齐', AlignCenter], ['right', '右对齐', AlignRight]] as const
</script>

<template>
  <NButtonGroup class="bubble-toolbar__alignment-buttons" role="group" aria-label="段落对齐">
    <NTooltip v-for="([value, label, icon]) in items" :key="value" trigger="hover">
      <template #trigger><NButton class="bubble-toolbar__button" :class="{ 'bubble-toolbar__button--active': props.active(value) }" size="small" quaternary circle :aria-label="label" @mousedown.prevent @click="props.set(value)"><template #icon><NIcon :size="16"><component :is="icon" /></NIcon></template></NButton></template>{{ label }}
    </NTooltip>
  </NButtonGroup>
</template>
