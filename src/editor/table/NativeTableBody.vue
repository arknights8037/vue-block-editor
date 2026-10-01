<script setup lang="ts">
import type { TableCellPosition } from '../composables/useTableEditor'

defineProps<{
  rows: string[][]
  readonly?: boolean
  activeCell: TableCellPosition | null
}>()

defineEmits<{
  'cell-focus': [rowIndex: number, columnIndex: number]
  'cell-input': [rowIndex: number, columnIndex: number, value: string]
  'cell-keydown': [event: KeyboardEvent, rowIndex: number, columnIndex: number]
  'cell-paste': [event: ClipboardEvent, rowIndex: number, columnIndex: number]
}>()
</script>

<template>
  <tbody>
    <tr v-for="(row, bodyRowIndex) in rows" :key="bodyRowIndex">
      <td
        v-for="(cell, columnIndex) in row"
        :key="columnIndex"
        :class="{
          'native-table__cell--active':
            activeCell?.row === bodyRowIndex + 1 && activeCell?.column === columnIndex,
        }"
      >
        <textarea
          v-if="!readonly"
          :data-vue-mute-cell="`${bodyRowIndex + 1}:${columnIndex}`"
          :value="cell"
          rows="1"
          spellcheck="false"
          :aria-label="`表格 ${bodyRowIndex + 2} 行 ${columnIndex + 1} 列`"
          @focus="$emit('cell-focus', bodyRowIndex + 1, columnIndex)"
          @input="
            $emit('cell-input', bodyRowIndex + 1, columnIndex, ($event.target as HTMLTextAreaElement).value)
          "
          @keydown="$emit('cell-keydown', $event, bodyRowIndex + 1, columnIndex)"
          @paste="$emit('cell-paste', $event, bodyRowIndex + 1, columnIndex)"
        ></textarea>
        <span v-else class="native-table__readonly-cell">{{ cell }}</span>
      </td>
    </tr>
  </tbody>
</template>
