import type { NodeViewProps } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import type { Component } from 'vue'

export function renderVueNodeView(component: Component) {
  return VueNodeViewRenderer(component as unknown as Component<NodeViewProps>)
}
