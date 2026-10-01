import { computed, nextTick, ref, type Ref } from 'vue'

import { createDefaultTableRows, normalizeTableRows } from '../structuredBlocks'
import { normalizeTableFields, type TableField } from '../tableFields'

export interface UseTableEditorOptions {
  rows: Ref<string[][] | null | undefined>
  fields: Ref<TableField[] | null | undefined>
  readonly: Ref<boolean | undefined>
  onUpdate: (rows: string[][]) => void
  onUpdateFields: (fields: TableField[]) => void
  root?: Ref<HTMLElement | null>
}

export interface TableCellPosition {
  row: number
  column: number
}

export function useTableEditor(options: UseTableEditorOptions) {
  const tableRows = computed(() => normalizeRows(options.rows.value))
  const tableFields = computed(() => normalizeTableFields(options.fields.value, tableRows.value))
  const bodyRows = computed(() => tableRows.value.slice(1))
  const activeCell = ref<TableCellPosition | null>(null)

  function updateRows(nextRows: string[][]): void {
    options.onUpdate(normalizeTableRows(nextRows))
  }

  function updateCell(rowIndex: number, columnIndex: number, value: string): void {
    if (options.readonly.value) return
    const nextRows = tableRows.value.map((row) => [...row])
    if (!nextRows[rowIndex]) return
    nextRows[rowIndex][columnIndex] = value
    updateRows(nextRows)
  }

  function updateHeader(columnIndex: number, value: string): void {
    if (options.readonly.value) return
    const nextRows = tableRows.value.map((row) => [...row])
    if (!nextRows[0]) return
    nextRows[0][columnIndex] = value
    options.onUpdate(normalizeTableRows(nextRows))
    options.onUpdateFields(
      tableFields.value.map((field, index) =>
        index === columnIndex ? { ...field, name: value.trim() || field.name } : field,
      ),
    )
  }

  function addRow(afterIndex = tableRows.value.length - 1): void {
    if (options.readonly.value) return
    const columnCount = tableRows.value[0]?.length ?? 2
    const nextRows = tableRows.value.map((row) => [...row])
    nextRows.splice(afterIndex + 1, 0, Array.from({ length: columnCount }, () => ''))
    updateRows(nextRows)
    void focusCell(afterIndex + 1, 0)
  }

  function addColumn(afterIndex = (tableRows.value[0]?.length ?? 1) - 1): void {
    if (options.readonly.value) return
    const nextRows = tableRows.value.map((row) => {
      const nextRow = [...row]
      nextRow.splice(afterIndex + 1, 0, '')
      return nextRow
    })
    updateRows(nextRows)
    void focusCell(0, afterIndex + 1)
  }

  function removeRow(rowIndex = tableRows.value.length - 1): void {
    if (options.readonly.value || tableRows.value.length <= 1) return
    const nextRows = tableRows.value.filter((_, index) => index !== rowIndex)
    updateRows(nextRows)
    void focusCell(Math.max(rowIndex - 1, 0), 0)
  }

  function removeColumn(columnIndex = (tableRows.value[0]?.length ?? 1) - 1): void {
    if (options.readonly.value || (tableRows.value[0]?.length ?? 0) <= 1) return
    updateRows(tableRows.value.map((row) => row.filter((_, index) => index !== columnIndex)))
    void focusCell(0, Math.max(columnIndex - 1, 0))
  }

  function handleCellKeydown(event: KeyboardEvent, rowIndex: number, columnIndex: number): void {
    if (event.key === 'Tab') {
      event.preventDefault()
      const delta = event.shiftKey ? -1 : 1
      focusLinearCell(rowIndex, columnIndex, delta)
      return
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (rowIndex === tableRows.value.length - 1) {
        addRow(rowIndex)
      } else {
        void focusCell(rowIndex + 1, columnIndex)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      void focusCell(Math.max(rowIndex - 1, 0), columnIndex)
      return
    }

    if (event.key === 'ArrowDown') {
      void focusCell(Math.min(rowIndex + 1, tableRows.value.length - 1), columnIndex)
    }
  }

  function handleCellPaste(event: ClipboardEvent, rowIndex: number, columnIndex: number): void {
    const text = event.clipboardData?.getData('text/plain') ?? ''
    if (!text.includes('\t') && !text.includes('\n')) return

    event.preventDefault()
    const pastedRows = text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .filter((row, index, rows) => row.length > 0 || index < rows.length - 1)
      .map((row) => row.split('\t'))

    if (pastedRows.length === 0) return

    const width = Math.max(tableRows.value[0]?.length ?? 1, columnIndex + pastedRows[0].length)
    const nextRows = tableRows.value.map((row) => padRow(row, width))

    for (let rowOffset = 0; rowOffset < pastedRows.length; rowOffset += 1) {
      const targetRowIndex = rowIndex + rowOffset
      if (!nextRows[targetRowIndex]) {
        nextRows[targetRowIndex] = Array.from({ length: width }, () => '')
      }

      pastedRows[rowOffset].forEach((cell, cellOffset) => {
        nextRows[targetRowIndex][columnIndex + cellOffset] = cell
      })
    }

    updateRows(nextRows)
  }

  function focusLinearCell(rowIndex: number, columnIndex: number, delta: 1 | -1): void {
    const columnCount = tableRows.value[0]?.length ?? 1
    const cellCount = tableRows.value.length * columnCount
    let nextIndex = rowIndex * columnCount + columnIndex + delta

    if (nextIndex >= cellCount) {
      addRow(tableRows.value.length - 1)
      nextIndex = cellCount
    }

    if (nextIndex < 0) nextIndex = 0
    void focusCell(Math.floor(nextIndex / columnCount), nextIndex % columnCount)
  }

  async function focusCell(rowIndex: number, columnIndex: number): Promise<void> {
    activeCell.value = { row: rowIndex, column: columnIndex }
    await nextTick()
    const selector = `[data-vue-mute-cell="${rowIndex}:${columnIndex}"]`
    const element = (options.root?.value ?? globalThis.document).querySelector(selector)
    if (element instanceof globalThis.HTMLTextAreaElement) {
      element.focus()
      element.select()
    }
  }

  return {
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
    focusCell,
    focusLinearCell,
  }
}

export function normalizeRows(value: unknown): string[][] {
  const normalizedRows = normalizeTableRows(value)
  return normalizedRows.length > 0 ? normalizedRows : createDefaultTableRows()
}

function padRow(row: string[], width: number): string[] {
  return Array.from({ length: width }, (_, index) => row[index] ?? '')
}
