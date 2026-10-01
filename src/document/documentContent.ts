import type { JSONContent } from '@tiptap/vue-3'

import { DOCUMENT_SCHEMA_VERSION, EMPTY_TIPTAP_DOCUMENT, type TiptapDocumentJson } from '@/models/document'
import { normalizeDocumentNodeIds } from './blockId'

export interface DocumentSchemaMigration {
  fromVersion: number
  toVersion: number
  migrate: (content: TiptapDocumentJson) => TiptapDocumentJson
}

export function cloneEditorContent(content: TiptapDocumentJson): TiptapDocumentJson {
  return JSON.parse(JSON.stringify(content)) as TiptapDocumentJson
}

export function parseEditorContentJson(contentJson: string): TiptapDocumentJson {
  try {
    const parsed = JSON.parse(contentJson) as unknown

    if (isTiptapDocumentJson(parsed) && hasValidDocumentContent(parsed)) {
      if (typeof parsed.schemaVersion === 'number' && parsed.schemaVersion > DOCUMENT_SCHEMA_VERSION) {
        throw new Error(`Unsupported future document schema version: ${parsed.schemaVersion}`)
      }
      return normalizeDocumentNodeIds(parsed)
    }

    throw new Error('Parsed content is not a Tiptap document.')
  } catch (error) {
    throw new Error('Invalid Tiptap document JSON.', { cause: error })
  }
}

export function serializeEditorContent(content: TiptapDocumentJson): string {
  return JSON.stringify(normalizeDocumentNodeIds(content))
}

export function normalizeEditorContent(
  content: TiptapDocumentJson | null | undefined,
): TiptapDocumentJson {
  return normalizeDocumentNodeIds(cloneEditorContent(content ?? EMPTY_TIPTAP_DOCUMENT))
}

/**
 * Applies host supplied document migrations before the package normalizes IDs
 * and stamps the current schema version. Migrations are intentionally pure so
 * callers can preview the result before persisting it.
 */
export function migrateEditorContent(
  content: TiptapDocumentJson | null | undefined,
  migrations: readonly DocumentSchemaMigration[] = [],
): TiptapDocumentJson {
  let current = cloneEditorContent(content ?? EMPTY_TIPTAP_DOCUMENT)
  const startingVersion = typeof current.schemaVersion === 'number' ? current.schemaVersion : 0
  if (startingVersion > DOCUMENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported future document schema version: ${startingVersion}`)
  }

  let version = startingVersion
  const available = new Map(migrations.map((migration) => [migration.fromVersion, migration]))
  while (version < DOCUMENT_SCHEMA_VERSION) {
    const migration = available.get(version)
    if (!migration) {
      if (migrations.length > 0) {
        throw new Error(`Missing document migration from version ${version}`)
      }
      break
    }
    if (!Number.isInteger(migration.toVersion) || migration.toVersion <= version || migration.toVersion > DOCUMENT_SCHEMA_VERSION) {
      throw new Error(`Invalid document migration ${migration.fromVersion} -> ${migration.toVersion}`)
    }
    if (migration.fromVersion !== version) {
      throw new Error(`Document migration starts at ${migration.fromVersion}, expected ${version}`)
    }
    current = cloneEditorContent(migration.migrate(current))
    current.schemaVersion = migration.toVersion
    version = migration.toVersion
  }

  return normalizeDocumentNodeIds(current)
}

export function isSameEditorContent(
  left: TiptapDocumentJson,
  right: TiptapDocumentJson,
): boolean {
  return serializeEditorContent(left) === serializeEditorContent(right)
}

function isTiptapDocumentJson(value: unknown): value is TiptapDocumentJson {
  if (!isRecord(value)) {
    return false
  }

  return value.type === 'doc'
}

function hasValidDocumentContent(value: TiptapDocumentJson): boolean {
  return value.content === undefined || isValidNodeArray(value.content)
}

function isValidNodeArray(value: unknown): value is JSONContent[] {
  return Array.isArray(value) && value.every(isValidNode)
}

function isValidNode(value: unknown): value is JSONContent {
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.type === 'text' && typeof value.text !== 'string') return false
  return value.content === undefined || isValidNodeArray(value.content)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

