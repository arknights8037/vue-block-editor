<script setup lang="ts">
import { Check, ChevronDown, Code2, Copy } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { getBlockIndentAttributes, INDENT_ATTRIBUTE } from './blockIndent'
import { NButton, NIcon, NInput, NSelect, useMessage } from '@/ui'

interface CodeBlockNodeAttrs {
  language?: string | null
  title?: string | null
  wrap?: boolean | null
  [INDENT_ATTRIBUTE]?: number | null
}

interface CodeBlockNode {
  attrs: CodeBlockNodeAttrs
  textContent: string
}

type MermaidApi = typeof import('mermaid').default

const props = defineProps<{
  node: CodeBlockNode
  updateAttributes: (attributes: CodeBlockNodeAttrs) => void
  editor: { isEditable: boolean }
}>()

const message = useMessage()
const copied = ref(false)
const mermaidPreview = ref<globalThis.HTMLDivElement | null>(null)
const mermaidError = ref('')
const mermaidRendering = ref(false)
const mermaidRenderBaseId = `code-block-mermaid-${Math.random().toString(36).slice(2)}`
let mermaidRenderRequest = 0
let mermaidRenderTimer: ReturnType<typeof globalThis.setTimeout> | undefined
let initializedMermaidTheme: 'default' | 'dark' | undefined
let mermaidApiPromise: Promise<MermaidApi> | undefined

const languageOptions = [
  { label: 'Plain text', value: 'plaintext' },
  { label: 'Mermaid', value: 'mermaid' },
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Vue', value: 'vue' },
  { label: 'HTML', value: 'xml' },
  { label: 'CSS', value: 'css' },
  { label: 'JSON', value: 'json' },
  { label: 'Rust', value: 'rust' },
  { label: 'SQL', value: 'sql' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'Bash', value: 'bash' },
  { label: 'Shell', value: 'shell' },
  { label: 'Python', value: 'python' },
]

const language = computed({
  get: () => props.node.attrs.language ?? 'plaintext',
  set: (value: string) => {
    props.updateAttributes({ language: value })
  },
})

const title = computed({
  get: () => props.node.attrs.title ?? '',
  set: (value: string) => {
    props.updateAttributes({ title: value })
  },
})

const wrap = computed({
  get: () => props.node.attrs.wrap !== false,
  set: (value: boolean) => {
    props.updateAttributes({ wrap: value })
  },
})

const lineNumbers = computed(() => {
  const lineCount = Math.max(props.node.textContent.split('\n').length, 1)
  return Array.from({ length: lineCount }, (_value, index) => index + 1)
})

const isMermaid = computed(() => normalizeLanguage(language.value) === 'mermaid')

const mermaidSource = computed(() => props.node.textContent.trim())

const wrapperAttributes = computed(() =>
  getBlockIndentAttributes(props.node.attrs[INDENT_ATTRIBUTE]),
)

async function copyCode(): Promise<void> {
  const code = props.node.textContent

  try {
    if (globalThis.navigator?.clipboard) {
      await globalThis.navigator.clipboard.writeText(code)
    } else {
      copyWithTextArea(code)
    }
    copied.value = true
    message.success('代码已复制')
    globalThis.setTimeout(() => {
      copied.value = false
    }, 1400)
  } catch {
    message.error('复制失败')
  }
}

function copyWithTextArea(code: string): void {
  const textArea = globalThis.document.createElement('textarea')
  textArea.value = code
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  globalThis.document.body.append(textArea)
  textArea.select()
  globalThis.document.execCommand('copy')
  textArea.remove()
}

watch(
  [mermaidSource, isMermaid],
  () => {
    queueMermaidRender()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (mermaidRenderTimer) {
    globalThis.clearTimeout(mermaidRenderTimer)
  }
})

