import { getTableColumnCount, getTableColumnLabel } from './tableOperations'

export type TableFieldType =
  | 'text'
  | 'longText'
  | 'number'
  | 'date'
  | 'select'
  | 'multiSelect'
  | 'checkbox'
  | 'url'
  | 'email'

export interface TableField {
  id: string
  name: string
  type: TableFieldType
  description: string
  enumOptions: string[]
  enumPreset: string
  allowCustomOptions: boolean
}

export interface TableEnumPreset {
  key: string
  label: string
  options: string[]
}

export const TABLE_FIELD_TYPES: Array<{ value: TableFieldType; label: string }> = [
  { value: 'text', label: '文本' },
  { value: 'longText', label: '长文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'select', label: '单选枚举' },
  { value: 'multiSelect', label: '多选枚举' },
  { value: 'checkbox', label: '勾选' },
  { value: 'url', label: '链接' },
  { value: 'email', label: '邮箱' },
]

export const TABLE_ENUM_PRESETS: TableEnumPreset[] = [
  { key: 'status', label: '状态', options: ['未开始', '进行中', '阻塞', '已完成'] },
  { key: 'priority', label: '优先级', options: ['P0', 'P1', 'P2', 'P3'] },
  { key: 'yes-no', label: '是否', options: ['是', '否'] },
  { key: 'progress', label: '进度', options: ['0%', '25%', '50%', '75%', '100%'] },
  { key: 'score', label: '评分', options: ['1', '2', '3', '4', '5'] },
]

export function createDefaultTableField(index: number, name?: string): TableField {
  const fieldName = normalizeFieldName(name, `字段 ${getTableColumnLabel(index)}`)
  return {
    id: `field-${index}`,
    name: fieldName,
    type: 'text',
    description: '',
    enumOptions: [],
    enumPreset: '',
    allowCustomOptions: true,
  }
}

export function normalizeTableFields(value: unknown, rows: string[][]): TableField[] {
  const width = getTableColumnCount(rows)
  const values = Array.isArray(value) ? value : []

  return Array.from({ length: width }, (_, index) => normalizeTableField(values[index], rows, index))
}

export function applyTableFieldsToRows(rows: string[][], fields: TableField[]): string[][] {
  const width = Math.max(getTableColumnCount(rows), fields.length)
  return rows.map((row, rowIndex) =>
    Array.from({ length: width }, (_, columnIndex) => {
      if (rowIndex === 0) return fields[columnIndex]?.name ?? row[columnIndex] ?? ''
      return row[columnIndex] ?? ''
    }),
  )
}

export function syncTableFieldsFromHeader(fields: TableField[], headerRow: string[]): TableField[] {
  return fields.map((field, index) => ({
    ...field,
    name: normalizeFieldName(headerRow[index], field.name),
  }))
}

export function insertTableField(fields: TableField[], afterIndex: number): TableField[] {
  const nextFields = fields.map((field) => ({ ...field, enumOptions: [...field.enumOptions] }))
  const insertionIndex = Math.min(Math.max(afterIndex + 1, 0), fields.length)
  nextFields.splice(insertionIndex, 0, {
    ...createDefaultTableField(insertionIndex),
    id: `field-${Date.now().toString(36)}-${insertionIndex}`,
  })
  return nextFields
}

export function removeTableField(fields: TableField[], columnIndex: number): TableField[] {
  if (fields.length <= 1) return fields
  const targetIndex = Math.min(Math.max(columnIndex, 0), fields.length - 1)
  return fields.filter((_, index) => index !== targetIndex)
}

export function getTableFieldTypeLabel(type: TableFieldType): string {
  return TABLE_FIELD_TYPES.find((fieldType) => fieldType.value === type)?.label ?? '文本'
}

export function normalizeEnumOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? '').trim())
        .filter((item) => item.length > 0),
    ),
  )
}

function normalizeTableField(value: unknown, rows: string[][], index: number): TableField {
  const source = isRecord(value) ? value : {}
  const fallback = createDefaultTableField(index, rows[0]?.[index])
  const enumOptions = normalizeEnumOptions(source.enumOptions)
  const type = normalizeFieldType(source.type)

  return {
    id: normalizeFieldName(source.id, fallback.id),
    name: normalizeFieldName(source.name, fallback.name),
    type,
    description: typeof source.description === 'string' ? source.description : '',
    enumOptions,
    enumPreset: typeof source.enumPreset === 'string' ? source.enumPreset : '',
    allowCustomOptions:
      typeof source.allowCustomOptions === 'boolean' ? source.allowCustomOptions : true,
  }
}

function normalizeFieldType(value: unknown): TableFieldType {
  return TABLE_FIELD_TYPES.some((fieldType) => fieldType.value === value)
    ? (value as TableFieldType)
    : 'text'
}

function normalizeFieldName(value: unknown, fallback: string): string {
  const name = typeof value === 'string' ? value.trim() : ''
  return name.length > 0 ? name : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
