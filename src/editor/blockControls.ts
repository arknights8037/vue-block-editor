import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection, Plugin, PluginKey, type EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view'
import { Extension, type Editor, type JSONContent } from '@tiptap/core'
import { DragGesture } from '@use-gesture/vanilla'

import { BLOCK_ID_ATTRIBUTE } from './blockId'
import { getBlockIndentAttributes, INDENT_ATTRIBUTE, normalizeIndentLevel } from './blockIndent'
import { closeBlockTransformMenu, showBlockTransformMenu } from './blockControlMenu'
import {
  blurEditorCompletely,
  isBlockControlsFocusMeta,
  isEditorInteractionTarget,
  setBlockControlsFocused,
  type BlockControlsFocusMeta,
} from './blockControlFocus'
import { isFeatureHidden } from '@/models/features'
import { resolveDropInsertPosition } from './blockDropPosition'
import { getBlockElement, getBlockRangeClientRect, getTopLevelBlockAtPoint } from './blockGeometry'
import { getBlockRangeDomElements, getHandleLeftOffset, getHandleTopOffset } from './blockControlGeometry'
import {
  focusInsideBlock,
  indentSelectedBlock,
  outdentIndentedBlockOnBackspace,
  selectBlock,
} from './blockIndentCommands'
import {
  countTrailingEmptyParagraphs,
  getIndentLevel,
  getMovableBlockRange,
  getSwapTargetBlock,
  getTopLevelBlockAtSelection,
  getTopLevelBlocksInRange,
  isControllableBlock,
  isEmptyParagraph,
  type BlockRange,
  type TopLevelBlock,
} from './blockRanges'
import {
  cloneEditorJson,
  getTopLevelIndexRange,
  getTopLevelInsertIndex,
} from './blockMoveMath'
import {
  applyDraggingDomState,
  cleanupDragDomState,
  clearDropIndicatorHideTimer,
  DRAGGING_BLOCK_CLASS,
  DRAGGING_HANDLE_CLASS,
  DRAG_LIVE_BLOCK_CLASS,
  forceDragEndDomRefresh,
  getDropIndicatorElement,
  hideDropIndicator,
  PRESSED_BLOCK_CLASS,
  PRESSED_HANDLE_CLASS,
} from './blockDragDom'

export { resolveDropInsertPosition } from './blockDropPosition'
export type { BlockRange } from './blockRanges'

const BlockControlsPluginKey = new PluginKey<BlockControlsState>('block-controls')

interface BlockControlsState {
  draggingRange: BlockRange | null
  isFocused: boolean
}

interface ActiveDrag {
  range: BlockRange
  lastClientX: number
  lastClientY: number
  blockElements: HTMLElement[]
  dropIndicator: HTMLElement | null
  initialTrailingEmptyParagraphCount: number
  previewFrame: number
}

interface DragGestureState {
  active: boolean
  first: boolean
  last: boolean
  intentional: boolean
  movement: [number, number]
  tap: boolean
  xy: [number, number]
  event: Event
}

let activeDrag: ActiveDrag | null = null
let pressedRange: BlockRange | null = null

