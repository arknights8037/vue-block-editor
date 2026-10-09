<script setup lang="ts">
import { Bot, LoaderCircle, Send, X } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
    loading?: boolean
    error?: string
    response?: string
    events?: string[]
  }>(),
  { open: false, loading: false, error: '', response: '', events: () => [] },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [instruction: string]
  cancel: []
}>()

const instruction = ref('')
const inputElement = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick()
      inputElement.value?.focus()
    }
  },
)

function submit(): void {
  const value = instruction.value.trim()
  if (!value || props.loading) return
  instruction.value = ''
  emit('submit', value)
}
</script>

<template>
  <div class="editor-floating-ai" :class="{ 'editor-floating-ai--open': open }">
    <button
      v-if="!open"
      type="button"
      class="editor-floating-ai__trigger"
      aria-label="打开 AI 助手"
      title="AI 助手"
      @click="emit('update:open', true)"
    >
      <Bot :size="18" />
      <span>AI</span>
    </button>
    <section v-else class="editor-floating-ai__panel" role="dialog" aria-label="AI 助手">
      <header class="editor-floating-ai__header">
        <span class="editor-floating-ai__title"><Bot :size="16" />AI 助手</span>
        <button type="button" aria-label="关闭 AI 助手" @click="emit('update:open', false)"><X :size="16" /></button>
      </header>
      <div class="editor-floating-ai__body" aria-live="polite">
        <p v-if="!loading && !response && !events.length && !error" class="editor-floating-ai__hint">
          可以帮你整理、改写、插入或删除文档块。
        </p>
        <p v-for="(event, index) in events" :key="`${event}-${index}`" class="editor-floating-ai__event">{{ event }}</p>
        <p v-if="response" class="editor-floating-ai__response">{{ response }}</p>
        <p v-if="loading" class="editor-floating-ai__thinking"><LoaderCircle class="editor-floating-ai__loading" :size="15" />正在处理…</p>
        <p v-if="error" class="editor-floating-ai__error" role="alert">{{ error }}</p>
      </div>
      <form class="editor-floating-ai__form" @submit.prevent="submit">
        <input
          ref="inputElement"
          v-model="instruction"
          :disabled="loading"
          placeholder="告诉 AI 要做什么…"
          aria-label="AI 助手指令"
          @keydown.esc="emit('update:open', false)"
        />
        <button type="submit" aria-label="发送指令" :disabled="loading || !instruction.trim()"><Send :size="16" /></button>
        <button v-if="loading" type="button" class="editor-floating-ai__cancel" aria-label="停止 AI" @click="emit('cancel')">停止</button>
      </form>
    </section>
  </div>
</template>
