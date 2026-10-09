import { DOCUMENT_SCHEMA_VERSION, type TiptapDocumentJson } from '@/models/document'
import {
  applyCoreOperations,
  createDocumentSnapshot,
  searchDocumentBlocks,
  type CoreOperation,
  type CoreOperationResult,
  type DocumentSnapshot,
} from '@/core/documentCore'

export const AGENT_TOOL_SCHEMA_VERSION = 1

export const AGENT_OPERATION_TYPES = [
  'replace_block',
  'insert_block',
  'delete_block',
  'update_attrs',
] as const satisfies readonly CoreOperation['type'][]

export type AgentToolName = 'read' | 'search' | 'validate' | 'apply' | 'commit'

export type AgentToolErrorCode =
  | 'DOCUMENT_NOT_FOUND'
  | 'REVISION_CONFLICT'
  | 'COMMIT_NOT_CONFIGURED'
  | 'COMMIT_REJECTED'

export class AgentToolError extends Error {
  constructor(
    readonly code: AgentToolErrorCode,
    message: string,
  ) {
    super(message)
    this.name = 'AgentToolError'
  }
}

export interface AgentDocumentToolRequest {
  documentId: string
  revision: number
}

export interface AgentDocumentSaveRequest {
  documentId: string
  expectedRevision: number
  content: TiptapDocumentJson
}

export interface AgentDocumentSaveResult {
  /** The revision assigned after the compare-and-swap succeeds. */
  revision: number
}

export interface AgentCommitResult extends CoreOperationResult {
  committed: boolean
  revision?: number
  errorCode?: AgentToolErrorCode
}

export interface AgentJsonSchema {
  type?: 'object' | 'array' | 'string' | 'integer'
  description?: string
  properties?: Record<string, AgentJsonSchema>
  items?: AgentJsonSchema
  required?: readonly string[]
  additionalProperties?: boolean
  minimum?: number
  oneOf?: readonly AgentJsonSchema[]
  const?: string
}

export interface AgentToolDefinition {
  name: AgentToolName
  description: string
  inputSchema: AgentJsonSchema
}

const revisionProperties = {
  documentId: { type: 'string' as const, description: '文档 ID。' },
  revision: { type: 'integer' as const, minimum: 0, description: '读取时看到的文档 revision。' },
}

