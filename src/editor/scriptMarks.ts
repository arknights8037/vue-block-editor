import { Mark, mergeAttributes } from '@tiptap/vue-3'

export const SubscriptMark = Mark.create({
  name: 'subscript',
  excludes: 'superscript',

  parseHTML() {
    return [{ tag: 'sub' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sub', mergeAttributes(HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-,': () => this.editor.commands.toggleMark(this.name),
    }
  },
})

export const SuperscriptMark = Mark.create({
  name: 'superscript',
  excludes: 'subscript',

  parseHTML() {
    return [{ tag: 'sup' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['sup', mergeAttributes(HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-.': () => this.editor.commands.toggleMark(this.name),
    }
  },
})
