<script setup lang="ts">
import { X } from '@lucide/vue'

import { NButton, NColorPicker, NIcon, NPopover } from '@/ui'

defineProps<{
  show: boolean
  value: string
  recentColors: string[]
  swatches: string[]
  active: boolean
  label: string
  recentSwatchLabel: string
  swatchLabel: string
  recentAriaLabel: string
  swatchesAriaLabel: string
  clearLabel: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  'update:value': [value: string]
  preview: [value: string | null]
  change: [value: string | null]
  clear: []
}>()

function previewColor(value: string | null): void {
  if (value) emit('update:value', value)
  emit('preview', value)
}
</script>

<template>
  <NPopover
    :show="show"
    trigger="click"
    placement="bottom"
    :z-index="1400"
    :show-arrow="false"
    @update:show="emit('update:show', $event)"
  >
    <template #trigger>
      <NButton
        class="bubble-toolbar__button bubble-toolbar__button--color"
        :class="{ 'bubble-toolbar__button--active': active }"
        size="small"
        quaternary
        circle
        :aria-label="label"
        :title="label"
        @mousedown.prevent
      >
        <template #icon><NIcon :size="16"><slot name="icon" /></NIcon></template>
        <span class="bubble-toolbar__color-mark" :style="{ backgroundColor: value }"></span>
      </NButton>
    </template>

    <div class="bubble-color-panel">
      <div v-if="recentColors.length" class="bubble-color-panel__section">
        <span class="bubble-color-panel__label">最近使用</span>
        <div
          class="bubble-color-panel__swatches bubble-color-panel__swatches--recent"
          :aria-label="recentAriaLabel"
        >
          <button
            v-for="recentColor in recentColors"
            :key="recentColor"
            class="bubble-color-panel__swatch"
            :class="{
              'bubble-color-panel__swatch--active':
                value.toLowerCase() === recentColor.toLowerCase(),
            }"
            type="button"
            :style="{ backgroundColor: recentColor }"
            :aria-label="`${recentSwatchLabel} ${recentColor}`"
            @mousedown.prevent
            @click="emit('change', recentColor)"
          ></button>
        </div>
      </div>

      <span class="bubble-color-panel__label">常用颜色</span>
      <div class="bubble-color-panel__swatches" :aria-label="swatchesAriaLabel">
        <button
          v-for="swatch in swatches"
          :key="swatch"
          class="bubble-color-panel__swatch"
          :class="{
            'bubble-color-panel__swatch--active': value.toLowerCase() === swatch.toLowerCase(),
          }"
          type="button"
          :style="{ backgroundColor: swatch }"
          :aria-label="`${swatchLabel} ${swatch}`"
          @mousedown.prevent
          @click="emit('change', swatch)"
        ></button>
      </div>

      <NColorPicker
        :value="value"
        class="bubble-color-panel__picker"
        :show-alpha="false"
        :modes="['hex']"
        size="small"
        @update:value="previewColor"
        @change:value="emit('change', $event)"
      />
      <NButton
        class="bubble-color-panel__clear"
        size="small"
        quaternary
        @mousedown.prevent
        @click="emit('clear')"
      >
        <template #icon><NIcon :size="14"><X /></NIcon></template>
        {{ clearLabel }}
      </NButton>
    </div>
  </NPopover>
</template>
