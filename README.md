# Vue Block Editor

项目文档网站：打开 [`docs/index.html`](./docs/index.html)，或在项目根目录运行
`python -m http.server 4173 --directory docs` 后访问 `http://127.0.0.1:4173/`。

Reusable Vue 3 block editor, read-only renderer and document tree extracted from myNoteBook.

## Included capabilities

- Paragraphs, four heading levels, block quotes, ordered, bullet and task lists
- Block selection, drag sorting, indentation, duplication and context menus
- Bold, italic, underline, strike, subscript, superscript, alignment, text color and highlight
- Syntax-highlighted code blocks and lazy-loaded Mermaid previews
- KaTeX formula blocks, collapsible headings and collapsible lists
- Images, captions and generic attachments through an injectable asset adapter
- Markdown-compatible fenced `card` blocks with nested block content
- Native Vue table editing with column titles, row/column operations, keyboard navigation and TSV paste
- Markdown/JSON import, Markdown/HTML export and stable block IDs
- Read-only `BlockRenderer` and recursive `DocumentTree`

## Install

```bash
pnpm add @my-notebook/vue-block-editor
```

To install the locally built archive:

```powershell
pnpm add F:\vue-block-editor\my-notebook-vue-block-editor-0.1.0.tgz
```

## Use

For document processing in Node.js or a browser without the editor UI, use the
`core` entry. It includes normalization, migrations, snapshots, search, operations
and the agent tool adapter. It loads no Vue runtime, components or CSS, and supports
both ESM `import` and CommonJS `require`.

```ts
import {
  createInitialDocumentContent,
  createDocumentSnapshot,
  searchDocumentBlocks,
} from '@my-notebook/vue-block-editor/core'

const snapshot = createDocumentSnapshot('example', 1, createInitialDocumentContent('Hello'))
const blocks = searchDocumentBlocks(snapshot, 'Hello')
```

After building, `pnpm check:package` verifies the packed exports and exercises
both core module formats in an isolated directory.

The read-only and editing surfaces also have independent entry points:

```ts
import { DocumentRenderer } from '@my-notebook/vue-block-editor/renderer'
import { BlockEditor, EditorProvider } from '@my-notebook/vue-block-editor/editor'
```

`pnpm check:consumer` runs the same public entry checks used by the basic consumer
example under `examples/basic`.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  BlockEditor,
  BlockRenderer,
  EditorProvider,
  createEmptyDocumentContent,
} from '@my-notebook/vue-block-editor'
import '@my-notebook/vue-block-editor/style.css'

const content = ref(createEmptyDocumentContent())
</script>

<template>
  <EditorProvider>
    <BlockEditor v-model="content" />
    <BlockRenderer :content="content" />
  </EditorProvider>
</template>
```

For an application that uses several package components, register them once as a Vue plugin:

```ts
import { createApp } from 'vue'
import { createVueBlockEditorPlugin } from '@my-notebook/vue-block-editor'
import '@my-notebook/vue-block-editor/style.css'
import App from './App.vue'

createApp(App)
  .use(createVueBlockEditorPlugin({ prefix: 'N' }))
  .mount('#app')
```

This registers `NBlockEditor`, `NBlockRenderer`, `NDocumentRenderer`, `NDocumentTree`, `NNativeTableEditor` and `NEditorProvider`. The default `VueBlockEditorPlugin` registers the same components without a prefix. Set `registerProvider: false` when the host application already provides the UI context and only needs the editor components.

The editor shell's interaction surfaces are also split into internal components:
`EditorBubbleMenu` owns the Tiptap bubble-menu lifecycle and slot boundary, while
`EditorContextMenu` owns the context-menu root lifecycle. Their command content stays
in the shell for now so existing editor state and keyboard behavior remain stable;
these boundaries are the extension points for replacing the toolbar or context menu
with host-specific UI.

`DocumentTree` is composed from `DocumentTreeNode`, `DocumentTreeNodeActions` and
`DocumentTreeContextMenu`. `NativeTableEditor` is composed from
`NativeTableToolbar`, `NativeTableHeader`, `NativeTableBody` and the reusable
`useTableEditor` composable. The public props and emitted events of both top-level
components remain unchanged.

The bubble toolbar is further divided into `EditorInlineMarkButtons`,
`EditorAlignmentButtons`, and `EditorHistoryButtons` under `src/editor/menus/`.
Color picking remains in `EditorColorPickerPopover`, so each formatting concern can
be replaced independently.

Slash commands are split into `slashCommandItems`, `slashCommandFilter`,
`SlashCommandMenu.vue`, and the Tiptap adapter in `slashCommand.ts`. The menu is a
Vue component and is exported as `SlashCommandMenu`, so a host can replace its item
rendering or add an empty/footer slot without changing the suggestion plugin.
The built-in editor also accepts `features.slashMenuComponent` and
`features.slashMenuProps` for replacing the menu renderer without rebuilding the
editor shell.

`EditorContextMenu` is slot-based. It owns the context-menu root, trigger wrapper,
portal and content surface, while callers provide `#trigger` and `#content`:

```vue
<EditorContextMenu>
  <template #trigger><div class="editor-surface">...</div></template>
  <template #content>
    <ContextMenuItem>宿主自定义操作</ContextMenuItem>
  </template>
</EditorContextMenu>
```

This makes it possible to add Agent actions, document links or application-specific
commands without changing the menu container itself.

For tree-shaking or local naming, import the components directly as shown in the first example. The plugin is a convenience layer for global registration, not a requirement.

### Editor plugins

Custom blocks can be registered at application startup without changing the package source:

