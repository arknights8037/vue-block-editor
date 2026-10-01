import type { JSONContent } from '@tiptap/vue-3'

import { cloneNodeWithFreshIds } from './blockId'

let retainedBlock: JSONContent | null = null

export function retainBlock(block: JSONContent): void {
  retainedBlock = cloneBlockForInsertion(block)
}

export function hasRetainedBlock(): boolean {
  return retainedBlock !== null
}

export function takeRetainedBlock(): JSONContent | null {
  const block = retainedBlock
  retainedBlock = null
  return block ? cloneBlockForInsertion(block) : null
}

export function clearRetainedBlock(): void {
  retainedBlock = null
}

export function cloneBlockForInsertion(block: JSONContent): JSONContent {
  return cloneNodeWithFreshIds(block)
}
