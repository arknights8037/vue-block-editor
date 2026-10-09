<script setup lang="ts">
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  CopyPlus,
  FileText,
  Highlighter,
  ImagePlus,
  Italic,
  Link,
  Palette,
  Redo2,
  Sparkles,
  Strikethrough,
  Subscript,
  Superscript,
  Trash2,
  Underline,
  Undo2,
} from '@lucide/vue'
import type { Editor } from '@tiptap/core'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from 'reka-ui'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { createEditorExtensions } from './createEditorExtensions'
import {
  cloneBlockForInsertion,
  hasRetainedBlock,
  retainBlock,
  takeRetainedBlock,
} from './blockClipboard'
import { ensureTopLevelBlockIds } from './blockId'
import {
  getContextInsertBlockTypes,
  getTransformBlockTypes,
  getContextInsertContent,
  type BlockMenuIcon,
  type RegisteredBlockType,
} from './blockTypeRegistry'
import { normalizeEditorContent } from './editorContent'
import { parseMarkdownDocument } from './markdownImport'
import {
  HIGHLIGHT_COLOR_SWATCHES,
  TEXT_COLOR_SWATCHES,
  useEditorColorFormatting,
} from './composables/useEditorColorFormatting'
import { useEditorJumpAid } from './composables/useEditorJumpAid'
import EditorColorPickerPopover from './EditorColorPickerPopover.vue'
import EditorBubbleMenu from './EditorBubbleMenu.vue'
import EditorContextMenu from './EditorContextMenu.vue'
import EditorInlineMarkButtons from './menus/EditorInlineMarkButtons.vue'
import EditorAlignmentButtons from './menus/EditorAlignmentButtons.vue'
import EditorHistoryButtons from './menus/EditorHistoryButtons.vue'
import EditorBlockAiEditor from './EditorBlockAiEditor.vue'
import EditorFloatingAi from './EditorFloatingAi.vue'
import type { EditorAiOptions } from './aiTypes'
import { runMicroAgent, type MicroMessage } from '@/agent/microRuntime'
import { useEditorFormattingCommands } from './composables/useEditorFormattingCommands'
import { useEditorBubbleMenu } from './composables/useEditorBubbleMenu'
import { createInternalDocumentHref, parseInternalDocumentHref } from '@/models/documentLink'
import type { TiptapDocumentJson } from '@/models/document'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/models/settings'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPlugin, EditorPluginRegistry } from '@/plugins'
import { createEditorPluginRegistry } from '@/plugins'
import { useEditorPluginLifecycle } from './composables/useEditorPluginLifecycle'
import { useEditorDocumentSync } from './composables/useEditorDocumentSync'
import { useEditorFileActions } from './composables/useEditorFileActions'
import { useEditorBlockSelection, type EditorBlockSnapshot } from './composables/useEditorBlockSelection'
import { NButton, NButtonGroup, NIcon, NTooltip } from '@/ui'
import { MENU_ICON_COMPONENTS } from './editorShellConfig'

const props = withDefaults(
  defineProps<{
    modelValue?: TiptapDocumentJson
    readonly?: boolean
    autofocus?: boolean
    ariaLabel?: string
    settings?: AppSettings
    internalDocuments?: Array<{ id: string; title: string }>
    documentId?: string
    features?: EditorFeatureOptions
    plugins?: readonly EditorPlugin[]
    pluginRegistry?: EditorPluginRegistry
    ai?: EditorAiOptions
  }>(),
  {
    modelValue: undefined,
    readonly: false,
    autofocus: false,
    ariaLabel: '文档编辑器',
    settings: () => ({ ...DEFAULT_APP_SETTINGS }),
    internalDocuments: () => [],
    documentId: '',
    features: () => ({}),
    plugins: () => [],
    pluginRegistry: undefined,
    ai: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: TiptapDocumentJson]
  textUpdate: [value: string]
  ready: []
  destroy: []
  imageError: [message: string]
  openDocument: [documentId: string, blockId?: string]
}>()

