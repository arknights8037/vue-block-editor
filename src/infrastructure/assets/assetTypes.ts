import type { AssetRecord } from '@/models/asset'

/** Host supplied persistence boundary for images and attachments. */
export interface AssetService {
  storeFile(file: File, documentId?: string | null): Promise<AssetRecord>
  findAsset(assetIdOrUrl: string): Promise<AssetRecord | null>
  resolveAssetUrl(assetIdOrUrl: string): Promise<string>
  openAsset(assetIdOrUrl: string): Promise<void>
}

export type AssetAdapter = AssetService
