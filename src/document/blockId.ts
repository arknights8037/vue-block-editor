import type { UniqueIDGenerationContext } from '@tiptap/extension-unique-id'
import type { JSONContent } from '@tiptap/vue-3'

import { DOCUMENT_SCHEMA_VERSION, type TiptapDocumentJson } from '@/models/document'

export const NODE_ID_ATTRIBUTE = 'id'
export const LEGACY_BLOCK_ID_ATTRIBUTE = 'blockId'
export const BLOCK_ID_ATTRIBUTE = NODE_ID_ATTRIBUTE

export const NODE_ID_NODE_TYPES = [
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'imageFigure',
  'attachmentBlock',
  'tableBlock',
  'mathBlock',
  'collapsibleBlock',
  'cardBlock',
] as const

export const BLOCK_ID_NODE_TYPES = NODE_ID_NODE_TYPES

export type NodeIdNodeType = (typeof NODE_ID_NODE_TYPES)[number]
export type BlockIdNodeType = NodeIdNodeType

export interface MigrationResult {
  document: TiptapDocumentJson
  changed: boolean
  generatedIds: number
  migratedLegacyIds: number
  duplicateIdsFixed: number
  warnings: string[]
}

export interface ValidationResult {
  valid: boolean
  duplicateIds: string[]
  missingIds: Array<{
    type: string
    path: string
  }>
  legacyBlockIds: Array<{
    value: string
    path: string
  }>
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LEGACY_UUID_SUFFIX_PATTERN =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i

export function extractUuidFromLegacyId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.match(LEGACY_UUID_SUFFIX_PATTERN)?.[1]?.toLowerCase()
}

export function isValidNodeId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function generateNodeId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    const value = character === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

export function generateBlockId(_context?: UniqueIDGenerationContext): string {
  void _context
  return generateNodeId()
}

