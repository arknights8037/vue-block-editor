<script setup lang="ts">
import { DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot } from 'reka-ui'

withDefaults(
  defineProps<{
    show?: boolean
    width?: number
    placement?: 'right' | 'left'
  }>(),
  {
    show: false,
    width: 380,
    placement: 'right',
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()
</script>

<template>
  <DialogRoot :open="show" @update:open="emit('update:show', $event)">
    <DialogPortal>
      <DialogOverlay class="ui-dialog-overlay" />
      <DialogContent
        class="ui-drawer"
        :class="`ui-drawer--${placement}`"
        :style="{ width: `${width}px` }"
      >
        <DialogDescription class="ui-visually-hidden">侧边面板</DialogDescription>
        <slot />
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
