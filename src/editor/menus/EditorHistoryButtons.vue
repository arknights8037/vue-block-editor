<script setup lang="ts">
import { Redo2, Undo2 } from '@lucide/vue'
import { NButton, NButtonGroup, NIcon, NTooltip } from '@/ui'

defineProps<{ undo: () => void; redo: () => void }>()
</script>

<template>
  <NButtonGroup class="bubble-toolbar__history-buttons" role="group" aria-label="历史操作">
    <NTooltip trigger="hover"><template #trigger><NButton class="bubble-toolbar__button" size="small" quaternary circle aria-label="撤销" @click="undo"><template #icon><NIcon :size="16"><Undo2 /></NIcon></template></NButton></template>撤销</NTooltip>
    <NTooltip trigger="hover"><template #trigger><NButton class="bubble-toolbar__button" size="small" quaternary circle aria-label="重做" @click="redo"><template #icon><NIcon :size="16"><Redo2 /></NIcon></template></NButton></template>重做</NTooltip>
  </NButtonGroup>
</template>