```ts
import { Node } from '@tiptap/core'
import { createEditorPluginRegistry, type EditorPlugin } from '@my-notebook/vue-block-editor'

const notePlugin: EditorPlugin = {
  id: 'notes',
  version: 1,
  blocks: [{
    id: 'note-block',
    title: 'Note',
    aliases: ['note'],
    node: Node.create({ name: 'noteBlock' }),
    slash: { command: ({ editor, range }) => editor.chain().deleteRange(range).insertContent({ type: 'noteBlock' }).run() },
  }],
}

const pluginRegistry = createEditorPluginRegistry([notePlugin])
```

Plugins participate in both editor and readonly surfaces by default. Set `capabilities: { editor: false }` or `capabilities: { renderer: false }` when a plugin is intentionally limited to one surface; its extensions and node views are filtered accordingly.

Pass `plugins` to `BlockEditor` and `BlockRenderer`, or pass a shared `pluginRegistry` when the application needs a single validated registry. `BlockRenderer` also accepts `renderers` to replace a plugin block's readonly component by block ID. Existing built-in blocks remain enabled automatically.

Use `configureAssetService()` to connect images and attachments to a persistent backend. Without an adapter, assets are retained as browser data URLs for the current page session.

When an application has multiple editor instances or request-scoped asset backends, pass `assetService` to `EditorProvider`; editor node views and file actions will use the injected service while non-Vue export helpers keep the compatibility singleton.

`BlockEditor` emits `update:modelValue`, `textUpdate`, `ready`, `destroy`, `imageError` and `openDocument`. It also exposes `getJSON()`, `getText()`, `getSelectedBlocks()`, `focus()`, `undo()`, `redo()`, `insertMarkdown()` and block insertion helpers through the component ref.

### Feature and renderer switches

Pass the same `features` object to `BlockEditor` and `BlockRenderer` when the host application needs a smaller feature surface:

```vue
<BlockEditor
  v-model="content"
  :features="{
    disabledBlocks: ['taskList'],
    hiddenBlocks: ['attachmentBlock'],
    disabledRenderers: ['mathBlock'],
  }"
/>
```

`disabledBlocks` removes a block from Slash, insert and transform menus while preserving existing JSON data. `hiddenBlocks` keeps the data but hides matching blocks in both edit and readonly views. `disabledRenderers` also keeps the data and hides the built-in renderer, allowing the host application to render that block itself. Block IDs and document text remain stable because these switches do not delete content.

## Document contract

The editor value is a Tiptap document JSON object. `normalizeEditorContent()` should be used at application boundaries; it creates missing node IDs and writes `DOCUMENT_SCHEMA_VERSION` so the same document can be safely loaded again without changing existing IDs.

```ts
import {
  DOCUMENT_SCHEMA_VERSION,
  normalizeEditorContent,
  type TiptapDocumentJson,
} from '@my-notebook/vue-block-editor'

const content: TiptapDocumentJson = normalizeEditorContent(input)
console.log(content.schemaVersion === DOCUMENT_SCHEMA_VERSION)
```

Use `parseEditorContentJson()` for persisted JSON strings. It rejects malformed document shapes before they reach Tiptap. `BlockRenderer` consumes the same normalized JSON and emits `openDocument` for internal document links; it does not emit content updates.

Applications that have their own document schema history can use `migrateEditorContent()` before saving. Supply pure, sequential `{ fromVersion, toVersion, migrate }` steps; the package validates the chain, preserves the returned document as a detached value, normalizes node IDs and stamps the current `DOCUMENT_SCHEMA_VERSION`.

Markdown remains an import/export format. It is not a lossless storage format for every block attribute, so applications that need stable round trips should persist the normalized JSON document and derive Markdown only for compatibility or export.

`DocumentTree` accepts a forest returned by `buildSidebarDocumentForest()` and emits selection, expansion, creation, rename, property, deletion and drag events. Persistence and routing remain owned by the consuming application.

The built-in table is implemented with Vue and native HTML tables. This package does not depend on VTable.

See [`docs/architecture.md`](./docs/architecture.md) for the layer boundaries, extension model and performance benchmark instructions. Mermaid and KaTeX are loaded lazily when their blocks are rendered; the current package still ships a single stylesheet and UMD fallback for compatibility.

## Applying Agent patches

`applyAgentBlockPatches(content, patches, { documentId, expectedVersion })` requires the
current persisted document identity and revision from the host, not values copied
from the incoming patch. It validates the entire batch before returning a detached
updated document. The host must still compare-and-save that revision atomically
when persisting the result; this pure function does not perform database writes.

Only accepted patches are applied. Insert operations generate fresh IDs; replacements
preserve top-level IDs in document order when block counts match. When counts differ,
only the first target ID is retained. Nested IDs are recreated by Markdown parsing.
`append` retains the existing behavior of inserting after the last target block.

Markdown raw HTML is imported as literal text, including inside code blocks, and is
escaped during HTML export. Relative links are preserved; executable or unknown
explicit URL schemes are replaced with `#`.

## Three-layer architecture

The package exposes three cooperating layers:

- **Document core**: `createDocumentSnapshot`, `searchDocumentBlocks` and
  `applyCoreOperations` are pure JSON operations. They do not mount Vue components
  or access the DOM.
- **Vue UI**: `BlockEditor`, `BlockRenderer`, `DocumentTree` and the editor
  extensions provide human editing and presentation.
- **Agent adapter**: `createAgentToolAdapter` exposes capability discovery,
  revision-checked reads, search, validation and operation application. The adapter
  returns a new document; the host application remains responsible for atomically
  persisting it and incrementing the revision.

Agent integrations should read with a revision, validate the operation batch, show
the resulting change to the user when approval is required, and persist the returned
JSON with a compare-and-swap on that same revision.