export const BlockControls = Extension.create({
  name: 'blockControls',

  addOptions() {
    return {
      hiddenBlockTypes: [] as readonly string[],
      disabledBlockTypes: [] as readonly string[],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'taskList',
          'blockquote',
          'codeBlock',
          'horizontalRule',
          'imageFigure',
          'attachmentBlock',
          'tableBlock',
          'mathBlock',
          'collapsibleBlock',
          'cardBlock',
        ],
        attributes: {
          [INDENT_ATTRIBUTE]: {
            default: 0,
            parseHTML: (element) => normalizeIndentLevel(element.getAttribute('data-indent-level')),
            renderHTML: (attributes) => {
              const indentLevel = normalizeIndentLevel(attributes[INDENT_ATTRIBUTE])

              return getBlockIndentAttributes(indentLevel)
            },
          },
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => indentSelectedBlock(this.editor, 1),
      'Shift-Tab': () => indentSelectedBlock(this.editor, -1),
      Backspace: () => outdentIndentedBlockOnBackspace(this.editor),
    }
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    const hiddenBlockTypes = this.options.hiddenBlockTypes
    const disabledBlockTypes = this.options.disabledBlockTypes

    return [
      new Plugin<BlockControlsState>({
        key: BlockControlsPluginKey,
        state: {
          init: () => ({ draggingRange: null, isFocused: false }),
          apply: (transaction, value) => {
            const meta = transaction.getMeta(BlockControlsPluginKey) as
              | BlockRange
              | BlockControlsFocusMeta
              | null
              | undefined

            if (isBlockControlsFocusMeta(meta)) {
              return {
                ...value,
                isFocused: meta.isFocused,
              }
            }

            if (meta !== undefined) {
              return {
                ...value,
                draggingRange: meta,
              }
            }

            if (value.draggingRange === null) {
              return value
            }

            return {
              draggingRange: {
                from: transaction.mapping.map(value.draggingRange.from),
                to: transaction.mapping.map(value.draggingRange.to),
              },
              isFocused: value.isFocused,
            }
          },
        },
        props: {
          decorations(state) {
            const decorations: Decoration[] = []

            state.doc.forEach((node, pos) => {
              if (!isControllableBlock(node)) {
                return
              }

              const attributes: Record<string, string> = {
                class: 'editor-block',
                'data-editor-block-pos': String(pos),
              }
              if (isFeatureHidden(node.type.name, { hiddenBlocks: hiddenBlockTypes })) {
                attributes.class += ' editor-block--hidden'
              }
              const blockId = getBlockId(node)
              if (blockId) {
                attributes['data-editor-block-id'] = blockId
              }

              decorations.push(Decoration.node(pos, pos + node.nodeSize, attributes))
            })

            const pluginState = BlockControlsPluginKey.getState(state)
            const activeBlock = pluginState?.isFocused ? getTopLevelBlockAtSelection(state) : null
            if (activeBlock) {
              decorations.push(
                Decoration.node(activeBlock.pos, activeBlock.pos + activeBlock.node.nodeSize, {
                  class: 'editor-block--selected',
                }),
              )
            }

            const draggingRange = pluginState?.draggingRange
            if (draggingRange) {
              for (const block of getTopLevelBlocksInRange(
                state,
                draggingRange.from,
                draggingRange.to,
              )) {
                decorations.push(
                  Decoration.node(block.pos, block.pos + block.node.nodeSize, {
                    class: DRAGGING_BLOCK_CLASS,
                  }),
                )
              }
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
        view(view) {
          return createBlockControlsView(editor, view, disabledBlockTypes)
        },
      }),
    ]
  },
})

function createBlockControlsView(
  editor: Editor,
  view: EditorView,
  disabledBlockTypes: readonly string[],
) {
  const scrollContainer = view.dom.closest('.editor-shell') as HTMLElement | null
  const overlay = globalThis.document.createElement('div')
  overlay.className = 'block-controls-overlay'
  const dropIndicator = globalThis.document.createElement('div')
  dropIndicator.className = 'block-drop-indicator'

  if (scrollContainer) {
    scrollContainer.append(overlay)
    scrollContainer.append(dropIndicator)
  }

  let updateFrame = 0

  const update = (): void => {
    updateFrame = 0

    if (activeDrag) {
      return
    }

    renderBlockHandles(editor, view, overlay, scrollContainer, disabledBlockTypes)
  }

  const scheduleUpdate = (): void => {
    if (updateFrame !== 0) {
      return
    }

    updateFrame = globalThis.requestAnimationFrame(update)
  }

  scheduleUpdate()
  scrollContainer?.addEventListener('scroll', scheduleUpdate)
  scrollContainer?.addEventListener('focusin', handleEditorFocusIn)
  scrollContainer?.addEventListener('focusout', handleEditorFocusOut)
  globalThis.document.addEventListener('pointerdown', handleDocumentPointerDown, true)
  globalThis.addEventListener('resize', scheduleUpdate)

  function handleEditorFocusIn(): void {
    setBlockControlsFocused(view, BlockControlsPluginKey, true)
  }

  function handleEditorFocusOut(event: FocusEvent): void {
    const nextTarget = event.relatedTarget
    if (
      scrollContainer &&
      nextTarget instanceof globalThis.Node &&
      scrollContainer.contains(nextTarget)
    ) {
      return
    }

    setBlockControlsFocused(view, BlockControlsPluginKey, false)
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    const target = event.target
    if (!(target instanceof globalThis.Node)) {
      return
    }

    if (isEditorInteractionTarget(view, target)) {
      return
    }

    blurEditorCompletely(view, BlockControlsPluginKey)
  }

  return {
    update: scheduleUpdate,
    destroy() {
      if (updateFrame !== 0) {
        globalThis.cancelAnimationFrame(updateFrame)
      }
      if (activeDrag?.previewFrame) {
        globalThis.cancelAnimationFrame(activeDrag.previewFrame)
        activeDrag = null
      }

      closeBlockTransformMenu()
      clearPressedBlockRange(view)
      scrollContainer?.removeEventListener('scroll', scheduleUpdate)
      scrollContainer?.removeEventListener('focusin', handleEditorFocusIn)
      scrollContainer?.removeEventListener('focusout', handleEditorFocusOut)
      globalThis.document.removeEventListener('pointerdown', handleDocumentPointerDown, true)
      globalThis.removeEventListener('resize', scheduleUpdate)
      overlay.remove()
      dropIndicator.remove()
    },
  }
}

function renderBlockHandles(
  editor: Editor,
  view: EditorView,
  overlay: HTMLElement,
  scrollContainer: HTMLElement | null,
  disabledBlockTypes: readonly string[],
): void {
  if (!scrollContainer || !editor.isEditable) {
    overlay.replaceChildren()
    return
  }

  const containerRect = scrollContainer.getBoundingClientRect()
  const viewportTop = containerRect.top - 96
  const viewportBottom = containerRect.bottom + 96
  const handles = globalThis.document.createDocumentFragment()

  view.state.doc.forEach((node, pos) => {
    if (!isControllableBlock(node)) {
      return
    }

    const blockElement = getBlockElement(view, pos)
    if (!blockElement) {
      return
    }

    const blockRect = blockElement.getBoundingClientRect()
    if (blockRect.bottom < viewportTop || blockRect.top > viewportBottom) {
      return
    }

    const handle = createBlockHandle(editor, view, pos, disabledBlockTypes)
    handle.style.top = `${blockRect.top - containerRect.top + scrollContainer.scrollTop + getHandleTopOffset(blockElement)}px`
    handle.style.left = `${blockRect.left - containerRect.left + scrollContainer.scrollLeft + getHandleLeftOffset()}px`
    handles.append(handle)
  })

  overlay.replaceChildren(handles)
}

function createBlockHandle(
  editor: Editor,
  view: EditorView,
  pos: number,
  disabledBlockTypes: readonly string[],
): HTMLElement {
  const handle = document.createElement('button')
  handle.type = 'button'
  handle.draggable = false
  handle.className = 'block-control-handle'
  handle.setAttribute('aria-label', '拖拽或转换块')
  handle.title = '拖拽排序，点击转换'
  handle.innerHTML =
    '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>'
  let didDrag = false
  let isPointerDown = false
  let pointerDownRect: DOMRect | null = null

  const clearPressedState = (): void => {
    isPointerDown = false
    handle.classList.remove(PRESSED_HANDLE_CLASS)
    clearPressedBlockRange(view)
  }

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    didDrag = false
    isPointerDown = true
    pointerDownRect = handle.getBoundingClientRect()
    handle.classList.add(PRESSED_HANDLE_CLASS)
    pressedRange = getMovableBlockRange(editor.state, pos)
    addBlockRangeDomClass(view, pressedRange, PRESSED_BLOCK_CLASS)
  })

  handle.addEventListener('pointerup', (event) => {
    event.preventDefault()
    event.stopPropagation()
    const anchorRect = pointerDownRect ?? handle.getBoundingClientRect()

    clearPressedState()

    if (didDrag || activeDrag) {
      return
    }

    selectBlock(editor, pos)
    showBlockTransformMenu(editor, pos, anchorRect, disabledBlockTypes)
  })

  handle.addEventListener('pointercancel', () => {
    clearPressedState()
  })

  handle.addEventListener('mouseleave', () => {
    if (!activeDrag && !isPointerDown) {
      clearPressedState()
    }
  })

  handle.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })

  handle.addEventListener('dragstart', (event) => {
    event.preventDefault()
    event.stopPropagation()
  })

  new DragGesture(
    handle,
    (state: DragGestureState) => {
      preventDragDefault(state.event)

      if (state.tap && state.last) {
        clearPressedState()
        return
      }

      if (!state.intentional && !activeDrag) {
        return
      }

      if (!activeDrag) {
        const dragRange = getMovableBlockRange(editor.state, pos)
        didDrag = true
        activeDrag = {
          range: dragRange,
          lastClientX: state.xy[0],
          lastClientY: state.xy[1],
          blockElements: [],
          dropIndicator: null,
          initialTrailingEmptyParagraphCount: countTrailingEmptyParagraphs(editor.state),
          previewFrame: 0,
        }
        closeBlockTransformMenu()
        clearPressedState()
        selectBlock(editor, pos)
        activeDrag.blockElements = getBlockRangeDomElements(view, dragRange)
        activeDrag.dropIndicator = getDropIndicatorElement(view)
        applyDraggingDomState(activeDrag.blockElements, true)
        handle.classList.add(DRAGGING_HANDLE_CLASS)
        editor.view.dispatch(editor.view.state.tr.setMeta(BlockControlsPluginKey, dragRange))
      }

      if (state.active && activeDrag) {
        if (!activeDrag) {
          return
        }

        activeDrag.lastClientX = state.xy[0]
        activeDrag.lastClientY = state.xy[1]
        scheduleActiveDragPreview(view)
        handle.style.transform = `translate(${state.movement[0]}px, ${state.movement[1]}px)`
      }

      if (state.last) {
        const drag = activeDrag
        let movedRange: BlockRange | null = null
        activeDrag = null
        clearPressedState()
        if (drag) {
          drag.lastClientX = state.xy[0]
          drag.lastClientY = state.xy[1]
          if (drag.previewFrame !== 0) {
            globalThis.cancelAnimationFrame(drag.previewFrame)
            drag.previewFrame = 0
          }
          applyDraggingDomState(drag.blockElements, false)
          hideDropIndicator(drag.dropIndicator)
          movedRange = moveBlockRangeAtPoint(
            editor,
            view,
            drag.range.from,
            drag.lastClientX,
            drag.lastClientY,
          )
          if (movedRange) {
            trimExcessTrailingEmptyParagraphs(view, drag.initialTrailingEmptyParagraphCount)
          }
        }
        handle.classList.remove(DRAGGING_HANDLE_CLASS)
        handle.style.transform = ''

        editor.view.dispatch(
          editor.view.state.tr
            .setMeta(BlockControlsPluginKey, null)
            .setMeta('block-controls-drag-refresh', Date.now()),
        )
        forceDragEndDomRefresh(view)

        globalThis.setTimeout(() => {
          didDrag = false
        }, 0)
      }
    },
    {
      axis: 'y',
      eventOptions: {
        passive: false,
      },
      filterTaps: true,
      pointer: {
        capture: true,
      },
    },
  )

  return handle
}

