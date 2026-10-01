<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value?: string
    disabled?: boolean
  }>(),
  {
    value: '#333333',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:value': [value: string]
  'change:value': [value: string]
}>()

type InputEvent = InstanceType<typeof globalThis.Event>

const nativeColorValue = computed(() => normalizeColorToHex(props.value))

function handleInput(event: InputEvent): void {
  const target = event.target
  if (target instanceof globalThis.HTMLInputElement) emit('update:value', target.value)
}

function handleChange(event: InputEvent): void {
  const target = event.target
  if (target instanceof globalThis.HTMLInputElement) emit('change:value', target.value)
}

function normalizeColorToHex(color: string): string {
  const normalized = color.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized

  const shortHex = normalized.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/)
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`
  }

  const rgb = normalized.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/,
  )
  if (rgb) {
    return `#${[rgb[1], rgb[2], rgb[3]]
      .map((channel) =>
        Math.max(0, Math.min(255, Math.round(Number(channel))))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`
  }

  return '#333333'
}
</script>

<template>
  <label class="ui-color-picker">
    <input
      type="color"
      :value="nativeColorValue"
      :disabled="disabled"
      @input="handleInput"
      @change="handleChange"
    />
    <span>{{ value }}</span>
  </label>
</template>