const initialContent = computed(() =>
  ensureTopLevelBlockIds(normalizeEditorContent(props.modelValue)),
)
const editorPluginRegistry = computed(() => {
  if (props.pluginRegistry) {
    if (props.plugins?.length && import.meta.env?.DEV) {
      console.warn('[vue-block-editor] pluginRegistry takes precedence over plugins')
    }
    return props.pluginRegistry
  }
  return createEditorPluginRegistry(props.plugins ?? [])
})
const transformBlockTypes = computed(() => getTransformBlockTypes(props.features, editorPluginRegistry.value))
const contextInsertBlockTypes = computed(() => getContextInsertBlockTypes(props.features, editorPluginRegistry.value))
const pluginLifecycle = useEditorPluginLifecycle(
  () => editorPluginRegistry.value,
  () => props.features,
  (event, payload) => emit(event as never, payload as never),
)
const imageFileInput = ref<InstanceType<typeof globalThis.HTMLInputElement> | null>(null)
const attachmentFileInput = ref<InstanceType<typeof globalThis.HTMLInputElement> | null>(null)
const pendingImagePosition = ref<number | null>(null)
const pendingAttachmentPosition = ref<number | null>(null)
const editorShellElement = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const contextBlockPosition = ref<number | null>(null)
const blockAiOpen = ref(false)
const blockAiLoading = ref(false)
const blockAiError = ref('')
const blockAiPreview = ref('')
const blockAiPosition = ref({ top: 0, left: 0 })
const blockAiController = ref<AbortController | null>(null)
const floatingAiOpen = ref(false)
const floatingAiLoading = ref(false)
const floatingAiError = ref('')
const floatingAiResponse = ref('')
const floatingAiEvents = ref<string[]>([])
const floatingAiController = ref<AbortController | null>(null)
const retainedBlockAvailable = ref(hasRetainedBlock())
const editorRevision = ref(0)
const editorAppearanceStyle = computed(() => ({
  '--editor-content-width': { compact: '720px', standard: '850px', wide: '1000px' }[
    props.settings.contentWidth
  ],
  '--editor-font-size': { small: '14px', standard: '16px', large: '18px' }[props.settings.fontSize],
  '--editor-line-height': { compact: '1.5', comfortable: '1.72', relaxed: '2' }[
    props.settings.lineHeight
  ],
  '--editor-western-font-family': toCssFontFamily(props.settings.westernFontFamily),
  '--editor-chinese-font-family': toCssFontFamily(props.settings.chineseFontFamily),
}))
const bubbleMenuOptions = {
  strategy: 'fixed' as const,
  placement: 'top' as const,
  offset: 10,
  flip: true,
  shift: {
    padding: 14,
  },
  inline: true,
}
const editor = useEditor({
  content: initialContent.value,
  editable: !props.readonly,
  autofocus: props.autofocus,
  extensions: createEditorExtensions(props.features, editorPluginRegistry.value, props.readonly),
  editorProps: {
    attributes: {
      'aria-label': props.ariaLabel,
      class: 'editor-shell__content',
      spellcheck: props.settings.spellcheck ? 'true' : 'false',
    },
    handlePaste: (view, event) => {
      const imageFile = getClipboardImageFile(event)
      if (!imageFile || props.readonly) return false

      void fileActions.insertImageFile(imageFile, view.state.selection.from)
      return true
    },
  },
  onCreate: ({ editor: activeEditor }) => {
    pluginLifecycle.setup(activeEditor)
    editorRevision.value += 1
    syncTextColor(activeEditor)
    syncHighlightColor(activeEditor)
    emit('ready')
  },
  onSelectionUpdate: ({ editor: activeEditor }) => {
    syncTextColor(activeEditor)
    syncHighlightColor(activeEditor)
  },
  onUpdate: ({ editor: activeEditor }) => {
    editorRevision.value += 1
    syncTextColor(activeEditor)
    syncHighlightColor(activeEditor)
    emit('update:modelValue', activeEditor.getJSON() as TiptapDocumentJson)
    emit('textUpdate', activeEditor.getText())
  },
})

const fileActions = useEditorFileActions(editor, () => props.documentId, (message) => emit('imageError', message))
const blockSelection = useEditorBlockSelection(editor)

