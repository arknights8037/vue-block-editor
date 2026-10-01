import { inject, provide, type InjectionKey } from 'vue'
import { BrowserMemoryAssetService, getAssetDisplayName, getAssetUrl } from './browserMemoryAssetService'
import type { AssetAdapter, AssetService } from './assetTypes'

export type { AssetAdapter, AssetService } from './assetTypes'
export { BrowserMemoryAssetService, getAssetDisplayName, getAssetUrl } from './browserMemoryAssetService'
export const assetServiceKey: InjectionKey<AssetService> = Symbol('asset-service')

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

