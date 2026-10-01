<script setup lang="ts">
import {
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from 'reka-ui'

withDefaults(
  defineProps<{
    trigger?: string
  }>(),
  { trigger: 'hover' },
)
</script>

<template>
  <TooltipProvider :delay-duration="280">
    <TooltipRoot>
      <TooltipTrigger as-child><slot name="trigger" /></TooltipTrigger>
      <TooltipPortal>
        <TooltipContent class="ui-tooltip" side="top" :side-offset="6">
          <slot />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
