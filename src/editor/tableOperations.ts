import { normalizeTableRows } from './structuredBlocks'

export interface TableCellAddress {
  row: number
  column: number
}

export interface TableCellRange {
  start: TableCellAddress
  end: TableCellAddress
}

export type TableSortDirection = 'ascending' | 'descending'

export function getTableColumnCount(rows: string[][]): number {
  return Math.max(1, ...rows.map((row) => row.length))
}

export function getTableCellLabel(address: TableCellAddress): string {
  return `${getTableColumnLabel(address.column)}${address.row + 1}`
}

export function getTableColumnLabel(index: number): string {
  let label = ''
  let value = Math.max(0, index) + 1

  while (value > 0) {
    value -= 1
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26)
  }

  return label
}

export function insertTableRow(rows: string[][], afterIndex: number): string[][] {
  const normalized = cloneRows(rows)
  const width = getTableColumnCount(normalized)
  const insertionIndex = clamp(afterIndex + 1, 0, normalized.length)
  normalized.splice(insertionIndex, 0, Array.from({ length: width }, () => ''))
  return normalized
}

export function duplicateTableRow(rows: string[][], rowIndex: number): string[][] {
  const normalized = cloneRows(rows)
  const sourceIndex = clamp(rowIndex, 0, normalized.length - 1)
  normalized.splice(sourceIndex + 1, 0, [...normalized[sourceIndex]])
  return normalized
}

export function insertTableColumn(rows: string[][], afterIndex: number): string[][] {
  const normalized = cloneRows(rows)
  const width = getTableColumnCount(normalized)
  const insertionIndex = clamp(afterIndex + 1, 0, width)

  return normalized.map((row) => {
    const nextRow = [...row]
    nextRow.splice(insertionIndex, 0, '')
    return nextRow
  })
}

export function removeTableRow(rows: string[][], rowIndex: number): string[][] {
  const normalized = cloneRows(rows)
  if (normalized.length <= 1) return normalized
  return normalized.filter((_, index) => index !== clamp(rowIndex, 0, normalized.length - 1))
}

export function removeTableColumn(rows: string[][], columnIndex: number): string[][] {
  const normalized = cloneRows(rows)
  const width = getTableColumnCount(normalized)
  if (width <= 1) return normalized
  const targetIndex = clamp(columnIndex, 0, width - 1)
  return normalized.map((row) => row.filter((_, index) => index !== targetIndex))
}

export function clearTableRange(rows: string[][], range: TableCellRange): string[][] {
  const normalized = cloneRows(rows)
  const width = getTableColumnCount(normalized)
  const startRow = clamp(Math.min(range.start.row, range.end.row), 0, normalized.length - 1)
  const endRow = clamp(Math.max(range.start.row, range.end.row), 0, normalized.length - 1)
  const startColumn = clamp(Math.min(range.start.column, range.end.column), 0, width - 1)
  const endColumn = clamp(Math.max(range.start.column, range.end.column), 0, width - 1)

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    for (let columnIndex = startColumn; columnIndex <= endColumn; columnIndex += 1) {
      normalized[rowIndex][columnIndex] = ''
    }
  }

  return normalized
}

export function sortTableRows(
  rows: string[][],
  columnIndex: number,
  direction: TableSortDirection,
): string[][] {
  const normalized = cloneRows(rows)
  if (normalized.length <= 2) return normalized

  const header = normalized[0]
  const records = normalized.slice(1)
  const collator = new Intl.Collator('zh-CN', {
    numeric: true,
    sensitivity: 'base',
  })
  const multiplier = direction === 'ascending' ? 1 : -1

  records.sort((left, right) => {
    const leftValue = left[columnIndex]?.trim() ?? ''
    const rightValue = right[columnIndex]?.trim() ?? ''
    if (leftValue === '' && rightValue !== '') return 1
    if (rightValue === '' && leftValue !== '') return -1
    return collator.compare(leftValue, rightValue) * multiplier
  })

  return [header, ...records]
}

export function findTableMatches(rows: string[][], query: string): TableCellAddress[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN')
  if (!normalizedQuery) return []

  const matches: TableCellAddress[] = []
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      if (cell.toLocaleLowerCase('zh-CN').includes(normalizedQuery)) {
        matches.push({ row: rowIndex, column: columnIndex })
      }
    })
  })
  return matches
}

function cloneRows(rows: string[][]): string[][] {
  return normalizeTableRows(rows).map((row) => [...row])
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}
