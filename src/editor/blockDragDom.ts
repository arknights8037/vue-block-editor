import type { EditorView } from '@tiptap/pm/view'

export const DRAG_LIVE_BLOCK_CLASS = 'editor-block--drag-live'
export const DRAGGING_BLOCK_CLASS = 'editor-block--dragging'
export const PRESSED_BLOCK_CLASS = 'editor-block--pressed'
export const PRESSED_HANDLE_CLASS = 'block-control-handle--pressed'
export const DRAGGING_HANDLE_CLASS = 'block-control-handle--dragging'

export function applyDraggingDomState(elements: HTMLElement[], isDragging: boolean): void {
  for (const element of elements) {
    element.classList.toggle(DRAG_LIVE_BLOCK_CLASS, isDragging)
    element.style.willChange = isDragging ? 'transform' : ''
    element.style.transition = isDragging ? 'none' : ''
  }
}

export function forceDragEndDomRefresh(view: EditorView): void {
  cleanupDragDomState(view)
  view.updateState(view.state)
  globalThis.requestAnimationFrame(() => {
    cleanupDragDomState(view)
    view.updateState(view.state)
  })
}

export function cleanupDragDomState(view: EditorView): void {
  const root = view.dom.closest('.editor-shell') ?? view.dom
  const selector = [
    `.${PRESSED_BLOCK_CLASS}`,
    `.${DRAGGING_BLOCK_CLASS}`,
    `.${DRAG_LIVE_BLOCK_CLASS}`,
    `.${PRESSED_HANDLE_CLASS}`,
    `.${DRAGGING_HANDLE_CLASS}`,
  ].join(',')

  root.querySelectorAll(selector).forEach((element) => {
    element.classList.remove(
      PRESSED_BLOCK_CLASS,
      DRAGGING_BLOCK_CLASS,
      DRAG_LIVE_BLOCK_CLASS,
      PRESSED_HANDLE_CLASS,
      DRAGGING_HANDLE_CLASS,
    )
    if (element instanceof HTMLElement) {
      element.style.willChange = ''
      element.style.transition = ''
      element.style.transform = ''
    }
  })
}

export function getDropIndicatorElement(view: EditorView): HTMLElement | null {
  return view.dom.closest('.editor-shell')?.querySelector('.block-drop-indicator') ?? null
}

export function hideDropIndicator(indicator: HTMLElement | null): void {
  if (!indicator) return
  clearDropIndicatorHideTimer(indicator)
  indicator.style.opacity = '0'
  const timer = globalThis.setTimeout(() => {
    if (indicator.style.opacity === '0') indicator.style.display = 'none'
  }, 120)
  indicator.dataset.hideTimer = String(timer)
}

export function clearDropIndicatorHideTimer(indicator: HTMLElement): void {
  const timer = Number(indicator.dataset.hideTimer)
  if (Number.isFinite(timer) && timer > 0) globalThis.clearTimeout(timer)
  delete indicator.dataset.hideTimer
}