const {
  textColor,
  highlightColor,
  recentTextColors,
  recentHighlightColors,
  colorPopoverOpen,
  highlightPopoverOpen,
  setTextColor,
  previewTextColor,
  setHighlightColor,
  previewHighlightColor,
  unsetTextColor,
  unsetHighlightColor,
  syncTextColor,
  syncHighlightColor,
  hasActiveTextColor,
  hasActiveHighlight,
} = useEditorColorFormatting(editor)

const { shouldShowBubbleMenu, getBubbleMenuContainer } = useEditorBubbleMenu(
  () => props.readonly,
  colorPopoverOpen,
  highlightPopoverOpen,
)

const {
  isActive, toggleBold, toggleItalic, toggleStrike, toggleUnderline, toggleInlineCode,
  toggleSubscript, toggleSuperscript, setTextAlignment, isTextAligned, setLink, undo, redo,
} = useEditorFormattingCommands(editor)

const {
  activeItemId: activeJumpAidItemId,
  items: jumpAidItems,
  position: jumpAidPosition,
  visible: showJumpAid,
  jumpToBlock,
  revealBlock,
  scheduleSync: scheduleActiveJumpAidSync,
} = useEditorJumpAid({
  editor,
  content: () => props.modelValue,
  revision: editorRevision,
  settings: () => props.settings,
  scrollContainer: editorShellElement,
})

function insertImage(): void {
  const activeEditor = editor.value
  if (!activeEditor || !activeEditor.isEditable) return

  pendingImagePosition.value = activeEditor.state.selection.from
  imageFileInput.value?.click()
}

function insertAttachment(): void {
  const activeEditor = editor.value
  if (!activeEditor || !activeEditor.isEditable) return

  pendingAttachmentPosition.value = activeEditor.state.selection.from
  attachmentFileInput.value?.click()
}

function insertMarkdown(markdown: string): void {
  const activeEditor = editor.value
  if (!activeEditor || !activeEditor.isEditable || !markdown.trim()) return
  const parsed = parseMarkdownDocument(markdown, 'AI 输出')
  const content = parsed.content.content ?? [{ type: 'paragraph' }]
  activeEditor.chain().focus().insertContent(content).run()
}

function captureContextBlock(event: InstanceType<typeof globalThis.MouseEvent>): void {
  const target = event.target
  const block =
    target instanceof globalThis.Element
      ? target.closest<InstanceType<typeof globalThis.HTMLElement>>('[data-editor-block-pos]')
      : null
  const position = Number(block?.dataset.editorBlockPos)
  contextBlockPosition.value = Number.isFinite(position) ? position : null
}

function getContextBlockSnapshot(): EditorBlockSnapshot | null {
  const position = contextBlockPosition.value
  if (position === null) return null
  return blockSelection.getCurrentDocumentBlocks().find((block) => block.from === position) ?? null
}

async function updateBlockAiPosition(): Promise<void> {
  await nextTick()
  const shell = editorShellElement.value
  const position = contextBlockPosition.value
  if (!shell || position === null || !blockAiOpen.value) return
  const block = shell.querySelector<HTMLElement>(`[data-editor-block-pos="${position}"]`)
  if (!block) return
  const shellRect = shell.getBoundingClientRect()
  const blockRect = block.getBoundingClientRect()
  blockAiPosition.value = {
    top: Math.max(8, blockRect.top - shellRect.top + shell.scrollTop - 58),
    left: Math.max(8, blockRect.left - shellRect.left + shell.scrollLeft + 4),
  }
}

function openBlockAiEditor(): void {
  if (props.readonly || !getContextBlockSnapshot()) return
  blockAiError.value = ''
  blockAiPreview.value = ''
  blockAiOpen.value = true
  void updateBlockAiPosition()
}

function closeBlockAiEditor(): void {
  blockAiController.value?.abort()
  blockAiController.value = null
  blockAiOpen.value = false
  blockAiLoading.value = false
  blockAiError.value = ''
  blockAiPreview.value = ''
}

