import type { Component } from 'vue'

export interface EditorFeatureOptions {
  /** Prevents the package UI from creating or transforming these block types. */
  disabledBlocks?: readonly string[]
  /** Keeps the data but hides matching blocks in edit and readonly views. */
  hiddenBlocks?: readonly string[]
  /** Keeps the data but disables the built-in renderer for matching blocks. */
  disabledRenderers?: readonly string[]
  /** Optional replacement for the built-in slash menu renderer. */
  slashMenuComponent?: Component
  /** Extra props forwarded to the slash menu renderer. */
  slashMenuProps?: Record<string, unknown>
}

export function isFeatureDisabled(
  featureId: string,
  features: EditorFeatureOptions | undefined,
): boolean {
  return matchesFeatureId(featureId, features?.disabledBlocks)
}

export function isFeatureHidden(
  featureId: string,
  features: EditorFeatureOptions | undefined,
): boolean {
  return (
    matchesFeatureId(featureId, features?.hiddenBlocks) ||
    matchesFeatureId(featureId, features?.disabledRenderers)
  )
}

function matchesFeatureId(featureId: string, configured: readonly string[] | undefined): boolean {
  if (!configured?.length) return false
  const normalizedId = normalizeFeatureId(featureId)
  return configured.some((value) => normalizeFeatureId(value) === normalizedId)
}

function normalizeFeatureId(value: string): string {
  return value.replace(/[-_\s]/g, '').toLowerCase()
}
