<script setup lang="ts">
import { X } from '@lucide/vue'
import { DialogClose, DialogTitle } from 'reka-ui'

withDefaults(
  defineProps<{
    title?: string
    closable?: boolean
  }>(),
  {
    title: '',
    closable: false,
  },
)
</script>

<template>
  <div class="ui-drawer-content">
    <header class="ui-drawer-content__header">
      <DialogTitle class="ui-drawer-content__title">{{ title }}</DialogTitle>
      <DialogClose v-if="closable" class="ui-dialog-card__close" aria-label="关闭"
        ><X :size="18"
      /></DialogClose>
    </header>
    <div class="ui-drawer-content__body"><slot /></div>
  </div>
</template>