async function submitBlockAi(instruction: string): Promise<void> {
  const activeEditor = editor.value
  const block = getContextBlockSnapshot()
  if (!activeEditor || !block || props.readonly || blockAiLoading.value) return
  const controller = new AbortController()
  blockAiController.value = controller
  blockAiLoading.value = true
  blockAiError.value = ''
  try {
    let markdown = ''
    if (props.ai?.blockEdit) {
      markdown = await props.ai.blockEdit({ instruction, block, document: activeEditor.getJSON() as TiptapDocumentJson, signal: controller.signal })
    } else if (props.ai?.complete) {
      const messages: MicroMessage[] = [
        { role: 'system', content: '你是块内编辑助手。只返回替换目标块的 Markdown 正文，不要解释，不要添加代码围栏。保留用户没有要求改变的事实与格式。' },
        { role: 'user', content: `目标块原文：\n${block.text}\n\n编辑要求：${instruction}` },
      ]
      const reply = await props.ai.complete(messages, controller.signal)
      markdown = reply.content?.trim() ?? ''
    } else {
      throw new Error('请在 BlockEditor 的 ai.complete 或 ai.blockEdit 中配置模型。')
    }
    controller.signal.throwIfAborted()
    if (!markdown.trim()) throw new Error('AI 没有返回可写入的内容。')
    blockAiPreview.value = markdown
  } catch (error) {
    if (!controller.signal.aborted) blockAiError.value = error instanceof Error ? error.message : '块内 AI 编辑失败。'
  } finally {
    if (blockAiController.value === controller) {
      blockAiController.value = null
      blockAiLoading.value = false
    }
  }
}

function acceptBlockAi(): void {
  const block = getContextBlockSnapshot()
  const markdown = blockAiPreview.value
  if (!block || !markdown) return
  if (!blockSelection.replaceBlocksWithMarkdown([block.id], markdown)) {
    blockAiError.value = '目标块已变化，请重新打开块内 AI 编辑。'
    return
  }
  closeBlockAiEditor()
}

function rejectBlockAi(): void {
  blockAiPreview.value = ''
  blockAiError.value = ''
}

function openFloatingAi(): void {
  floatingAiOpen.value = true
  floatingAiError.value = ''
}

function closeFloatingAi(): void {
  floatingAiController.value?.abort()
  floatingAiController.value = null
  floatingAiLoading.value = false
  floatingAiOpen.value = false
}

async function submitFloatingAi(instruction: string): Promise<void> {
  const activeEditor = editor.value
  if (!activeEditor || props.readonly || floatingAiLoading.value) return
  if (!props.ai?.complete) {
    floatingAiError.value = '请在 BlockEditor 的 ai.complete 中配置模型。'
    return
  }
  const controller = new AbortController()
  floatingAiController.value = controller
  floatingAiLoading.value = true
  floatingAiError.value = ''
  floatingAiResponse.value = ''
  floatingAiEvents.value = []
  const documentId = props.documentId || 'current-document'
  try {
    const result = await runMicroAgent({
      instruction,
      signal: controller.signal,
      complete: props.ai.complete,
      onEvent: (event) => floatingAiEvents.value.push(event.text),
      host: {
        current: () => {
          const currentEditor = editor.value
          if (!currentEditor) return null
          return {
            id: documentId,
            title: props.ariaLabel,
            revision: editorRevision.value,
            content: currentEditor.getJSON() as TiptapDocumentJson,
          }
        },
        write: async (id, expectedRevision, content, signal) => {
          signal.throwIfAborted()
          const currentEditor = editor.value
          if (!currentEditor || id !== documentId || expectedRevision !== editorRevision.value) {
            throw new Error('编辑器内容已变化，请重新发起任务。')
          }
          currentEditor.commands.setContent(content, { emitUpdate: true, errorOnInvalidContent: true })
          return '已写入当前文档'
        },
      },
    })
    floatingAiResponse.value = result.text
  } catch (error) {
    if (!controller.signal.aborted) floatingAiError.value = error instanceof Error ? error.message : 'AI 助手执行失败。'
  } finally {
    if (floatingAiController.value === controller) {
      floatingAiController.value = null
      floatingAiLoading.value = false
    }
  }
}

watch([blockAiOpen, contextBlockPosition], () => void updateBlockAiPosition())

