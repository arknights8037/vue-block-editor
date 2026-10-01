<script setup lang="ts">
import type { TableField } from '../tableFields'

defineProps<{
  fields: TableField[]
  readonly?: boolean
}>()

defineEmits<{
  update: [columnIndex: number, value: string]
}>()
</script>

<template>
  <thead v-if="fields.length">
    <tr>
      <th v-for="(field, columnIndex) in fields" :key="field.id">
        <input
          v-if="!readonly"
          :value="field.name"
          :aria-label="`第 ${columnIndex + 1} 列标题`"
          @input="$emit('update', columnIndex, ($event.target as HTMLInputElement).value)"
        />
        <span v-else>{{ field.name }}</span>
      </th>
    </tr>
  </thead>
</template>
