# Vue Block Editor

一个可复用的 Vue 3 块编辑器组件库，提供 Tiptap 编辑器、只读渲染器、文档树、文档 JSON 核心操作和插件扩展边界。

[![CI](https://github.com/arknights8037/vue-block-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/arknights8037/vue-block-editor/actions/workflows/ci.yml)

项目仓库：[arknights8037/vue-block-editor](https://github.com/arknights8037/vue-block-editor)

## 快速开始

```bash
pnpm add @my-notebook/vue-block-editor
```

在 Vue 应用中引入样式和组件：

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

`EditorProvider` 提供弹窗、提示、Tooltip 和资源服务上下文。若应用已有自己的 UI 上下文，可以只使用编辑器组件并关闭内置 provider 注册。

## 包入口

| 入口 | 内容 | 适用场景 |
| --- | --- | --- |
| `@my-notebook/vue-block-editor` | 完整兼容入口 | 直接使用全部组件 |
| `@my-notebook/vue-block-editor/core` | 纯文档 JSON、迁移、快照、搜索和操作 | Node.js、服务端、Agent、无 UI 页面 |
| `@my-notebook/vue-block-editor/renderer` | 只读渲染器和文档树 | 阅读页、预览页 |
| `@my-notebook/vue-block-editor/editor` | 编辑器、Provider、插件、导入导出 | 编辑页 |
| `@my-notebook/vue-block-editor/style.css` | 组件样式 | UI 组件入口配套样式 |

`core`、`renderer` 和 `editor` 均提供 ESM、CommonJS 和 TypeScript 声明。只使用文档处理能力时，不需要加载 Vue 组件或 CSS。

## 文档数据契约

文档以 Tiptap JSON 作为持久化格式：

```ts
import {
  DOCUMENT_SCHEMA_VERSION,
  normalizeEditorContent,
  serializeEditorContent,
} from '@my-notebook/vue-block-editor/core'

const document = normalizeEditorContent(input)
const json = serializeEditorContent(document)
console.log(document.schemaVersion === DOCUMENT_SCHEMA_VERSION)
```

应用应在数据进入编辑器或数据库时执行规范化，并保存 `schemaVersion`。Markdown 用于导入导出，不建议作为需要稳定节点 ID 和完整属性的主存储格式。

## 插件

插件可以声明块、Mark、Tiptap 扩展、NodeView 以及格式适配器：

```ts
import { Node } from '@tiptap/core'
import {
  createEditorPluginRegistry,
  type EditorPlugin,
} from '@my-notebook/vue-block-editor/editor'

const notePlugin: EditorPlugin = {
  id: 'notes',
  version: 1,
  blocks: [{
    id: 'note-block',
    title: 'Note',
    aliases: ['note'],
    node: Node.create({ name: 'noteBlock' }),
    slash: {
      command: ({ editor, range }) =>
        editor.chain().deleteRange(range).insertContent({ type: 'noteBlock' }).run(),
    },
  }],
}

const registry = createEditorPluginRegistry([notePlugin])
```

插件默认参与编辑和只读渲染。可以通过 capability 限制参与面：

```ts
const rendererOnlyPlugin: EditorPlugin = {
  id: 'preview-only',
  version: 1,
  capabilities: { editor: false },
}
```

`importers.markdown`、`importers.json`、`exporters.markdown` 和 `exporters.html` 会分别遵守 `import` / `export` capability。插件注册表会优先调用启用的格式适配器，未处理时再使用内置实现。

## 资源服务

图片和附件通过 `AssetService` 解耦，应用可以注入自己的上传、查找、URL 解析和打开逻辑：

```ts
const assetService = {
  storeFile: (file, documentId) => uploadToBackend(file, documentId),
  findAsset: (id) => findFromBackend(id),
  resolveAssetUrl: (id) => resolveBackendUrl(id),
  openAsset: (id) => openBackendAsset(id),
}
```

将服务传给 `EditorProvider` 可以实现多编辑器实例隔离；导出函数也支持通过选项传入同一个服务。

## 开发与验证

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm docs:build
pnpm check:consumer
pnpm check:package
pnpm check:bundle
```

`examples/basic` 是最小消费者检查，`check:package` 会检查实际 tarball 的出口和 `core` 的 ESM/CommonJS 运行。发布前执行：

```bash
pnpm publish
```

`prepublishOnly` 会自动重新构建并执行包检查。

## 架构

```text
src/document   纯文档 JSON、ID 迁移和模板
src/core       快照、搜索、版本安全操作
src/agent      Agent 工具适配器
src/plugins    插件契约、注册表和格式扩展
src/editor     Tiptap 编辑器、NodeView 和交互
src/components 只读渲染器和文档树
src/ui         Provider 和基础 UI
```

详细边界见 [`docs/architecture.md`](./docs/architecture.md)。

项目文档网站：打开 [`docs/index.html`](./docs/index.html)，或在项目根目录运行
`python -m http.server 4173 --directory docs` 后访问 `http://127.0.0.1:4173/`。

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
