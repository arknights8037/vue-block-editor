<script setup lang="ts">
import { Info, Pencil, Plus, Trash2 } from '@lucide/vue'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from 'reka-ui'

import type { DocumentSummary } from '@/models/document'

defineOptions({ name: 'DocumentTreeContextMenu' })
const props = defineProps<{ document: DocumentSummary }>()

const emit = defineEmits<{
  createChild: []
  properties: []
  rename: []
  delete: []
}>()
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <slot name="trigger" :document="props.document" />
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <ContextMenuContent class="document-card-menu" :collision-padding="8">
        <slot name="content" :document="props.document">
          <ContextMenuItem class="document-card-menu__item" @select="emit('createChild')">
            <Plus :size="14" />新建子页面
          </ContextMenuItem>
          <ContextMenuItem class="document-card-menu__item" @select="emit('properties')">
            <Info :size="14" />属性
          </ContextMenuItem>
          <ContextMenuItem class="document-card-menu__item" @select="emit('rename')">
            <Pencil :size="14" />重命名
          </ContextMenuItem>
          <ContextMenuSeparator class="document-card-menu__separator" />
          <ContextMenuItem
            class="document-card-menu__item document-card-menu__item--danger"
            @select="emit('delete')"
          >
            <Trash2 :size="14" />删除
          </ContextMenuItem>
        </slot>
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
