<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const inputProps = withDefaults(
  defineProps<{
    value?: string
    size?: 'small' | 'medium'
    bordered?: boolean
    disabled?: boolean
    autofocus?: boolean
    placeholder?: string
    maxlength?: number | string
    showCount?: boolean
    clearable?: boolean
  }>(),
  {
    value: '',
    size: 'medium',
    bordered: true,
    disabled: false,
    autofocus: false,
    placeholder: '',
    maxlength: undefined,
    showCount: false,
    clearable: false,
  },
)

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const attrs = useAttrs()
const inputElement = ref<InstanceType<typeof globalThis.HTMLInputElement> | null>(null)
const inputAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style')),
)

type InputEvent = InstanceType<typeof globalThis.Event>

function handleInput(event: InputEvent): void {
  const target = event.target
  if (target instanceof globalThis.HTMLInputElement) {
    emit('update:value', target.value)
  }
}

onMounted(async () => {
  if (inputProps.autofocus) {
    await nextTick()
    inputElement.value?.focus()
  }
})
</script>

<template>
  <label
    class="ui-input n-input"
    :class="[
      attrs.class,
      `ui-input--${size}`,
      { 'ui-input--borderless': !bordered, 'ui-input--disabled': disabled },
    ]"
    :style="attrs.style"
  >
    <span v-if="$slots.prefix" class="ui-input__prefix"><slot name="prefix" /></span>
    <input
      ref="inputElement"
      v-bind="inputAttrs"
      class="ui-input__control n-input__input-el"
      :value="value"
      :disabled="disabled"
      :autofocus="autofocus"
      :placeholder="placeholder"
      :maxlength="maxlength ? Number(maxlength) : undefined"
      @input="handleInput"
    />
    <button
      v-if="clearable && value"
      type="button"
      class="ui-input__clear"
      aria-label="清空"
      @click="emit('update:value', '')"
    >
      ×
    </button>
    <span v-if="showCount" class="ui-input__count"
      >{{ value.length }}<template v-if="maxlength">/{{ maxlength }}</template></span
    >
  </label>
</template>
