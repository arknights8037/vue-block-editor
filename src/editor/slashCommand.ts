import { Extension } from '@tiptap/core'
import { PluginKey } from '@tiptap/pm/state'
import { Suggestion, exitSuggestion, type SuggestionKeyDownProps, type SuggestionProps } from '@tiptap/suggestion'
import { createVNode, render, type Component } from 'vue'
import SlashCommandMenu from './slash/SlashCommandMenu.vue'
import { filterSlashCommandItems } from './slash/slashCommandFilter'
import { SLASH_COMMAND_ITEMS } from './slash/slashCommandItems'
import type { SlashCommandItem } from './slash/slashCommandTypes'
import type { EditorFeatureOptions } from '@/models/features'
import type { EditorPluginRegistry } from '@/plugins/types'

export type { SlashCommandContext, SlashCommandItem } from './slash/slashCommandTypes'
export { SLASH_COMMAND_ITEMS } from './slash/slashCommandItems'
export { filterSlashCommandItems } from './slash/slashCommandFilter'

export const SlashCommandPluginKey = new PluginKey('slash-command')

export const SlashCommand = Extension.create({
  name: 'slashCommand',
  addOptions() {
    return {
      features: undefined as EditorFeatureOptions | undefined,
      registry: undefined as EditorPluginRegistry | undefined,
      /** Replace the menu renderer while keeping the Suggestion lifecycle. */
      menuComponent: SlashCommandMenu as Component,
      menuProps: {} as Record<string, unknown>,
    }
  },
  addProseMirrorPlugins() {
    return [Suggestion<SlashCommandItem, SlashCommandItem>({
      editor: this.editor,
      pluginKey: SlashCommandPluginKey,
      char: '/',
      startOfLine: false,
      allowSpaces: false,
      allowedPrefixes: null,
      decorationClass: 'slash-command__query',
      items: ({ query }) => filterSlashCommandItems(query, this.options.features, this.options.registry),
      command: ({ editor, range, props }) => {
        props.command({ editor, range })
        editor.commands.focus()
      },
      render: () => createSlashCommandRenderer(this.options.menuComponent, this.options.menuProps),
    })]
  },
})

function createSlashCommandRenderer(menuComponent: Component | undefined, menuProps: Record<string, unknown> | undefined) {
  let element: HTMLElement | null = null
  let selectedIndex = 0
  let latestProps: SuggestionProps<SlashCommandItem, SlashCommandItem> | null = null

  function renderMenu(props: SuggestionProps<SlashCommandItem, SlashCommandItem>): void {
    latestProps = props
    selectedIndex = Math.min(selectedIndex, Math.max(props.items.length - 1, 0))
    if (!element) return
    render(createVNode(menuComponent ?? SlashCommandMenu, {
      ...(menuProps ?? {}),
      items: props.items,
      selectedIndex,
      onSelect: (item: SlashCommandItem, index: number) => {
        selectedIndex = index
        props.command(item)
      },
    }), element)
  }

  function selectItem(index: number): boolean {
    const item = latestProps?.items[index]
    if (!item || !latestProps) return false
    latestProps.command(item)
    return true
  }

  return {
    onStart: (props: SuggestionProps<SlashCommandItem, SlashCommandItem>) => {
      element = document.createElement('div')
      element.className = 'slash-command-host'
      selectedIndex = 0
      renderMenu(props)
      props.mount(element)
    },
    onUpdate: renderMenu,
    onKeyDown: ({ event, view }: SuggestionKeyDownProps) => {
      if (!latestProps) return false
      const count = latestProps.items.length
      if (event.key === 'ArrowDown') {
        selectedIndex = (selectedIndex + 1) % Math.max(count, 1)
        renderMenu(latestProps)
        return true
      }
      if (event.key === 'ArrowUp') {
        selectedIndex = (selectedIndex + Math.max(count, 1) - 1) % Math.max(count, 1)
        renderMenu(latestProps)
        return true
      }
      if (event.key === 'Enter') return selectItem(selectedIndex)
      if (event.key === 'Escape') {
        exitSuggestion(view, SlashCommandPluginKey)
        return true
      }
      return false
    },
    onExit: () => {
      if (element) render(null, element)
      element = null
      latestProps = null
      selectedIndex = 0
    },
  }
}
