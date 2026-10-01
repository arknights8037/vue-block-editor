# Architecture and extension boundaries

The package has three runtime layers. `src/core` contains pure document snapshots, search and revision-aware operations. `src/editor` contains the Tiptap schema, Vue node views and editing interactions. `src/components` contains readonly rendering and document-tree interactions. `src/agent` adapts the pure core layer to host persistence callbacks.

The dependency direction is deliberate:

```text
models ───────┐
              ├── core ─── agent
plugins ──────┘
   │
   └── editor ─── components
                    │
                    └── ui
```

`EditorPluginRegistry` is the extension boundary. A plugin declares Tiptap nodes, marks, extensions and optional Vue views. Editor and readonly renderer participation can be controlled with `capabilities`. The registry validates IDs and node names before an editor is created.

Document JSON is the persistence boundary. Hosts should normalize at ingress, persist JSON with its `schemaVersion`, and use `migrateEditorContent` for application-owned migrations. Markdown is an import/export format and should not be used as the canonical storage format when stable IDs or block attributes matter.

Shared block command and menu contracts live in `src/plugins/blockContracts.ts`.
The plugin adapter depends on these contracts rather than the editor command
registry; the old editor type exports remain as compatibility aliases.

The pure document implementation lives under `src/document`; the editor path keeps
compatibility re-exports for existing imports. The package publishes a `core`
subpath for document normalization, migrations,
snapshots, search, operations and the agent tool adapter. It is built separately
as ESM and CommonJS without runtime dependencies or CSS. The build rejects UI
modules and external runtime imports in this entry. `pnpm check:package` checks
the actual archive and executes both formats outside the repository dependencies.

Mermaid and KaTeX are loaded lazily from their node views. This keeps initial interaction code smaller, but the UI build still emits one CSS file and a large UMD fallback. Separate `renderer` and `enhanced-blocks` entries remain future work without changing the document contract.

For performance checks, run `pnpm build` followed by `pnpm bench:document`. The benchmark exercises normalization, snapshot creation, search and a revision-safe update against a configurable number of blocks.