function preventDragDefault(event: Event): void {
  if (event.cancelable) {
    event.preventDefault()
  }

  event.stopPropagation()
}

function scheduleActiveDragPreview(view: EditorView): void {
  if (!activeDrag || activeDrag.previewFrame !== 0) {
    return
  }

  activeDrag.previewFrame = globalThis.requestAnimationFrame(() => {
    updateActiveDragPreview(view)
  })
}

function updateActiveDragPreview(view: EditorView): void {
  const drag = activeDrag
  if (!drag) {
    return
  }

  drag.previewFrame = 0
  updateDropIndicator(view, drag, drag.lastClientX, drag.lastClientY)
}

function moveBlockRangeAtPoint(
  editor: Editor,
  view: EditorView,
  sourcePos: number,
  _clientX: number,
  clientY: number,
): BlockRange | null {
  const sourceNode = view.state.doc.nodeAt(sourcePos)
  if (!Number.isFinite(sourcePos) || !sourceNode) {
    return null
  }
  const sourceRange = getMovableBlockRange(view.state, sourcePos)

  const targetBlock = getTopLevelBlockAtPoint(view, clientY, sourceRange)
  if (!targetBlock) {
    return null
  }

  const sourceIndent = getIndentLevel(sourceNode)
  const targetRootBlock = getSwapTargetBlock(view.state, targetBlock, sourceIndent)
  const targetRange = getMovableBlockRange(view.state, targetRootBlock.pos)
  const targetRect = getBlockRangeClientRect(view, targetRange)
  if (!targetRect) {
    return null
  }

  const shouldInsertAfter = clientY > targetRect.top + targetRect.height / 2
  const insertPos = resolveDropInsertPosition(sourceRange, targetRange, shouldInsertAfter)

  if (insertPos >= sourceRange.from && insertPos <= sourceRange.to) {
    return null
  }

  return moveTopLevelBlockRangeAsJson(editor, view, sourceRange, insertPos)
}