const operationSchema: AgentJsonSchema = {
  type: 'object',
  description: '一个文档块操作。content 使用 Tiptap JSON 节点数组。',
  oneOf: [
    {
      type: 'object',
      properties: { type: { type: 'string', const: 'replace_block' }, blockId: { type: 'string' }, content: { type: 'array', items: { type: 'object' } } },
      required: ['type', 'blockId', 'content'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { type: { type: 'string', const: 'insert_block' }, afterBlockId: { type: 'string' }, beforeBlockId: { type: 'string' }, content: { type: 'array', items: { type: 'object' } } },
      required: ['type', 'content'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { type: { type: 'string', const: 'delete_block' }, blockId: { type: 'string' } },
      required: ['type', 'blockId'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: { type: { type: 'string', const: 'update_attrs' }, blockId: { type: 'string' }, attrs: { type: 'object' } },
      required: ['type', 'blockId', 'attrs'],
      additionalProperties: false,
    },
  ],
}

const operationsRequestSchema: AgentJsonSchema = {
  type: 'object',
  properties: {
    ...revisionProperties,
    operations: { type: 'array', items: operationSchema },
  },
  required: ['documentId', 'revision', 'operations'],
  additionalProperties: false,
}

/** Tool descriptions suitable for MCP inputSchema or a function-calling wrapper. */
export const AGENT_TOOL_DEFINITIONS: readonly AgentToolDefinition[] = [
  {
    name: 'read',
    description: '读取指定 revision 的文档快照、块索引和规范化 JSON。',
    inputSchema: {
      type: 'object',
      properties: revisionProperties,
      required: ['documentId', 'revision'],
      additionalProperties: false,
    },
  },
  {
    name: 'search',
    description: '在指定 revision 的文档块文本和块类型中搜索。',
    inputSchema: {
      type: 'object',
      properties: { ...revisionProperties, query: { type: 'string' } },
      required: ['documentId', 'revision', 'query'],
      additionalProperties: false,
    },
  },
  {
    name: 'validate',
    description: '验证一批文档操作并返回预览 JSON，不写入存储。',
    inputSchema: operationsRequestSchema,
  },
  {
    name: 'apply',
    description: '计算一批文档操作并返回新的 JSON，不写入存储。',
    inputSchema: operationsRequestSchema,
  },
  {
    name: 'commit',
    description: '验证并通过宿主提供的 compare-and-swap 保存一批文档操作。',
    inputSchema: operationsRequestSchema,
  },
]

export interface AgentToolAdapter {
  readonly capabilities: {
    /** Agent tool protocol version, independent from the persisted document schema. */
    toolSchemaVersion: number
    /** Persisted Tiptap document schema version returned by this adapter. */
    documentSchemaVersion: number
    /** @deprecated Use documentSchemaVersion or toolSchemaVersion explicitly. */
    schemaVersion: number
    operations: readonly CoreOperation['type'][]
    commit: boolean
  }
  read(request: AgentDocumentToolRequest): DocumentSnapshot
  search(request: AgentDocumentToolRequest & { query: string }): ReturnType<typeof searchDocumentBlocks>
  validate(request: AgentDocumentToolRequest & { operations: CoreOperation[] }): CoreOperationResult
  apply(request: AgentDocumentToolRequest & { operations: CoreOperation[] }): CoreOperationResult
  commit(request: AgentDocumentToolRequest & { operations: CoreOperation[] }): AgentCommitResult
}

export function createAgentToolDefinitions(): readonly AgentToolDefinition[] {
  return AGENT_TOOL_DEFINITIONS
}

export function invokeAgentTool(
  adapter: AgentToolAdapter,
  name: AgentToolName,
  input: unknown,
): DocumentSnapshot | ReturnType<typeof searchDocumentBlocks> | CoreOperationResult | AgentCommitResult {
  if (!isRecord(input)) throw new TypeError('Agent 工具参数必须是对象。')
  if (name === 'read') return adapter.read(readRequest(input))
  if (name === 'search') return adapter.search({ ...readRequest(input), query: requiredString(input, 'query') })
  const request = { ...readRequest(input), operations: requiredOperations(input) }
  if (name === 'validate') return adapter.validate(request)
  if (name === 'apply') return adapter.apply(request)
  return adapter.commit(request)
}

export function createAgentToolAdapter(options: {
  getDocument: (documentId: string) => { revision: number; content: TiptapDocumentJson } | null
  /** Must atomically compare expectedRevision and return the newly assigned revision. */
  saveDocument?: (request: AgentDocumentSaveRequest) => AgentDocumentSaveResult | null
}): AgentToolAdapter {
  const load = (request: AgentDocumentToolRequest): DocumentSnapshot => {
    const record = options.getDocument(request.documentId)
    if (!record) throw new AgentToolError('DOCUMENT_NOT_FOUND', '文档不存在。')
    if (record.revision !== request.revision) {
      throw new AgentToolError('REVISION_CONFLICT', '文档版本已变化，需要重新读取。')
    }
    return createDocumentSnapshot(request.documentId, record.revision, record.content)
  }

  const calculate = (request: AgentDocumentToolRequest & { operations: CoreOperation[] }) =>
    applyCoreOperations(load(request), request.operations)

  return {
    capabilities: {
      toolSchemaVersion: AGENT_TOOL_SCHEMA_VERSION,
      documentSchemaVersion: DOCUMENT_SCHEMA_VERSION,
      schemaVersion: AGENT_TOOL_SCHEMA_VERSION,
      operations: AGENT_OPERATION_TYPES,
      commit: Boolean(options.saveDocument),
    },
    read: load,
    search: (request) => searchDocumentBlocks(load(request), request.query),
    validate: calculate,
    apply: calculate,
    commit: (request) => {
      if (!options.saveDocument) {
        return {
          ok: false,
          committed: false,
          errorCode: 'COMMIT_NOT_CONFIGURED',
          error: '未配置 saveDocument，无法提交 Agent 修改。',
        }
      }
      const result = calculate(request)
      if (!result.ok || !result.content) return { ...result, committed: false }
      let saved: AgentDocumentSaveResult | null
      try {
        saved = options.saveDocument({
          documentId: request.documentId,
          expectedRevision: request.revision,
          content: result.content,
        })
      } catch {
        saved = null
      }
      if (!saved || !Number.isInteger(saved.revision) || saved.revision <= request.revision) {
        return {
          ok: false,
          committed: false,
          errorCode: 'COMMIT_REJECTED',
          error: '文档保存被拒绝，可能是 revision 已变化。',
        }
      }
      return { ...result, committed: true, revision: saved.revision }
    },
  }
}

function readRequest(input: Record<string, unknown>): AgentDocumentToolRequest {
  const documentId = requiredString(input, 'documentId')
  const revision = input.revision
  if (!Number.isInteger(revision) || (revision as number) < 0) {
    throw new TypeError('revision 必须是非负整数。')
  }
  return { documentId, revision: revision as number }
}

function requiredString(input: Record<string, unknown>, key: string): string {
  const value = input[key]
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${key} 必须是非空字符串。`)
  return value
}

function requiredOperations(input: Record<string, unknown>): CoreOperation[] {
  if (!Array.isArray(input.operations)) throw new TypeError('operations 必须是数组。')
  input.operations.forEach(validateOperationInput)
  return input.operations as CoreOperation[]
}

function validateOperationInput(value: unknown): void {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new TypeError('operations 包含无效操作。')
  }
  const operation = value
  const requireBlockId = () => {
    if (typeof operation.blockId !== 'string' || !operation.blockId.trim()) throw new TypeError('操作缺少有效 blockId。')
  }
  const requireContent = () => {
    if (!Array.isArray(operation.content)) throw new TypeError('操作缺少 content 数组。')
  }
  if (operation.type === 'replace_block') {
    requireBlockId(); requireContent(); return
  }
  if (operation.type === 'insert_block') {
    if (operation.afterBlockId !== undefined && typeof operation.afterBlockId !== 'string') throw new TypeError('afterBlockId 必须是字符串。')
    if (operation.beforeBlockId !== undefined && typeof operation.beforeBlockId !== 'string') throw new TypeError('beforeBlockId 必须是字符串。')
    requireContent(); return
  }
  if (operation.type === 'delete_block') {
    requireBlockId(); return
  }
  if (operation.type === 'update_attrs') {
    requireBlockId()
    if (!isRecord(operation.attrs)) throw new TypeError('update_attrs 缺少 attrs 对象。')
    return
  }
  throw new TypeError(`不支持的操作类型：${operation.type}。`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
