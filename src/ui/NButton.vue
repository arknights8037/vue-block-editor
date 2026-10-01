<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: 'tiny' | 'small' | 'medium'
    type?: 'default' | 'primary'
    quaternary?: boolean
    secondary?: boolean
    text?: boolean
    circle?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    size: 'medium',
    type: 'default',
  },
)
</script>

<template>
  <button
    type="button"
    class="ui-button"
    :class="[
      `ui-button--${size}`,
      `ui-button--${type}`,
      {
        'ui-button--quaternary': quaternary,
        'ui-button--secondary': secondary,
        'ui-button--text': text,
        'ui-button--circle': circle,
        'ui-button--loading': loading,
      },
    ]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="$slots.icon" class="n-button__icon"><slot name="icon" /></span>
    <span v-if="$slots.default" class="n-button__content"><slot /></span>
  </button>
</template>