function moveTopLevelBlockRangeAsJson(
  editor: Editor,
  view: EditorView,
  sourceRange: BlockRange,
  insertPos: number,
): BlockRange | null {
  const currentContent = cloneEditorJson(editor.getJSON())
  const topLevelContent = currentContent.content
  if (!Array.isArray(topLevelContent)) {
    return null
  }

  const sourceStartIndex = getTopLevelInsertIndex(view.state, sourceRange.from)
  const sourceEndIndex = getTopLevelInsertIndex(view.state, sourceRange.to)
  const insertIndex = getTopLevelInsertIndex(view.state, insertPos)
  const movedCount = sourceEndIndex - sourceStartIndex
  if (
    movedCount <= 0 ||
    sourceStartIndex < 0 ||
    sourceEndIndex > topLevelContent.length ||
    insertIndex < 0 ||
    insertIndex > topLevelContent.length
  ) {
    return null
  }

  const adjustedInsertIndex =
    insertIndex > sourceStartIndex ? insertIndex - movedCount : insertIndex
  if (adjustedInsertIndex === sourceStartIndex) {
    return null
  }

  const movedBlocks = topLevelContent.slice(sourceStartIndex, sourceEndIndex)
  const remainingBlocks = [
    ...topLevelContent.slice(0, sourceStartIndex),
    ...topLevelContent.slice(sourceEndIndex),
  ]
  const nextBlocks = [
    ...remainingBlocks.slice(0, adjustedInsertIndex),
    ...movedBlocks,
    ...remainingBlocks.slice(adjustedInsertIndex),
  ]
  const nextContent: JSONContent = {
    ...currentContent,
    content: nextBlocks,
  }

  editor.commands.setContent(nextContent, {
    emitUpdate: true,
    errorOnInvalidContent: true,
  })

  const movedRange = getTopLevelIndexRange(editor.state, adjustedInsertIndex, movedCount)
  if (!movedRange) {
    return null
  }

  editor.view.dispatch(
    editor.view.state.tr
      .setSelection(NodeSelection.create(editor.view.state.doc, movedRange.from))
      .setMeta(BlockControlsPluginKey, movedRange)
      .scrollIntoView(),
  )
  editor.view.focus()
  return movedRange
}