function handleEditorClick(event: InstanceType<typeof globalThis.MouseEvent>): void {
  const target = event.target
  const anchor = target instanceof globalThis.Element ? target.closest('a') : null
  const href = anchor?.getAttribute('href') ?? ''
  const targetDocument = parseInternalDocumentHref(href)
  if (!targetDocument) return

  event.preventDefault()
  if (targetDocument.blockId)
    emit('openDocument', targetDocument.documentId, targetDocument.blockId)
  else emit('openDocument', targetDocument.documentId)
}

function focusContextBlock(): boolean {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  if (!activeEditor || position === null || !activeEditor.state.doc.nodeAt(position)) return false

  activeEditor.commands.setTextSelection(
    Math.min(position + 1, activeEditor.state.doc.content.size),
  )
  return true
}

function getBlockMenuIconComponent(icon: BlockMenuIcon) {
  return icon.kind === 'lucide' ? MENU_ICON_COMPONENTS[icon.name] : null
}

function transformContextBlock(blockType: RegisteredBlockType): void {
  const activeEditor = editor.value
  if (!activeEditor || !blockType.transform || !focusContextBlock()) return

  blockType.transform(activeEditor)
}

function copyContextBlock(): void {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  if (!activeEditor || position === null) return
  const node = activeEditor.state.doc.nodeAt(position)
  if (!node) return

  if (props.settings.blockCopyBehavior === 'clipboard') {
    retainBlock(node.toJSON())
    retainedBlockAvailable.value = true
    return
  }

  activeEditor
    .chain()
    .focus()
    .insertContentAt(position + node.nodeSize, cloneBlockForInsertion(node.toJSON()))
    .run()
}

function pasteRetainedBlock(): void {
  const block = takeRetainedBlock()
  if (!block) return

  retainedBlockAvailable.value = false
  insertAfterContextBlock(block as Record<string, unknown>)
}

function deleteContextBlock(): void {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  if (!activeEditor || position === null) return
  const node = activeEditor.state.doc.nodeAt(position)
  if (!node) return

  activeEditor
    .chain()
    .focus()
    .deleteRange({ from: position, to: position + node.nodeSize })
    .run()
}

function insertAfterContextBlock(content: Record<string, unknown>): void {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  if (!activeEditor) return
  const node = position === null ? null : activeEditor.state.doc.nodeAt(position)
  const insertionPosition =
    node && position !== null ? position + node.nodeSize : activeEditor.state.selection.to
  activeEditor.chain().focus().insertContentAt(insertionPosition, content).run()
}

function insertRegisteredBlockAfterContextBlock(blockType: RegisteredBlockType): void {
  if (blockType.contextInsert?.kind === 'image-upload') {
    insertImageAfterContextBlock()
    return
  }
  if (blockType.contextInsert?.kind === 'file-upload') {
    insertAttachmentAfterContextBlock()
    return
  }

  const content = getContextInsertContent(blockType)
  if (!content) return

  insertAfterContextBlock(content as Record<string, unknown>)
}

function insertImageAfterContextBlock(): void {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  const node = position === null ? null : activeEditor?.state.doc.nodeAt(position)
  if (activeEditor && node && position !== null) {
    activeEditor.commands.setTextSelection(
      Math.min(position + node.nodeSize, activeEditor.state.doc.content.size),
    )
  }
  insertImage()
}

function insertAttachmentAfterContextBlock(): void {
  const activeEditor = editor.value
  const position = contextBlockPosition.value
  const node = position === null ? null : activeEditor?.state.doc.nodeAt(position)
  if (activeEditor && node && position !== null) {
    activeEditor.commands.setTextSelection(
      Math.min(position + node.nodeSize, activeEditor.state.doc.content.size),
    )
  }
  insertAttachment()
}

function insertInternalDocumentLink(target: { id: string; title: string }): void {
  const activeEditor = editor.value
  if (!activeEditor) return
  const href = createInternalDocumentHref(target.id)

  if (activeEditor.state.selection.empty) {
    activeEditor
      .chain()
      .focus()
      .insertContent({
        type: 'text',
        text: target.title || '未命名文档',
        marks: [{ type: 'link', attrs: { href } }],
      })
      .run()
    return
  }

  activeEditor.chain().focus().setLink({ href }).run()
}

