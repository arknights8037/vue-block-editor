<script setup lang="ts">
import { ref, toRef } from 'vue'

import NativeTableBody from './table/NativeTableBody.vue'
import NativeTableHeader from './table/NativeTableHeader.vue'
import NativeTableToolbar from './table/NativeTableToolbar.vue'
import { useTableEditor } from './composables/useTableEditor'
import type { TableField } from './tableFields'

const props = defineProps<{
  rows?: string[][] | null
  fields?: TableField[] | null
  readonly?: boolean
}>()

const emit = defineEmits<{
  update: [rows: string[][]]
  'update-fields': [fields: TableField[]]
}>()

const tableRoot = ref<HTMLElement | null>(null)

const {
  tableRows,
  tableFields,
  bodyRows,
  activeCell,
  updateCell,
  updateHeader,
  addRow,
  addColumn,
  removeRow,
  removeColumn,
  handleCellKeydown,
  handleCellPaste,
} = useTableEditor({
  rows: toRef(props, 'rows'),
  fields: toRef(props, 'fields'),
  readonly: toRef(props, 'readonly'),
  onUpdate: (rows) => emit('update', rows),
  onUpdateFields: (fields) => emit('update-fields', fields),
  root: tableRoot,
})

function setActiveCell(row: number, column: number): void {
  activeCell.value = { row, column }
}
</script>

<template>
  <div ref="tableRoot" class="vue-mute-table">
    <NativeTableToolbar
      :readonly="readonly"
      :row-count="tableRows.length"
      :column-count="tableRows[0]?.length ?? 0"
      @add-row="addRow()"
      @add-column="addColumn()"
      @remove-row="removeRow()"
      @remove-column="removeColumn()"
    />

    <div class="native-table__viewport">
      <table>
        <NativeTableHeader
          :fields="tableFields"
          :readonly="readonly"
          @update="updateHeader"
        />
        <NativeTableBody
          :rows="bodyRows"
          :readonly="readonly"
          :active-cell="activeCell"
          @cell-focus="setActiveCell"
          @cell-input="updateCell"
          @cell-keydown="handleCellKeydown"
          @cell-paste="handleCellPaste"
        />
      </table>
    </div>
  </div>
</template>
