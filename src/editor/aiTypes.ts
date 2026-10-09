import type { TiptapDocumentJson } from '@/models/document'
import type { MicroCompletion } from '@/agent/microRuntime'
import type { EditorBlockSnapshot } from './composables/useEditorBlockSelection'

export interface BlockAiEditRequest {
  instruction: string
  block: EditorBlockSnapshot
  document: TiptapDocumentJson
  signal: AbortSignal
}

/**
 * AI hooks used by the editor widgets. `blockEdit` should return Markdown for
 * the target block. `complete` is an OpenAI-compatible completion function;
 * it powers the floating assistant and is also used for block editing when a
 * dedicated `blockEdit` hook is not supplied.
 */
export interface EditorAiOptions {
  blockEdit?: (request: BlockAiEditRequest) => Promise<string>
  complete?: MicroCompletion
}