async function handleImageFileChange(event: InstanceType<typeof globalThis.Event>): Promise<void> {
  const input = event.target as InstanceType<typeof globalThis.HTMLInputElement>
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  await fileActions.insertImageFile(file, pendingImagePosition.value ?? undefined)
  pendingImagePosition.value = null
}

async function handleAttachmentFileChange(
  event: InstanceType<typeof globalThis.Event>,
): Promise<void> {
  const input = event.target as InstanceType<typeof globalThis.HTMLInputElement>
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  await fileActions.insertAttachmentFile(file, pendingAttachmentPosition.value ?? undefined)
  pendingAttachmentPosition.value = null
}

function getClipboardImageFile(
  event: InstanceType<typeof globalThis.ClipboardEvent>,
): InstanceType<typeof globalThis.File> | null {
  const file = Array.from(event.clipboardData?.files ?? []).find((item) =>
    item.type.startsWith('image/'),
  )
  if (file) return file

  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue

    const clipboardFile = item.getAsFile()
    if (clipboardFile) return clipboardFile
  }

  return null
}

function getCurrentLinkHref(activeEditor: Editor): string {
  const attributes = activeEditor.getAttributes('link')

  if (isRecord(attributes) && typeof attributes.href === 'string') {
    return attributes.href
  }

  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toCssFontFamily(value: string): string {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      /^(?:serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace)$/i.test(
        part,
      )
        ? part
        : `"${part.replace(/["\\]/g, '')}"`,
    )
    .join(', ')
}

useEditorDocumentSync(editor, {
  readonly: () => props.readonly,
  spellcheck: () => props.settings.spellcheck,
  content: () => props.modelValue,
  scheduleJumpAidSync: scheduleActiveJumpAidSync,
})

onBeforeUnmount(() => {
  blockAiController.value?.abort()
  floatingAiController.value?.abort()
  pluginLifecycle.dispose()
  editor.value?.destroy()
  emit('destroy')
})

defineExpose({
  editor,
  shouldShowBubbleMenu,
  getJSON: () => editor.value?.getJSON() as TiptapDocumentJson | undefined,
  getText: () => editor.value?.getText() ?? '',
  getCurrentDocumentBlocks: blockSelection.getCurrentDocumentBlocks,
  getSelectedBlocks: blockSelection.getSelectedBlocks,
  hasBlockSelection: () => Boolean(editor.value && !editor.value.state.selection.empty),
  focus: () => editor.value?.commands.focus(),
  undo,
  redo,
  insertImage,
  insertAttachment,
  insertMarkdown,
  replaceBlocksWithMarkdown: blockSelection.replaceBlocksWithMarkdown,
  streamMarkdown: blockSelection.streamMarkdown,
  revealBlock,
  insertInternalDocumentLink,
  copyContextBlock,
  pasteRetainedBlock,
  setContextBlockPosition: (position: number) => {
    contextBlockPosition.value = position
  },
  openBlockAiEditor,
  openFloatingAi,
})
</script>

