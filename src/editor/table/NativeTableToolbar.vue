<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'

defineProps<{
  readonly?: boolean
  rowCount: number
  columnCount: number
}>()

defineEmits<{
  addRow: []
  addColumn: []
  removeRow: []
  removeColumn: []
}>()
</script>

<template>
  <div v-if="!readonly" class="native-table__toolbar">
    <span>TABLE</span>
    <button type="button" @click="$emit('addRow')"><Plus :size="14" /> 行</button>
    <button type="button" @click="$emit('addColumn')"><Plus :size="14" /> 列</button>
    <button type="button" :disabled="rowCount <= 1" @click="$emit('removeRow')">
      <Trash2 :size="14" /> 行
    </button>
    <button type="button" :disabled="columnCount <= 1" @click="$emit('removeColumn')">
      <Trash2 :size="14" /> 列
    </button>
  </div>
</template>
