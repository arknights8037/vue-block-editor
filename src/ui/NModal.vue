<script setup lang="ts">
import { X } from '@lucide/vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { nextTick, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    show?: boolean
    title?: string
  }>(),
  {
    show: false,
    title: '',
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
  afterLeave: []
}>()

watch(
  () => props.show,
  async (show, previousShow) => {
    if (!show && previousShow) {
      await nextTick()
      emit('afterLeave')
    }
  },
)
</script>

<template>
  <DialogRoot :open="show" @update:open="emit('update:show', $event)">
    <DialogPortal>
      <DialogOverlay class="ui-dialog-overlay" />
      <DialogContent
        class="ui-dialog-card"
        :class="$attrs.class"
        :style="$attrs.style"
        @open-auto-focus.prevent
      >
        <DialogDescription class="ui-visually-hidden">{{ title }}对话框</DialogDescription>
        <header class="ui-dialog-card__header">
          <DialogTitle class="ui-dialog-card__title">{{ title }}</DialogTitle>
          <DialogClose class="ui-dialog-card__close" aria-label="关闭"
            ><X :size="18"
          /></DialogClose>
        </header>
        <div class="ui-dialog-card__body"><slot /></div>
        <footer v-if="$slots.footer" class="ui-dialog-card__footer"><slot name="footer" /></footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
