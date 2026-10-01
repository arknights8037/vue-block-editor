export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'waiting_confirmation'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type AgentPatchOperation =
  | 'replace'
  | 'insert_before'
  | 'insert_after'
  | 'append'
  | 'create_document'

export interface SelectedBlock {
  id: string
  type: string
  text: string
  index: number
}

export interface AgentTask {
  id: string
  sessionId: string
  status: AgentTaskStatus
  userInstruction: string
  contextScope: 'selection' | 'current_block' | 'current_document'
  model: string
  currentStep: string
  createdAt: number
  completedAt: number | null
  error: string | null
}

export interface BlockPatch {
  patchId: string
  taskId: string
  operation: AgentPatchOperation
  documentId: string
  blockId: string
  targetBlockIds: string[]
  expectedVersion: number
  before: string
  after: string
  reason: string
  accepted: boolean
  documentTitle?: string
  parentDocumentId?: string | null
}

export interface AgentPatchSet {
  taskId: string
  patches: BlockPatch[]
  model: string
  contextSources: Array<{
    documentId: string
    documentTitle: string
    blockIds: string[]
  }>
  createdAt: number
}

export interface PatchValidationResult {
  ok: boolean
  error: string | null
}

export function validateBlockPatch(
  patch: BlockPatch,
  options: {
    documentId: string
    expectedVersion: number | null
    availableBlockIds: string[]
    currentBlocks?: SelectedBlock[]
  },
): PatchValidationResult {
  if (patch.operation === 'create_document') {
    if (!patch.documentId.trim() || !patch.documentTitle?.trim()) {
      return { ok: false, error: '新文档提案缺少文档 ID 或标题。' }
    }
    if (patch.expectedVersion !== 0 || patch.before || patch.targetBlockIds.length > 0) {
      return { ok: false, error: '新文档提案包含了无效的块版本信息。' }
    }
    if (!patch.after.trim()) return { ok: false, error: '新文档内容为空。' }
    return { ok: true, error: null }
  }

  if (patch.documentId !== options.documentId) {
    return { ok: false, error: '补丁目标文档与当前文档不一致。' }
  }

  if (options.expectedVersion === null || patch.expectedVersion !== options.expectedVersion) {
    return { ok: false, error: '文档版本已变化，需要重新生成 Agent 修改。' }
  }

  if (!patch.targetBlockIds.length) {
    return { ok: false, error: '补丁缺少目标块。' }
  }

  const availableBlockIds = new Set(options.availableBlockIds)
  const missingBlockId = patch.targetBlockIds.find((blockId) => !availableBlockIds.has(blockId))
  if (missingBlockId) {
    return { ok: false, error: `目标块 ${missingBlockId} 已不存在，需要重新生成。` }
  }

  const uniqueBlockIds = new Set(patch.targetBlockIds)
  if (uniqueBlockIds.size !== patch.targetBlockIds.length) {
    return { ok: false, error: '补丁目标块重复，已阻止写入。' }
  }

  if (!uniqueBlockIds.has(patch.blockId)) {
    return { ok: false, error: '补丁主目标块不在目标块列表中。' }
  }

  if (options.currentBlocks) {
    const currentBlocksById = new Map(options.currentBlocks.map((block) => [block.id, block]))
    const currentBefore = patch.targetBlockIds
      .map((blockId) => currentBlocksById.get(blockId)?.text ?? '')
      .join('\n\n')
    if (normalizePatchText(currentBefore) !== normalizePatchText(patch.before)) {
      return { ok: false, error: '目标块内容已变化，需要重新生成 Agent 修改。' }
    }
  }

  if (!patch.after.trim()) {
    return { ok: false, error: '补丁内容为空，已阻止写入。' }
  }

  return { ok: true, error: null }
}

export function createAgentTask(input: {
  id: string
  sessionId: string
  userInstruction: string
  contextScope: AgentTask['contextScope']
  model: string
}): AgentTask {
  return {
    id: input.id,
    sessionId: input.sessionId,
    status: 'pending',
    userInstruction: input.userInstruction,
    contextScope: input.contextScope,
    model: input.model,
    currentStep: '准备任务',
    createdAt: Date.now(),
    completedAt: null,
    error: null,
  }
}

export function normalizePatchText(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim()
}

/** Picks a conservative candidate scope when the user did not select blocks. */
export function findRelevantBlocksForInstruction(
  instruction: string,
  blocks: SelectedBlock[],
): SelectedBlock[] {
  const terms = Array.from(
    new Set([
      ...(instruction.toLocaleLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []),
      ...Array.from(instruction.matchAll(/[\p{Script=Han}]{2,}/gu), (match) => match[0]),
    ]),
  ).filter((term) => term.length >= 2 && !AGENT_SCOPE_STOP_TERMS.has(term))
  if (terms.length === 0) return []

  const scored = blocks
    .map((block) => {
      const text = block.text.toLocaleLowerCase()
      const score = terms.reduce(
        (total, term) => total + (text.includes(term) ? term.length : 0),
        0,
      )
      return { block, score }
    })
    .filter((item) => item.score > 0)
  const bestScore = Math.max(...scored.map((item) => item.score), 0)
  if (bestScore === 0) return []
  return scored
    .filter((item) => item.score >= Math.max(2, bestScore * 0.55))
    .map((item) => item.block)
}

const AGENT_SCOPE_STOP_TERMS = new Set([
  '修改',
  '页面',
  '文档',
  '内容',
  '事项',
  '完成',
  '更新',
  '一下',
  '请将',
  '帮我',
])
