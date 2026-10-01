import {
  ASSET_URL_PREFIX,
  createAssetUrl,
  parseAssetUrl,
  type AssetRecord,
} from '@/models/asset'
import { inject, provide, type InjectionKey } from 'vue'

export interface AssetService {
  storeFile(file: File, documentId?: string | null): Promise<AssetRecord>
  findAsset(assetIdOrUrl: string): Promise<AssetRecord | null>
  resolveAssetUrl(assetIdOrUrl: string): Promise<string>
  openAsset(assetIdOrUrl: string): Promise<void>
}

export type AssetAdapter = AssetService
export const assetServiceKey: InjectionKey<AssetService> = Symbol('asset-service')

class BrowserMemoryAssetService implements AssetService {
  private readonly records = new Map<string, AssetRecord>()
  private readonly dataUrls = new Map<string, string>()

  async storeFile(file: File, documentId: string | null = null): Promise<AssetRecord> {
    const id = createAssetId()
    const now = Date.now()
    const dataUrl = await readFileAsDataUrl(file)
    const record: AssetRecord = {
      id,
      documentId,
      relativePath: '',
      originalName: file.name || 'asset',
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
      contentHash: '',
      width: null,
      height: null,
      createdAt: now,
      updatedAt: now,
    }
    this.records.set(id, record)
    this.dataUrls.set(id, dataUrl)
    return record
  }

  async findAsset(assetIdOrUrl: string): Promise<AssetRecord | null> {
    return this.records.get(normalizeAssetId(assetIdOrUrl)) ?? null
  }

  async resolveAssetUrl(assetIdOrUrl: string): Promise<string> {
    if (!assetIdOrUrl.startsWith(ASSET_URL_PREFIX)) return assetIdOrUrl
    return this.dataUrls.get(normalizeAssetId(assetIdOrUrl)) ?? ''
  }

  async openAsset(assetIdOrUrl: string): Promise<void> {
    const url = await this.resolveAssetUrl(assetIdOrUrl)
    if (url && typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
  }
}

let activeAssetService: AssetService = new BrowserMemoryAssetService()

export const assetService: AssetService = {
  storeFile: (file, documentId) => activeAssetService.storeFile(file, documentId),
  findAsset: (assetIdOrUrl) => activeAssetService.findAsset(assetIdOrUrl),
  resolveAssetUrl: (assetIdOrUrl) => activeAssetService.resolveAssetUrl(assetIdOrUrl),
  openAsset: (assetIdOrUrl) => activeAssetService.openAsset(assetIdOrUrl),
}

export function useAssetService(): AssetService {
  return inject(assetServiceKey, assetService)
}

export function provideAssetService(service: AssetService): void {
  provide(assetServiceKey, service)
}

export function configureAssetService(service: AssetService): void {
  activeAssetService = service
}

export function resetAssetService(): void {
  activeAssetService = new BrowserMemoryAssetService()
}

export function getAssetDisplayName(asset: Pick<AssetRecord, 'originalName' | 'id'> | null): string {
  return asset?.originalName?.trim() || asset?.id || 'asset'
}

export function getAssetUrl(assetId: string): string {
  return createAssetUrl(assetId)
}

function normalizeAssetId(value: string): string {
  return parseAssetUrl(value) ?? value.replace(ASSET_URL_PREFIX, '')
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Unable to read asset.')),
    )
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read asset.')))
    reader.readAsDataURL(file)
  })
}

function createAssetId(): string {
  const value = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `asset-${value}`
}
