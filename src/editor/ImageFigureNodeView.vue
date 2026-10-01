<script setup lang="ts">
import { AlertCircle, ImagePlus, RefreshCw, Trash2 } from '@lucide/vue'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/vue-3'
import { computed, ref, watch } from 'vue'

import { readImageFileAsDataUrl, validateImageFile } from './imageFile'
import { getAssetUrl, useAssetService } from '@/infrastructure/assets/AssetService'
import { parseAssetUrl } from '@/models/asset'

interface ImageFigureNode {
  attrs: {
    src?: string | null
    alt?: string | null
    originalName?: string | null
  }
  content: {
    size: number
  }
}

const props = defineProps<{
  node: ImageFigureNode
  selected: boolean
  updateAttributes: (attributes: Record<string, unknown>) => void
  deleteNode: () => void
}>()
const assets = useAssetService()

type BrowserFile = InstanceType<typeof globalThis.File>
type BrowserEvent = InstanceType<typeof globalThis.Event>
type BrowserDragEvent = InstanceType<typeof globalThis.DragEvent>

const fileInput = ref<InstanceType<typeof globalThis.HTMLInputElement> | null>(null)
const isLoading = ref(false)
const errorMessage = ref('')
const resolvedSrc = ref('')
const hasImage = computed(() => Boolean(props.node.attrs.src))
const hasCaption = computed(() => props.node.content.size > 0)

function openFilePicker(): void {
  if (!isLoading.value) {
    fileInput.value?.click()
  }
}

async function useFile(file: BrowserFile | undefined): Promise<void> {
  if (!file) return

  const validationError = validateImageFile(file)
  if (validationError) {
    errorMessage.value = validationError
    return
  }

  isLoading.value = true
  errorMessage.value = ''

  try {
    let src = ''
    try {
      const asset = await assets.storeFile(file)
      src = getAssetUrl(asset.id)
    } catch {
      src = await readImageFileAsDataUrl(file)
    }
    props.updateAttributes({
      src,
      alt: file.name,
      originalName: file.name,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法读取图片'
  } finally {
    isLoading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

function handleFileChange(event: BrowserEvent): void {
  const input = event.target as InstanceType<typeof globalThis.HTMLInputElement>
  void useFile(input.files?.[0])
}

function handleDrop(event: BrowserDragEvent): void {
  event.preventDefault()
  void useFile(event.dataTransfer?.files[0])
}

async function resolveImageSource(src: string | null | undefined): Promise<void> {
  const nextSrc = src ?? ''
  if (!parseAssetUrl(nextSrc)) {
    resolvedSrc.value = nextSrc
    return
  }

  try {
    resolvedSrc.value = await assets.resolveAssetUrl(nextSrc)
  } catch {
    resolvedSrc.value = ''
  }
}

watch(() => props.node.attrs.src, resolveImageSource, { immediate: true })
</script>

<template>
  <NodeViewWrapper
    as="figure"
    class="image-figure"
    :class="{
      'image-figure--selected': selected,
      'image-figure--empty': !hasImage,
    }"
    data-image-figure
  >
    <input
      ref="fileInput"
      class="image-figure__file-input"
      type="file"
      accept="image/*"
      tabindex="-1"
      aria-hidden="true"
      @change="handleFileChange"
    />

    <div
      v-if="!hasImage"
      class="image-figure__dropzone"
      contenteditable="false"
      role="button"
      tabindex="0"
      aria-label="选择图片"
      @click="openFilePicker"
      @keydown.enter.prevent="openFilePicker"
      @keydown.space.prevent="openFilePicker"
      @dragover.prevent
      @drop="handleDrop"
    >
      <ImagePlus :size="28" />
      <span>{{ isLoading ? '正在读取图片…' : '选择图片，或拖到这里' }}</span>
      <small>支持常见图片格式，最大 15 MB</small>
    </div>

    <div v-else class="image-figure__media" contenteditable="false">
      <img :src="resolvedSrc" :alt="node.attrs.alt || ''" draggable="false" />
      <div class="image-figure__actions" aria-label="图片操作">
        <button type="button" title="更换图片" aria-label="更换图片" @click="openFilePicker">
          <RefreshCw :size="15" />
        </button>
        <button type="button" title="删除图片" aria-label="删除图片" @click="deleteNode">
          <Trash2 :size="15" />
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="image-figure__error" contenteditable="false">
      <AlertCircle :size="14" />
      {{ errorMessage }}
    </p>

    <NodeViewContent
      as="figcaption"
      class="image-figure__caption"
      :class="{ 'image-figure__caption--empty': !hasCaption }"
      data-placeholder="添加题注（可选）"
    />
  </NodeViewWrapper>
</template>