function updateDropIndicator(
  view: EditorView,
  drag: ActiveDrag,
  _clientX: number,
  clientY: number,
): void {
  const indicator = drag.dropIndicator
  if (!indicator) {
    return
  }

  const targetBlock = getTopLevelBlockAtPoint(view, clientY, drag.range)
  if (!targetBlock) {
    hideDropIndicator(indicator)
    return
  }

  const sourceNode = view.state.doc.nodeAt(drag.range.from)
  if (!sourceNode) {
    hideDropIndicator(indicator)
    return
  }

  const targetRootBlock = getSwapTargetBlock(view.state, targetBlock, getIndentLevel(sourceNode))
  const targetRange = getMovableBlockRange(view.state, targetRootBlock.pos)
  const targetElement = getBlockElement(view, targetRootBlock.pos)
  const targetRect = getBlockRangeClientRect(view, targetRange)
  const scrollContainer = view.dom.closest('.editor-shell') as HTMLElement | null
  if (!targetElement || !targetRect || !scrollContainer) {
    hideDropIndicator(indicator)
    return
  }

  const containerRect = scrollContainer.getBoundingClientRect()
  const shouldInsertAfter = clientY > targetRect.top + targetRect.height / 2
  const top = shouldInsertAfter ? targetRect.bottom : targetRect.top

  clearDropIndicatorHideTimer(indicator)
  indicator.style.display = 'block'
  indicator.style.opacity = '1'
  indicator.style.top = `${top - containerRect.top + scrollContainer.scrollTop}px`
  indicator.style.left = `${targetRect.left - containerRect.left + scrollContainer.scrollLeft}px`
  indicator.style.width = `${targetRect.width}px`
}

