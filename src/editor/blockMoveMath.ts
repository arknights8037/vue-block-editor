import type { EditorState } from '@tiptap/pm/state'
import type { BlockRange } from './blockRanges'

export function cloneEditorJson<T>(content: T): T {
  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(content)
  return JSON.parse(JSON.stringify(content)) as T
}

export function getTopLevelInsertIndex(state: EditorState, position: number): number {
  let offset = 0
  for (let index = 0; index < state.doc.childCount; index += 1) {
    if (position <= offset) return index
    offset += state.doc.child(index).nodeSize
    if (position <= offset) return index + 1
  }
  return state.doc.childCount
}

export function getTopLevelIndexRange(
  state: EditorState,
  startIndex: number,
  count: number,
): BlockRange | null {
  if (count <= 0 || startIndex < 0 || startIndex + count > state.doc.childCount) return null

  let offset = 0
  let from = 0
  let to = 0
  for (let index = 0; index < state.doc.childCount; index += 1) {
    if (index === startIndex) from = offset
    offset += state.doc.child(index).nodeSize
    if (index === startIndex + count - 1) {
      to = offset
      break
    }
  }
  return { from, to }
}

