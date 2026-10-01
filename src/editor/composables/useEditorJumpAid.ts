import type { Editor } from '@tiptap/core'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

import {
  collectEditorOutlineItems,
  filterEditorOutlineItems,
  type EditorOutlineItem,
} from '../editorOutline'
import type { TiptapDocumentJson } from '@/models/document'
import type { AppSettings } from '@/models/settings'

type JumpAidSettings = Pick<
  AppSettings,
  'jumpAid' | 'jumpAidPosition' | 'jumpAidMaxLevel' | 'reduceMotion'
>

export interface UseEditorJumpAidOptions {
  editor: Readonly<Ref<Editor | null | undefined>>
  content: MaybeRefOrGetter<TiptapDocumentJson | undefined>
  revision: Readonly<Ref<number>>
  settings: MaybeRefOrGetter<JumpAidSettings>
  scrollContainer: Readonly<Ref<HTMLElement | null>>
}

export function useEditorJumpAid(options: UseEditorJumpAidOptions) {
  const activeItemId = ref('')
  const allItems = computed(() => {
    void options.revision.value
    return collectEditorOutlineItems(
      (toValue(options.content) ?? options.editor.value?.getJSON()) as TiptapDocumentJson,
    )
  })
  const position = computed(() => toValue(options.settings).jumpAidPosition ?? 'right')
  const maxLevel = computed(() => toValue(options.settings).jumpAidMaxLevel ?? 4)
  const items = computed(() => {
    const settings = toValue(options.settings)
    return filterEditorOutlineItems(allItems.value, settings.jumpAid, maxLevel.value)
  })
  const visible = computed(() => toValue(options.settings).jumpAid !== 'off' && items.value.length > 0)

  function jumpToBlock(item: EditorOutlineItem): void {
    const block = findBlock(item.id)
    const settings = toValue(options.settings)
    activeItemId.value = item.id
    block?.scrollIntoView({
      behavior: settings.reduceMotion ? 'auto' : 'smooth',
      block: 'start',
    })
    globalThis.setTimeout(syncActiveItemFromViewport, settings.reduceMotion ? 0 : 180)
  }

  function revealBlock(blockId: string): boolean {
    const block = findBlock(blockId)
    if (!block) return false

    block.scrollIntoView?.({
      behavior: toValue(options.settings).reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    })
    block.classList.add('editor-block--source-target')
    globalThis.setTimeout(() => block.classList.remove('editor-block--source-target'), 1800)
    return true
  }

  function scheduleSync(): void {
    syncActiveItemFromViewport()
  }

  function syncActiveItemFromViewport(): void {
    const activeEditor = options.editor.value
    if (!activeEditor || items.value.length === 0) {
      activeItemId.value = ''
      return
    }

    const scrollerRect = options.scrollContainer.value?.getBoundingClientRect()
    const activationLine = scrollerRect
      ? scrollerRect.top + scrollerRect.height * 0.55
      : globalThis.window.innerHeight * 0.55
    let activeItem = items.value[0]

    for (const item of items.value) {
      const block = findBlock(item.id)
      if (block && block.getBoundingClientRect().top <= activationLine) activeItem = item
    }

    activeItemId.value = activeItem.id
  }

  function findBlock(blockId: string): HTMLElement | null {
    const selector = `[data-editor-block-id="${escapeAttributeSelectorValue(blockId)}"]`
    return options.editor.value?.view.dom.querySelector<HTMLElement>(selector) ?? null
  }

  watch(items, () => void nextTick(scheduleSync), { immediate: true })

  onMounted(() => {
    options.scrollContainer.value?.addEventListener('scroll', scheduleSync, { passive: true })
    globalThis.window.addEventListener('resize', scheduleSync)
    scheduleSync()
  })

  onBeforeUnmount(() => {
    options.scrollContainer.value?.removeEventListener('scroll', scheduleSync)
    globalThis.window.removeEventListener('resize', scheduleSync)
  })

  return {
    activeItemId,
    items,
    position,
    visible,
    jumpToBlock,
    revealBlock,
    scheduleSync,
  }
}

function escapeAttributeSelectorValue(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}
