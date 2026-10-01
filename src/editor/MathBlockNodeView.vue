<script setup lang="ts">
import { Sigma } from '@lucide/vue'
import { NodeViewWrapper } from '@tiptap/vue-3'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import {
  MATH_PANEL_TABS,
  MATH_STRUCTURE_SNIPPETS,
  MATH_SYMBOL_GROUPS,
  type MathInputPanel,
  type MathSnippet,
  type MathSymbol,
} from './mathInputCatalog'

interface MathNode {
  attrs: {
    latex?: string | null
    mathml?: string | null
  }
}

const props = defineProps<{
  node: MathNode
  selected: boolean
  updateAttributes: (attributes: Record<string, unknown>) => void
}>()

const latex = computed(() => props.node.attrs.latex || '')
const fieldElement = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const previewFormulaElement = ref<InstanceType<typeof globalThis.HTMLElement> | null>(null)
const inputElement = ref<InstanceType<typeof globalThis.HTMLTextAreaElement> | null>(null)
const renderError = ref('')
const activePanel = ref<MathInputPanel>('structure')
const isPanelOpen = ref(false)
type KatexApi = typeof import('katex').default
let katexPromise: Promise<KatexApi> | undefined
let katexCssPromise: Promise<unknown> | undefined
const activeSymbols = computed(() =>
  activePanel.value === 'structure' ? [] : MATH_SYMBOL_GROUPS[activePanel.value],
)

async function renderFormulaPreview(): Promise<void> {
  const element = previewFormulaElement.value
  if (!element) return

  const source = latex.value.trim()
  renderError.value = ''

  if (!source) {
    element.replaceChildren()
    return
  }

  try {
    katexPromise ??= import('katex').then((module) => module.default)
    katexCssPromise ??= import('katex/dist/katex.min.css')
    const katex = await katexPromise
    if (!previewFormulaElement.value || source !== latex.value.trim()) return
    katex.render(source, element, {
      displayMode: false,
      throwOnError: false,
      strict: 'ignore',
      trust: false,
    })
  } catch (error) {
    renderError.value = error instanceof Error ? error.message : '公式渲染失败'
  }
}

function updateLatex(value: string): void {
  props.updateAttributes({ latex: value, mathml: '' })
}

function openPanel(panel?: MathInputPanel): void {
  if (panel) activePanel.value = panel
  isPanelOpen.value = true
}

function closePanel(): void {
  isPanelOpen.value = false
  inputElement.value?.blur()
}

function isFocusInsideField(): boolean {
  const activeElement = globalThis.document.activeElement
  return Boolean(activeElement instanceof globalThis.Node && fieldElement.value?.contains(activeElement))
}

function closePanelWhenFocusLeaves(event: InstanceType<typeof globalThis.FocusEvent>): void {
  const nextTarget = event.relatedTarget
  if (nextTarget instanceof globalThis.Node && event.currentTarget instanceof globalThis.Node) {
    if (event.currentTarget.contains(nextTarget)) {
      return
    }
  }

  closePanel()
}

function closePanelOnOutsidePointerDown(event: InstanceType<typeof globalThis.PointerEvent>): void {
  if (!isPanelOpen.value) {
    return
  }

  const target = event.target
  const field = fieldElement.value
  if (target instanceof globalThis.Node && field?.contains(target)) {
    return
  }

  closePanel()
}

function insertSnippet(snippet: MathSnippet): void {
  openPanel('structure')
  insertText(snippet.value, snippet.selectText)
}

function insertSymbol(symbol: MathSymbol): void {
  insertText(symbol.value)
}

function insertText(value: string, selectText?: string): void {
  const input = inputElement.value
  if (!input) {
    updateLatex(`${latex.value}${value}`)
    return
  }

  const selectionStart = input.selectionStart
  const selectionEnd = input.selectionEnd
  const currentValue = input.value
  const nextValue = `${currentValue.slice(0, selectionStart)}${value}${currentValue.slice(
    selectionEnd,
  )}`

  updateLatex(nextValue)

  void nextTick(() => {
    input.focus()

    if (selectText) {
      const selectStart = nextValue.indexOf(selectText, selectionStart)
      if (selectStart >= 0) {
        input.setSelectionRange(selectStart, selectStart + selectText.length)
        return
      }
    }

    const cursorPosition = selectionStart + value.length
    input.setSelectionRange(cursorPosition, cursorPosition)
  })
}

