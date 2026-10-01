/** Full editing entry. Import the stylesheet separately when using UI components. */
export { default as BlockEditor } from './editor/EditorShell.vue'
export { default as NativeTableEditor } from './editor/NativeTableEditor.vue'
export { default as EditorProvider } from './ui/UiProvider.vue'
export { default as EditorContextMenu } from './editor/EditorContextMenu.vue'
export { default as EditorBubbleMenu } from './editor/EditorBubbleMenu.vue'
export { default as SlashCommandMenu } from './editor/slash/SlashCommandMenu.vue'
export { createEditorExtensions } from './editor/createEditorExtensions'
export * from './plugins'
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
export * from './models/document'
export * from './models/features'
export * from './models/asset'
export {
  BrowserMemoryAssetService,
  configureAssetService,
  provideAssetService,
  resetAssetService,
  useAssetService,
  type AssetAdapter,
  type AssetService,
} from './infrastructure/assets/AssetService'
