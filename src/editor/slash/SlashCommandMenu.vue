<script setup lang="ts">
import type { SlashCommandItem } from './slashCommandTypes'

const props = withDefaults(defineProps<{
  items: SlashCommandItem[]
  selectedIndex?: number
}>(), { selectedIndex: 0 })

const emit = defineEmits<{ select: [item: SlashCommandItem, index: number] }>()
</script>

<template>
  <div class="slash-command" role="listbox" aria-label="斜杠命令">
    <slot v-if="props.items.length === 0" name="empty">
      <div class="slash-command__empty">无匹配命令</div>
    </slot>
    <button
      v-for="(item, index) in props.items"
      :key="item.id"
      type="button"
      class="slash-command__item"
      :class="{ 'slash-command__item--selected': index === props.selectedIndex }"
      role="option"
      :aria-selected="index === props.selectedIndex"
      @mousedown.prevent="emit('select', item, index)"
    >
      <slot name="item" :item="item" :selected="index === props.selectedIndex">
        <span class="slash-command__icon">{{ item.icon }}</span>
        <span class="slash-command__content">
          <span class="slash-command__title">{{ item.title }}</span>
          <span class="slash-command__description">{{ item.description }}</span>
        </span>
      </slot>
    </button>
    <slot name="footer" :items="props.items" />
  </div>
</template>