watch(latex, renderFormulaPreview, { immediate: true, flush: 'post' })
watch(
  () => props.selected,
  (selected) => {
    if (selected) {
      openPanel()
      return
    }

    if (!isFocusInsideField()) {
      closePanel()
    }
  },
  { immediate: true, flush: 'post' },
)

onMounted(() => {
  globalThis.document.addEventListener('pointerdown', closePanelOnOutsidePointerDown, true)
  void nextTick(renderFormulaPreview)
})

onBeforeUnmount(() => {
  globalThis.document.removeEventListener('pointerdown', closePanelOnOutsidePointerDown, true)
})
</script>

<template>
  <NodeViewWrapper
    as="div"
    class="math-block"
    :class="{ 'math-block--selected': selected, 'math-block--panel-open': isPanelOpen }"
    contenteditable="false"
    @focusin="openPanel()"
    @focusout="closePanelWhenFocusLeaves"
  >
    <div ref="fieldElement" class="math-block__field">
      <div class="math-block__result-row" aria-label="公式渲染结果" @click="openPanel()">
        <span class="math-block__field-icon"><Sigma :size="15" /></span>
        <span ref="previewFormulaElement" class="math-block__rendered"></span>
        <span v-if="!latex" class="math-block__placeholder">点击编辑公式</span>
      </div>

      <label v-if="isPanelOpen" class="math-block__latex-row">
        <span>LaTeX</span>
        <textarea
          ref="inputElement"
          :value="latex"
          rows="1"
          spellcheck="false"
          aria-label="公式内容"
          placeholder="也可以直接输入：E = mc^2"
          @focus="openPanel()"
          @input="updateLatex(($event.target as HTMLTextAreaElement).value)"
        ></textarea>
      </label>

      <div v-if="isPanelOpen" class="math-block__popover" aria-label="公式输入面板">
        <div class="math-block__type-list" aria-label="输入类型">
          <button
            v-for="tab in MATH_PANEL_TABS"
            :key="tab.id"
            type="button"
            :class="{ 'math-block__type-button--active': activePanel === tab.id }"
            @mousedown.prevent
            @click="openPanel(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="math-block__panel-content">
          <div v-if="activePanel === 'structure'" class="math-block__template-grid">
            <button
              v-for="snippet in MATH_STRUCTURE_SNIPPETS"
              :key="snippet.value"
              type="button"
              class="math-block__template-button"
              :title="snippet.title"
              @mousedown.prevent
              @click="insertSnippet(snippet)"
            >
              <span class="math-template" :data-kind="snippet.kind">
                <template v-if="snippet.kind === 'fraction'">
                  <span class="math-template__fraction">
                    <span>a</span>
                    <span>b</span>
                  </span>
                </template>
                <template v-else-if="snippet.kind === 'sqrt'">
                  <span class="math-template__sqrt">x</span>
                </template>
                <template v-else-if="snippet.kind === 'power'"> x<sup>2</sup> </template>
                <template v-else-if="snippet.kind === 'subscript'"> x<sub>1</sub> </template>
                <template v-else-if="snippet.kind === 'powerSubscript'">
                  x<sub>1</sub><sup>2</sup>
                </template>
                <template v-else-if="snippet.kind === 'brackets'">( x )</template>
                <template v-else-if="snippet.kind === 'matrix'">
                  <span class="math-template__matrix">
                    <span>a</span>
                    <span>b</span>
                    <span>c</span>
                    <span>d</span>
                  </span>
                </template>
              </span>
            </button>
          </div>

          <div v-else class="math-block__symbol-grid">
            <button
              v-for="symbol in activeSymbols"
              :key="symbol.value"
              type="button"
              :title="symbol.title"
              :aria-label="symbol.title"
              @mousedown.prevent
              @click="insertSymbol(symbol)"
            >
              {{ symbol.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <p v-if="isPanelOpen && renderError" class="math-block__error">{{ renderError }}</p>
  </NodeViewWrapper>
</template>
