import './style.css'

export {
  blockEditorComponents,
  createVueBlockEditorPlugin,
  registerVueBlockEditor,
  VueBlockEditorPlugin,
  type BlockEditorComponentName,
  type VueBlockEditorPluginOptions,
} from './plugin'

export { default as BlockEditor } from './editor/EditorShell.vue'
export { default as BlockRenderer } from './components/BlockRenderer.vue'
export { default as DocumentRenderer } from './components/DocumentRenderer.vue'
export { default as DocumentTree } from './components/DocumentTree.vue'
export { default as DocumentTreeNode } from './components/DocumentTreeNode.vue'
export { default as DocumentTreeContextMenu } from './components/DocumentTreeContextMenu.vue'
export { default as DocumentTreeNodeActions } from './components/DocumentTreeNodeActions.vue'
export { default as NativeTableEditor } from './editor/NativeTableEditor.vue'
export { default as EditorProvider } from './ui/UiProvider.vue'
export { default as EditorContextMenu } from './editor/EditorContextMenu.vue'
export { default as EditorBubbleMenu } from './editor/EditorBubbleMenu.vue'

export { createEditorExtensions } from './editor/createEditorExtensions'
export * from './plugins'
export { default as SlashCommandMenu } from './editor/slash/SlashCommandMenu.vue'
export {
  filterSlashCommandItems,
  SLASH_COMMAND_ITEMS,
  type SlashCommandContext,
  type SlashCommandItem,
} from './editor/slashCommand'
export { parseMarkdownDocument, type MarkdownImportOptions } from './editor/markdownImport'
export { parseNotebookJsonDocument, type JsonImportOptions } from './editor/jsonImport'
export {
  exportDocumentToHtml,
  exportDocumentToMarkdown,
  type HtmlExportOptions,
  type DocumentExportOptions,
  metadataFromDocument,
  type ExportableDocumentMetadata,
} from './editor/documentExport'
export {
  createEmptyDocumentContent,
  createInitialDocumentContent,
} from './editor/documentTemplate'
export {
  cloneEditorContent,
  migrateEditorContent,
  normalizeEditorContent,
  parseEditorContentJson,
  serializeEditorContent,
  type DocumentSchemaMigration,
} from './editor/editorContent'
export {
  buildSidebarDocumentForest,
  collectArticleDescendants,
  countSidebarDocumentNodes,
  type SidebarDocumentForest,
  type SidebarDocumentNode,
} from './components/documentTree'
export {
  BrowserMemoryAssetService,
  configureAssetService,
  provideAssetService,
  resetAssetService,
  useAssetService,
  type AssetAdapter,
  type AssetService,
} from './infrastructure/assets/AssetService'
export * from './models/asset'
export * from './models/document'
export * from './models/settings'
export * from './models/features'
export type { SelectedBlock } from './models/agent'
export {
  applyAgentBlockPatches,
  getDocumentPlainText,
  type ApplyBlockPatchResult,
} from './editor/agentBlockPatch'
export {
  createAgentTask,
  findRelevantBlocksForInstruction,
  normalizePatchText,
  validateBlockPatch,
  type AgentPatchSet,
  type AgentTask,
  type BlockPatch,
  type PatchValidationResult,
} from './models/agent'
export type { TableField } from './editor/tableFields'
export {
  applyCoreOperations,
  createDocumentSnapshot,
  searchDocumentBlocks,
  type CoreBlock,
  type CoreOperation,
  type DocumentSnapshot,
  type CoreOperationResult,
} from './core/documentCore'
export {
  createAgentToolAdapter,
  type AgentDocumentToolRequest,
  type AgentToolAdapter,
} from './agent/toolAdapter'