function normalizeLanguage(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function queueMermaidRender(): void {
  if (mermaidRenderTimer) {
    globalThis.clearTimeout(mermaidRenderTimer)
  }

  if (!isMermaid.value) {
    clearMermaidPreview()
    return
  }

  mermaidRenderTimer = globalThis.setTimeout(() => {
    void renderMermaid()
  }, 180)
}

async function renderMermaid(): Promise<void> {
  const source = mermaidSource.value
  const requestId = ++mermaidRenderRequest

  mermaidError.value = ''
  clearMermaidPreview()

  if (!isMermaid.value || !source) {
    mermaidRendering.value = false
    return
  }

  mermaidRendering.value = true

  try {
    const mermaidApi = await initializeMermaid()
    const { svg, bindFunctions } = await mermaidApi.render(
      `${mermaidRenderBaseId}-${requestId}`,
      source,
    )

    if (requestId !== mermaidRenderRequest) {
      return
    }

    mermaidRendering.value = false
    await nextTick()

    if (!mermaidPreview.value) {
      return
    }

    mermaidPreview.value.innerHTML = svg
    bindFunctions?.(mermaidPreview.value)
  } catch (error) {
    if (requestId !== mermaidRenderRequest) {
      return
    }

    mermaidRendering.value = false
    mermaidError.value = getMermaidErrorMessage(error)
    clearMermaidPreview()
  }
}

async function initializeMermaid(): Promise<MermaidApi> {
  const mermaidApi = await loadMermaid()
  const theme = getMermaidTheme()

  if (initializedMermaidTheme === theme) {
    return mermaidApi
  }

  mermaidApi.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
  })
  initializedMermaidTheme = theme

  return mermaidApi
}

function loadMermaid(): Promise<MermaidApi> {
  mermaidApiPromise ??= import('mermaid').then((module) => module.default)
  return mermaidApiPromise
}

function clearMermaidPreview(): void {
  if (mermaidPreview.value) {
    mermaidPreview.value.innerHTML = ''
  }
}

function getMermaidTheme(): 'default' | 'dark' {
  return globalThis.document?.documentElement.dataset.themeMode === 'dark' ? 'dark' : 'default'
}

function getMermaidErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Mermaid 图表渲染失败，请检查语法。'
}
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="editor-block-container editor-block-container--code-block"
    v-bind="wrapperAttributes"
  >
    <div
      class="code-block-node"
      :class="{
        'code-block-node--wrap': wrap,
        'code-block-node--mermaid': isMermaid,
        'code-block-node--readonly': !editor.isEditable,
      }"
    >
      <div v-if="editor.isEditable" class="code-block-node__toolbar" contenteditable="false">
        <div class="code-block-node__leading">
          <NIcon class="code-block-node__chevron" :size="16">
            <ChevronDown />
          </NIcon>
          <NInput
            v-model:value="title"
            class="code-block-node__title"
            size="small"
            placeholder="请输入代码块名称"
            :bordered="false"
          />
        </div>
        <div class="code-block-node__actions">
          <NSelect
            v-model:value="language"
            class="code-block-node__language"
            size="small"
            :options="languageOptions"
            :consistent-menu-width="false"
          />
          <span class="code-block-node__divider" aria-hidden="true"></span>
          <NButton class="code-block-node__wrap" text @click="wrap = !wrap">
            <template #icon>
              <NIcon :size="16"><Code2 /></NIcon>
            </template>
            自动换行 {{ wrap ? '开启' : '关闭' }}
          </NButton>
          <span class="code-block-node__divider" aria-hidden="true"></span>
          <NButton size="small" secondary @click="copyCode">
            <template #icon>
              <NIcon :size="15">
                <Check v-if="copied" />
                <Copy v-else />
              </NIcon>
            </template>
            {{ copied ? '已复制' : '复制' }}
          </NButton>
        </div>
      </div>
      <div v-if="isMermaid" class="code-block-node__mermaid-preview" contenteditable="false">
        <div v-if="mermaidRendering" class="code-block-node__mermaid-status">
          正在渲染 Mermaid 图表…
        </div>
        <div v-else-if="mermaidError" class="code-block-node__mermaid-error">
          <strong>Mermaid 渲染失败</strong>
          <span>{{ mermaidError }}</span>
        </div>
        <div v-else-if="!mermaidSource" class="code-block-node__mermaid-empty">
          输入 Mermaid 语法后会在这里预览图表
        </div>
        <div
          ref="mermaidPreview"
          class="code-block-node__mermaid-svg"
          :hidden="mermaidRendering || Boolean(mermaidError) || !mermaidSource"
        ></div>
      </div>
      <div v-if="editor.isEditable || !isMermaid" class="code-block-node__body">
        <div class="code-block-node__gutter" contenteditable="false" aria-hidden="true">
          <span v-for="lineNumber in lineNumbers" :key="lineNumber">{{ lineNumber }}</span>
        </div>
        <pre><NodeViewContent as="code" /></pre>
      </div>
    </div>
  </NodeViewWrapper>
</template>
