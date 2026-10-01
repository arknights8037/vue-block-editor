import type { Editor } from '@tiptap/core'
import { getTransformBlockTypes } from './blockTypeRegistry'

let activeMenu: HTMLElement | null = null
let removeOutsideListener: (() => void) | null = null

export function showBlockTransformMenu(editor: Editor, pos: number, anchorRect: DOMRect, disabledBlockTypes: readonly string[]): void {
  closeBlockTransformMenu()
  const menu = document.createElement('div')
  menu.className = 'block-transform-menu'
  menu.setAttribute('role', 'menu')
  for (const blockType of getTransformBlockTypes({ disabledBlocks: disabledBlockTypes })) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'block-transform-menu__item'
    button.setAttribute('role', 'menuitem')
    const shortcut = document.createElement('span')
    shortcut.className = 'block-transform-menu__shortcut'
    shortcut.textContent = blockType.slashIcon
    const label = document.createElement('span')
    label.className = 'block-transform-menu__label'
    label.textContent = blockType.title
    button.append(shortcut, label)
    button.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      editor.commands.setTextSelection(Math.min(pos + 1, editor.state.doc.content.size))
      blockType.transform?.(editor)
      closeBlockTransformMenu()
    })
    menu.append(button)
  }
  document.body.append(menu)
  activeMenu = menu
  positionFloatingMenu(menu, anchorRect)
  const outsideListener = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) closeBlockTransformMenu()
  }
  document.addEventListener('mousedown', outsideListener)
  removeOutsideListener = () => document.removeEventListener('mousedown', outsideListener)
}

export function closeBlockTransformMenu(): void {
  activeMenu?.remove()
  activeMenu = null
  removeOutsideListener?.()
  removeOutsideListener = null
}

function positionFloatingMenu(menu: HTMLElement, anchorRect: DOMRect): void {
  const padding = 10
  const gap = 6
  const maxHeight = Math.min(360, Math.max(120, window.innerHeight - padding * 2))
  const below = window.innerHeight - anchorRect.bottom - padding - gap
  const above = anchorRect.top - padding - gap
  const preferred = Math.min(menu.scrollHeight, maxHeight)
  const openAbove = below < preferred && above > below
  const available = Math.max(120, openAbove ? above : below)
  const height = Math.min(maxHeight, available)
  const left = Math.min(Math.max(anchorRect.left, padding), Math.max(padding, window.innerWidth - menu.offsetWidth - padding))
  const top = openAbove ? Math.max(padding, anchorRect.top - height - gap) : Math.min(anchorRect.bottom + gap, window.innerHeight - padding - height)
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  menu.style.maxHeight = `${height}px`
}