export function migrateDocumentNodeIds(document: unknown): MigrationResult {
  if (isRecord(document) && document.schemaVersion !== undefined) {
    const version = document.schemaVersion
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 0 || version > DOCUMENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported document schema version: ${String(version)}`)
    }
  }
  const counters = createMigrationCounters()
  const seenIds = new Set<string>()
  const migrated = migrateNode(document, 'root', seenIds, counters)

  if (!isDocumentJson(migrated.node)) {
    return {
      document: normalizeDocumentShape(migrated.node),
      changed: true,
      generatedIds: counters.generatedIds,
      migratedLegacyIds: counters.migratedLegacyIds,
      duplicateIdsFixed: counters.duplicateIdsFixed,
      warnings: ['Input was not a valid Tiptap doc node; created an empty document.'],
    }
  }

  return {
    document: migrated.node,
    changed: migrated.changed,
    generatedIds: counters.generatedIds,
    migratedLegacyIds: counters.migratedLegacyIds,
    duplicateIdsFixed: counters.duplicateIdsFixed,
    warnings: counters.warnings,
  }
}

export function normalizeDocumentNodeIds(document: TiptapDocumentJson): TiptapDocumentJson {
  return migrateDocumentNodeIds(document).document
}

export function ensureTopLevelBlockIds(content: TiptapDocumentJson): TiptapDocumentJson {
  return normalizeDocumentNodeIds(content)
}

export function validateDocumentNodeIds(document: unknown): ValidationResult {
  const seenPathsById = new Map<string, string[]>()
  const missingIds: ValidationResult['missingIds'] = []
  const legacyBlockIds: ValidationResult['legacyBlockIds'] = []

  visitNode(document, 'root', (node, path) => {
    if (!isNodeRecord(node)) return

    if (isAddressableNode(node)) {
      const id = readNodeId(node)
      if (!isValidNodeId(id)) {
        missingIds.push({ type: node.type ?? 'unknown', path })
      } else {
        seenPathsById.set(id, [...(seenPathsById.get(id) ?? []), path])
      }
    }

    const legacyBlockId = readLegacyBlockId(node)
    if (typeof legacyBlockId === 'string') {
      legacyBlockIds.push({
        value: legacyBlockId,
        path: `${path}.attrs.${LEGACY_BLOCK_ID_ATTRIBUTE}`,
      })
    }
  })

  const duplicateIds = Array.from(seenPathsById.entries())
    .filter(([, paths]) => paths.length > 1)
    .map(([id]) => id)

  return {
    valid: duplicateIds.length === 0 && missingIds.length === 0 && legacyBlockIds.length === 0,
    duplicateIds,
    missingIds,
    legacyBlockIds,
  }
}

export function cloneNodeWithFreshIds<T extends JSONContent>(node: T): T {
  return cloneNodeFresh(node) as T
}

function cloneNodeFresh(node: JSONContent): JSONContent {
  const clonedChildren = node.content?.map((child) => cloneNodeFresh(child))
  const attrs = isRecord(node.attrs) ? { ...node.attrs } : undefined
  const nodeWithoutTopLevelId = omitTopLevelId(node)
  if (attrs) {
    delete attrs[LEGACY_BLOCK_ID_ATTRIBUTE]
  }

  if (isAddressableNode(node)) {
    const nextAttrs = {
      ...(attrs ?? {}),
      [NODE_ID_ATTRIBUTE]: generateNodeId(),
    }
    return omitUndefinedFields({
      ...nodeWithoutTopLevelId,
      attrs: nextAttrs,
      content: clonedChildren,
    })
  }

  return omitUndefinedFields({
    ...nodeWithoutTopLevelId,
    attrs: omitEmptyAttrs(attrs),
    content: clonedChildren,
  })
}

interface MigrationCounters {
  generatedIds: number
  migratedLegacyIds: number
  duplicateIdsFixed: number
  warnings: string[]
}

interface MigratedNode {
  node: JSONContent
  changed: boolean
}

function createMigrationCounters(): MigrationCounters {
  return {
    generatedIds: 0,
    migratedLegacyIds: 0,
    duplicateIdsFixed: 0,
    warnings: [],
  }
}

function migrateNode(
  value: unknown,
  path: string,
  seenIds: Set<string>,
  counters: MigrationCounters,
): MigratedNode {
  if (!isNodeRecord(value)) {
    counters.warnings.push(`Skipped non-node value at ${path}.`)
    return { node: {}, changed: true }
  }

  let changed = false
  const node = { ...value } as JSONContent
  const migratedChildren = Array.isArray(value.content)
    ? value.content.map((child, index) =>
        migrateNode(child, appendContentPath(path, index), seenIds, counters),
      )
    : undefined

  if (migratedChildren) {
    const nextContent = migratedChildren.map((child) => child.node)
    if (
      migratedChildren.some((child) => child.changed) ||
      nextContent.length !== node.content?.length
    ) {
      changed = true
    }
    node.content = nextContent
  }

  if (isAddressableNode(node)) {
    const existingId = readNodeId(node)
    const topLevelId = readTopLevelNodeId(node)
    const legacyBlockId = readLegacyBlockId(node)
    const legacyUuid = extractUuidFromLegacyId(legacyBlockId)
    const existingLegacyUuid = extractUuidFromLegacyId(existingId)
    let nextId = resolveExistingNodeId(existingId, topLevelId, existingLegacyUuid, legacyUuid)

    if (!nextId) {
      nextId = generateUniqueNodeId(seenIds)
      counters.generatedIds += 1
      changed = true
    } else if (!isValidNodeId(existingId) && (existingLegacyUuid || legacyUuid)) {
      counters.migratedLegacyIds += 1
      changed = true
    }

    if (seenIds.has(nextId)) {
      nextId = generateUniqueNodeId(seenIds)
      counters.duplicateIdsFixed += 1
      changed = true
    }
    seenIds.add(nextId)

    const attrs = isRecord(node.attrs) ? { ...node.attrs } : {}
    if (attrs[NODE_ID_ATTRIBUTE] !== nextId) {
      attrs[NODE_ID_ATTRIBUTE] = nextId
      changed = true
    }
    if (LEGACY_BLOCK_ID_ATTRIBUTE in attrs) {
      delete attrs[LEGACY_BLOCK_ID_ATTRIBUTE]
      changed = true
    }
    node.attrs = attrs

    if ('id' in node) {
      delete (node as JSONContent & { id?: unknown }).id
      changed = true
    }
  } else if (isRecord(node.attrs) && LEGACY_BLOCK_ID_ATTRIBUTE in node.attrs) {
    const attrs = { ...node.attrs }
    delete attrs[LEGACY_BLOCK_ID_ATTRIBUTE]
    node.attrs = omitEmptyAttrs(attrs)
    changed = true
  }

  if (node.type === 'text' && 'id' in node) {
    delete (node as JSONContent & { id?: unknown }).id
    changed = true
  }

  if (node.type === 'doc') {
    const documentNode = node as JSONContent & { schemaVersion?: unknown }
    if (documentNode.schemaVersion !== DOCUMENT_SCHEMA_VERSION) {
      documentNode.schemaVersion = DOCUMENT_SCHEMA_VERSION
      changed = true
    }
  }

  node.attrs = omitEmptyAttrs(node.attrs)
  return { node: omitUndefinedFields(node), changed }
}

function generateUniqueNodeId(seenIds: Set<string>): string {
  let id = generateNodeId()
  while (seenIds.has(id)) {
    id = generateNodeId()
  }
  return id
}

function normalizeDocumentShape(value: JSONContent): TiptapDocumentJson {
  if (isDocumentJson(value)) return value

  return normalizeDocumentNodeIds({
    type: 'doc',
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
    content: [{ type: 'paragraph' }],
  })
}

function visitNode(
  value: unknown,
  path: string,
  visitor: (node: unknown, path: string) => void,
): void {
  visitor(value, path)
  if (!isRecord(value) || !Array.isArray(value.content)) return

  value.content.forEach((child, index) => {
    visitNode(child, appendContentPath(path, index), visitor)
  })
}

function appendContentPath(path: string, index: number): string {
  return path === 'root' ? `content[${index}]` : `${path}.content[${index}]`
}

function isDocumentJson(value: JSONContent): value is TiptapDocumentJson {
  return value.type === 'doc'
}

function isNodeRecord(value: unknown): value is JSONContent {
  return isRecord(value) && typeof value.type === 'string'
}

function isAddressableNode(node: JSONContent): boolean {
  return typeof node.type === 'string' && node.type !== 'text'
}

function readNodeId(node: JSONContent): unknown {
  return isRecord(node.attrs) ? node.attrs[NODE_ID_ATTRIBUTE] : undefined
}

function readTopLevelNodeId(node: JSONContent): unknown {
  return (node as JSONContent & { id?: unknown }).id
}

function readLegacyBlockId(node: JSONContent): unknown {
  return isRecord(node.attrs) ? node.attrs[LEGACY_BLOCK_ID_ATTRIBUTE] : undefined
}

function resolveExistingNodeId(
  attrsId: unknown,
  topLevelId: unknown,
  attrsLegacyUuid: string | undefined,
  legacyBlockUuid: string | undefined,
): string | undefined {
  if (isValidNodeId(attrsId)) return attrsId.toLowerCase()
  if (isValidNodeId(topLevelId)) return topLevelId.toLowerCase()
  return attrsLegacyUuid ?? legacyBlockUuid
}

function omitEmptyAttrs(attrs: JSONContent['attrs']): JSONContent['attrs'] {
  if (!isRecord(attrs)) return undefined
  return Object.keys(attrs).length > 0 ? attrs : undefined
}

function omitUndefinedFields<T extends JSONContent>(node: T): T {
  const nextNode = { ...node }
  if (nextNode.attrs === undefined) {
    delete nextNode.attrs
  }
  if (nextNode.content === undefined) {
    delete nextNode.content
  }
  return nextNode
}

function omitTopLevelId<T extends JSONContent>(node: T): T {
  if (!('id' in node)) return node

  const nextNode = { ...node } as T & { id?: unknown }
  delete nextNode.id
  return nextNode
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
