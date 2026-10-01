<script setup lang="ts">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    show?: boolean
    placement?: string
    zIndex?: number
    trigger?: string
    showArrow?: boolean
  }>(),
  {
    show: false,
    placement: 'bottom',
    zIndex: 1400,
    trigger: 'click',
    showArrow: false,
  },
)

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

function sideFromPlacement(): 'top' | 'right' | 'bottom' | 'left' {
  if (props.placement.startsWith('top')) return 'top'
  if (props.placement.startsWith('left')) return 'left'
  if (props.placement.startsWith('right')) return 'right'
  return 'bottom'
}
</script>

<template>
  <PopoverRoot :open="show" @update:open="emit('update:show', $event)">
    <PopoverTrigger as-child><slot name="trigger" /></PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        class="ui-popover"
        :side="sideFromPlacement()"
        :side-offset="7"
        :style="{ zIndex }"
        @open-auto-focus.prevent
      >
        <slot />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