<template>
  <EditorContextMenu>
    <template #trigger>
      <div
        ref="editorShellElement"
        class="editor-shell"
        :class="{
          'editor-shell--readonly': readonly,
          'editor-shell--hide-block-handles': !settings.showBlockHandles,
        }"
        :style="editorAppearanceStyle"
        @click="handleEditorClick"
        @contextmenu="captureContextBlock"
        @scroll="updateBlockAiPosition"
      >
        <input
          ref="imageFileInput"
          class="editor-shell__image-input"
          type="file"
          accept="image/*"
          tabindex="-1"
          aria-hidden="true"
          @change="handleImageFileChange"
        />
        <input
          ref="attachmentFileInput"
          class="editor-shell__image-input"
          type="file"
          tabindex="-1"
          aria-hidden="true"
          @change="handleAttachmentFileChange"
        />
        <EditorBubbleMenu
          v-if="editor"
          class="bubble-menu-layer"
          :editor="editor"
          :should-show="shouldShowBubbleMenu"
          :append-to="getBubbleMenuContainer"
          :options="bubbleMenuOptions"
          plugin-key="format-bubble-menu"
        >
          <NButtonGroup class="bubble-toolbar" role="toolbar" aria-label="文本格式">
            <EditorInlineMarkButtons :active="isActive" :commands="{ bold: toggleBold, italic: toggleItalic, strike: toggleStrike, underline: toggleUnderline, code: toggleInlineCode, subscript: toggleSubscript, superscript: toggleSuperscript, link: setLink }" />
            <span class="bubble-toolbar__separator" aria-hidden="true"></span>
            <EditorColorPickerPopover
              v-model:show="colorPopoverOpen"
              v-model:value="textColor"
              :recent-colors="recentTextColors"
              :swatches="TEXT_COLOR_SWATCHES"
              :active="hasActiveTextColor()"
              label="文字颜色"
              recent-swatch-label="设置最近使用的文字颜色"
              swatch-label="设置文字颜色"
              recent-aria-label="最近使用的文字颜色"
              swatches-aria-label="常用文字颜色"
              clear-label="清除颜色"
              @preview="previewTextColor"
              @change="setTextColor"
              @clear="unsetTextColor"
            >
              <template #icon><Palette /></template>
            </EditorColorPickerPopover>
            <EditorColorPickerPopover
              v-model:show="highlightPopoverOpen"
              v-model:value="highlightColor"
              :recent-colors="recentHighlightColors"
              :swatches="HIGHLIGHT_COLOR_SWATCHES"
              :active="hasActiveHighlight()"
              label="荧光笔"
              recent-swatch-label="设置最近使用的高亮颜色"
              swatch-label="设置高亮颜色"
              recent-aria-label="最近使用的高亮颜色"
              swatches-aria-label="常用高亮颜色"
              clear-label="清除高亮"
              @preview="previewHighlightColor"
              @change="setHighlightColor"
              @clear="unsetHighlightColor"
            >
              <template #icon><Highlighter /></template>
            </EditorColorPickerPopover>
            <span class="bubble-toolbar__separator" aria-hidden="true"></span>
            <EditorAlignmentButtons :active="isTextAligned" :set="setTextAlignment" />
            <span class="bubble-toolbar__separator" aria-hidden="true"></span>
            <EditorHistoryButtons :undo="undo" :redo="redo" />
          </NButtonGroup>
        </EditorBubbleMenu>
        <nav
          v-if="showJumpAid"
          class="editor-jump-aid"
          :class="[`editor-jump-aid--${settings.jumpAid}`, `editor-jump-aid--${jumpAidPosition}`]"
          aria-label="文档跳转辅助"
        >
          <button
            v-for="item in jumpAidItems"
            :key="item.id"
            type="button"
            class="editor-jump-aid__item"
            :class="[
              `editor-jump-aid__item--level-${item.level}`,
              { 'editor-jump-aid__item--active': item.id === activeJumpAidItemId },
            ]"
            :title="item.title"
            @click="jumpToBlock(item)"
          >
            <span class="editor-jump-aid__dot" aria-hidden="true"></span>
            <span v-if="settings.jumpAid === 'outline'" class="editor-jump-aid__label">{{
              item.title
            }}</span>
          </button>
        </nav>
        <EditorContent :editor="editor" />
        <EditorBlockAiEditor
          :open="blockAiOpen"
          :loading="blockAiLoading"
          :error="blockAiError"
          :preview="blockAiPreview"
          :style="{ top: `${blockAiPosition.top}px`, left: `${blockAiPosition.left}px` }"
          @update:open="(value) => (value ? (blockAiOpen = true) : closeBlockAiEditor())"
          @submit="submitBlockAi"
          @accept="acceptBlockAi"
          @reject="rejectBlockAi"
        />
        <EditorFloatingAi
          v-if="!readonly"
          :open="floatingAiOpen"
          :loading="floatingAiLoading"
          :error="floatingAiError"
          :response="floatingAiResponse"
          :events="floatingAiEvents"
          @update:open="(value) => (value ? openFloatingAi() : closeFloatingAi())"
          @submit="submitFloatingAi"
          @cancel="closeFloatingAi"
        />
      </div>
    </template>

    <template #content>
        <ContextMenuLabel class="editor-context-menu__label">文章操作</ContextMenuLabel>
        <ContextMenuItem
          class="editor-context-menu__item"
          :disabled="!editor?.can().undo()"
          @select="editor?.chain().focus().undo().run()"
        >
          <Undo2 :size="15" /><span>撤销</span><kbd>Ctrl Z</kbd>
        </ContextMenuItem>
        <ContextMenuItem
          class="editor-context-menu__item"
          :disabled="!editor?.can().redo()"
          @select="editor?.chain().focus().redo().run()"
        >
          <Redo2 :size="15" /><span>重做</span><kbd>Ctrl Y</kbd>
        </ContextMenuItem>
        <ContextMenuSeparator class="editor-context-menu__separator" />

        <ContextMenuItem
          class="editor-context-menu__item"
          :disabled="readonly || !getContextBlockSnapshot()"
          @select="openBlockAiEditor"
        >
          <Sparkles :size="15" /><span>块内 AI 编辑</span><kbd>↵</kbd>
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger class="editor-context-menu__item editor-context-menu__item--sub">
            <FileText :size="15" /><span>转换块类型</span><span>›</span>
          </ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent class="editor-context-menu">
              <ContextMenuItem
                v-for="blockType in transformBlockTypes"
                :key="blockType.id"
                class="editor-context-menu__item"
                @select="transformContextBlock(blockType)"
              >
                <component
                  :is="getBlockMenuIconComponent(blockType.menuIcon)"
                  v-if="blockType.menuIcon.kind === 'lucide'"
                  :size="15"
                />
                <span v-else class="editor-context-menu__glyph">{{
                  blockType.menuIcon.value
                }}</span>
                <span>{{ blockType.title }}</span>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger class="editor-context-menu__item editor-context-menu__item--sub">
            <Link :size="15" /><span>链接到知识库文档</span><span>›</span>
          </ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent class="editor-context-menu editor-context-menu--documents">
              <ContextMenuItem
                v-if="internalDocuments.length === 0"
                class="editor-context-menu__item"
                disabled
                >暂无其他文档</ContextMenuItem
              >
              <ContextMenuItem
                v-for="target in internalDocuments"
                :key="target.id"
                class="editor-context-menu__item"
                @select="insertInternalDocumentLink(target)"
              >
                <FileText :size="15" /><span>{{ target.title || '未命名文档' }}</span>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>

        <ContextMenuSub>
          <ContextMenuSubTrigger class="editor-context-menu__item editor-context-menu__item--sub">
            <ImagePlus :size="15" /><span>插入块</span><span>›</span>
          </ContextMenuSubTrigger>
          <ContextMenuPortal>
            <ContextMenuSubContent class="editor-context-menu">
              <ContextMenuItem
                v-for="blockType in contextInsertBlockTypes"
                :key="blockType.id"
                class="editor-context-menu__item"
                @select="insertRegisteredBlockAfterContextBlock(blockType)"
              >
                <component
                  :is="getBlockMenuIconComponent(blockType.menuIcon)"
                  v-if="blockType.menuIcon.kind === 'lucide'"
                  :size="15"
                />
                <span v-else class="editor-context-menu__glyph">{{
                  blockType.menuIcon.value
                }}</span>
                <span>插入{{ blockType.title }}</span>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuPortal>
        </ContextMenuSub>
        <ContextMenuSeparator class="editor-context-menu__separator" />
        <ContextMenuItem class="editor-context-menu__item" @select="copyContextBlock">
          <CopyPlus :size="15" /><span>复制当前块</span>
          <small>{{ settings.blockCopyBehavior === 'duplicate' ? '下方重复' : '保留' }}</small>
        </ContextMenuItem>
        <ContextMenuItem
          class="editor-context-menu__item"
          :disabled="!retainedBlockAvailable"
          @select="pasteRetainedBlock"
        >
          <ClipboardPaste :size="15" /><span>粘贴块</span>
        </ContextMenuItem>
        <ContextMenuItem
          class="editor-context-menu__item editor-context-menu__item--danger"
          @select="deleteContextBlock"
        >
          <Trash2 :size="15" /><span>删除当前块</span>
        </ContextMenuItem>
    </template>
  </EditorContextMenu>
</template>
