<script setup lang="ts">
import { Ellipsis, Info, Pencil, Plus, Trash2 } from '@lucide/vue'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'

import type { DocumentSummary } from '@/models/document'
import { NButton, NIcon, NTooltip } from '@/ui'

defineOptions({ name: 'DocumentTreeNodeActions' })

const props = defineProps<{ document: DocumentSummary; busy: boolean }>()
const emit = defineEmits<{
  createChild: []
  properties: []
  rename: []
  delete: []
}>()

function displayTitle(document: DocumentSummary): string {
  const title = document.title.trim()
  return title.length > 0 ? title : '未命名文档'
}
</script>

<template>
  <NTooltip trigger="hover">
    <template #trigger>
      <NButton
        class="document-list__more"
        size="tiny"
        quaternary
        :aria-label="`${displayTitle(props.document)}中新建子页面`"
        :disabled="props.busy"
        @click.stop="emit('createChild')"
        @dragstart.stop.prevent
      >
        <template #icon><NIcon :size="14"><Plus /></NIcon></template>
      </NButton>
    </template>
    新建子页面
  </NTooltip>

  <DropdownMenuRoot>
    <DropdownMenuTrigger as-child>
      <NButton
        class="document-list__more"
        size="tiny"
        quaternary
        :aria-label="`${displayTitle(props.document)}更多操作`"
        :disabled="props.busy"
        @click.stop
        @dragstart.stop.prevent
      >
        <template #icon><NIcon :size="15"><Ellipsis /></NIcon></template>
      </NButton>
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent class="document-card-menu" align="end" :side-offset="5">
        <DropdownMenuItem class="document-card-menu__item" @select="emit('createChild')">
          <Plus :size="14" />新建子页面
        </DropdownMenuItem>
        <DropdownMenuItem class="document-card-menu__item" @select="emit('properties')">
          <Info :size="14" />属性
        </DropdownMenuItem>
        <DropdownMenuItem class="document-card-menu__item" @select="emit('rename')">
          <Pencil :size="14" />重命名
        </DropdownMenuItem>
        <DropdownMenuSeparator class="document-card-menu__separator" />
        <DropdownMenuItem
          class="document-card-menu__item document-card-menu__item--danger"
          @select="emit('delete')"
        >
          <Trash2 :size="14" />删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
