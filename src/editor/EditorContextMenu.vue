<script setup lang="ts">
import {
  ContextMenuContent,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuTrigger,
} from 'reka-ui'

withDefaults(defineProps<{ collisionPadding?: number }>(), { collisionPadding: 10 })
</script>

<template>
  <ContextMenuRoot>
    <ContextMenuTrigger as-child>
      <slot name="trigger" />
    </ContextMenuTrigger>
    <ContextMenuPortal>
      <ContextMenuContent class="editor-context-menu" :collision-padding="collisionPadding">
        <slot name="content" />
      </ContextMenuContent>
    </ContextMenuPortal>
  </ContextMenuRoot>
</template>
