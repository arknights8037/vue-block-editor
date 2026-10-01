<script setup lang="ts">
import { Download, FileText, ExternalLink, Upload } from '@lucide/vue'
import { computed, ref } from 'vue'
import { NodeViewWrapper } from '@tiptap/vue-3'

import { getAssetDisplayName, useAssetService } from '@/infrastructure/assets/AssetService'
import type { AssetRecord } from '@/models/asset'

interface AttachmentNode {
  attrs: {
    assetId?: string | null
    name?: string | null
    mimeType?: string | null
    sizeBytes?: number | null
  }
}

const props = defineProps<{
  node: AttachmentNode
  selected: boolean
  updateAttributes: (attributes: Record<string, unknown>) => void
}>()
const assets = useAssetService()

const asset = ref<AssetRecord | null>(null)
const isOpening = ref(false)
const isSaving = ref(false)
const errorMessage = ref('')
const fileInput = ref<InstanceType<typeof globalThis.HTMLInputElement> | null>(null)

const hasAsset = computed(() => Boolean(props.node.attrs.assetId))
const displayName = computed(
  () => props.node.attrs.name || getAssetDisplayName(asset.value) || '附件',
)
const mimeType = computed(() => props.node.attrs.mimeType || asset.value?.mimeType || '未知类型')
const sizeText = computed(() => formatFileSize(props.node.attrs.sizeBytes ?? asset.value?.sizeBytes ?? 0))

async function loadAsset(): Promise<void> {
  const assetId = props.node.attrs.assetId
  if (!assetId) return
  asset.value = await assets.findAsset(assetId)
}

async function openAttachment(): Promise<void> {
  const assetId = props.node.attrs.assetId
  if (!assetId || isOpening.value) return
  isOpening.value = true
  errorMessage.value = ''
  try {
    await assets.openAsset(assetId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法打开附件'
  } finally {
    isOpening.value = false
  }
}

function chooseFile(): void {
  if (!isSaving.value) fileInput.value?.click()
}

async function handleFileChange(event: InstanceType<typeof globalThis.Event>): Promise<void> {
  const input = event.target as InstanceType<typeof globalThis.HTMLInputElement>
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  isSaving.value = true
  errorMessage.value = ''
  try {
    const stored = await assets.storeFile(file)
    asset.value = stored
    props.updateAttributes({
      assetId: stored.id,
      name: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '无法保存附件'
  } finally {
    isSaving.value = false
  }
}

void loadAsset()

function formatFileSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return '未知大小'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = sizeBytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}
</script>

<template>
  <NodeViewWrapper
    as="section"
    class="attachment-block"
    :class="{ 'attachment-block--selected': selected }"
    contenteditable="false"
    data-attachment-block
  >
    <input
      ref="fileInput"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      class="attachment-block__file-input"
      @change="handleFileChange"
    />
    <div class="attachment-block__icon">
      <FileText v-if="hasAsset" :size="22" />
      <Upload v-else :size="22" />
    </div>
    <div class="attachment-block__body">
      <strong>{{ hasAsset ? displayName : '选择附件' }}</strong>
      <span>{{ hasAsset ? mimeType + ' · ' + sizeText : '保存 PDF、文档、压缩包等资料文件' }}</span>
      <p v-if="errorMessage">{{ errorMessage }}</p>
    </div>
    <button
      v-if="hasAsset"
      type="button"
      class="attachment-block__action"
      :disabled="isOpening"
      @click="openAttachment"
    >
      <ExternalLink v-if="!isOpening" :size="15" />
      <Download v-else :size="15" />
      {{ isOpening ? '打开中…' : '打开' }}
    </button>
    <button v-else type="button" class="attachment-block__action" :disabled="isSaving" @click="chooseFile">
      {{ isSaving ? '保存中…' : '选择文件' }}
    </button>
  </NodeViewWrapper>
</template>