function addBlockRangeDomClass(view: EditorView, range: BlockRange, className: string): void {
  for (const block of getTopLevelBlocksInRange(view.state, range.from, range.to)) {
    const element = getBlockElement(view, block.pos)
    if (element) {
      element.classList.add(className)
    }
  }
}

function removeBlockRangeDomClass(view: EditorView, range: BlockRange, className: string): void {
  for (const block of getTopLevelBlocksInRange(view.state, range.from, range.to)) {
    const element = getBlockElement(view, block.pos)
    if (element) {
      element.classList.remove(className)
    }
  }
}

function clearPressedBlockRange(view: EditorView): void {
  if (!pressedRange) {
    return
  }

  removeBlockRangeDomClass(view, pressedRange, PRESSED_BLOCK_CLASS)
  pressedRange = null
}

function trimExcessTrailingEmptyParagraphs(view: EditorView, allowedTrailingCount: number): void {
  let trailingCount = countTrailingEmptyParagraphs(view.state)
  const excessCount = trailingCount - allowedTrailingCount
  if (excessCount <= 0 || view.state.doc.childCount <= 1) {
    return
  }

  let transaction = view.state.tr
  let offset = view.state.doc.content.size
  let removedCount = 0

  for (let index = view.state.doc.childCount - 1; index >= 0; index -= 1) {
    const node = view.state.doc.child(index)
    const nodeStart = offset - node.nodeSize
    if (!isEmptyParagraph(node) || removedCount >= excessCount || transaction.doc.childCount <= 1) {
      break
    }

    transaction = transaction.delete(nodeStart, offset)
    offset = nodeStart
    removedCount += 1
    trailingCount -= 1
  }

  if (removedCount > 0) {
    view.dispatch(
      transaction.setMeta(
        BlockControlsPluginKey,
        BlockControlsPluginKey.getState(view.state)?.draggingRange ?? null,
      ),
    )
  }
}

function getBlockId(node: ProseMirrorNode): string {
  const blockId = node.attrs[BLOCK_ID_ATTRIBUTE]
  return typeof blockId === 'string' ? blockId : ''
}
