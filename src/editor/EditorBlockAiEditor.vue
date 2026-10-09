<script setup lang="ts">
import { Bot, LoaderCircle, X } from '@lucide/vue'
import { nextTick, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open?: boolean
    loading?: boolean
    error?: string
    blockLabel?: string
    preview?: string
  }>(),
  { open: false, loading: false, error: '', blockLabel: '当前段落', preview: '' },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [instruction: string]
  accept: []
  reject: []
}>()

const instruction = ref('')
const inputElement = ref<HTMLInputElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (open) {
      instruction.value = ''
      await nextTick()
      inputElement.value?.focus()
    }
  },
)

function submit(): void {
  const value = instruction.value.trim()
  if (!value || props.loading) return
  emit('submit', value)
}

function close(): void {
  if (!props.loading) emit('update:open', false)
}
</script>

<template>
  <div v-if="open" class="editor-block-ai" role="dialog" aria-label="块内 AI 编辑">
    <div class="editor-block-ai__leading">
      <Bot :size="16" aria-hidden="true" />
      <span>编辑{{ blockLabel }}</span>
    </div>
    <input
      ref="inputElement"
      v-model="instruction"
      class="editor-block-ai__input"
      :disabled="loading"
      placeholder="例如：改得更简洁，按回车执行"
      aria-label="块内 AI 编辑指令"
      @keydown.enter.prevent="submit"
      @keydown.esc="close"
    />
    <LoaderCircle v-if="loading" class="editor-block-ai__loading" :size="16" aria-label="处理中" />
    <button v-else type="button" class="editor-block-ai__close" aria-label="关闭块内 AI 编辑" @click="close">
      <X :size="15" />
    </button>
    <div v-if="preview" class="editor-block-ai__preview">
      <span class="editor-block-ai__preview-label">AI 修改预览</span>
      <div class="editor-block-ai__preview-content">{{ preview }}</div>
      <div class="editor-block-ai__actions">
        <button type="button" class="editor-block-ai__reject" @click="emit('reject')">不接受</button>
        <button type="button" class="editor-block-ai__accept" @click="emit('accept')">接受修改</button>
      </div>
    </div>
    <p v-if="error" class="editor-block-ai__error" role="alert">{{ error }}</p>
  </div>
</template>
