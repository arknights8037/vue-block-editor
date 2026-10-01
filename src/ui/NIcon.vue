<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    size?: number | string
  }>(),
  { size: 16 },
)

const iconSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
</script>

<template>
  <span class="ui-icon" :style="{ width: iconSize, height: iconSize, fontSize: iconSize }">
    <slot />
  </span>
</template>
