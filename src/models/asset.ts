import type { DocumentId } from './document'

export interface AssetRecord {
  id: string
  documentId: DocumentId | null
  relativePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  contentHash: string
  width: number | null
  height: number | null
  createdAt: number
  updatedAt: number
}

export interface StoredAssetFile {
  id: string
  relativePath: string
  originalName: string
  mimeType: string
  sizeBytes: number
  contentHash: string
}

export const ASSET_URL_PREFIX = 'asset://'

export function createAssetUrl(assetId: string): string {
  return `${ASSET_URL_PREFIX}${assetId}`
}

export function parseAssetUrl(value: string | null | undefined): string | null {
  if (!value?.startsWith(ASSET_URL_PREFIX)) return null
  return value.slice(ASSET_URL_PREFIX.length) || null
}
