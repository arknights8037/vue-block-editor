import { readFileSync, writeFileSync } from 'node:fs'

// Keep the hand-authored page structure separate from generated API sections.
// This makes docs:sync deterministic and safe to run before every build.
const templatePath = new URL('../docs/index.template.html', import.meta.url)
const path = new URL('../docs/index.html', import.meta.url)
let source = readFileSync(path, 'utf8')

if (readFileSync(templatePath, 'utf8')) {
  source = readFileSync(templatePath, 'utf8')
}

const insertInto = (id, html) => {
  if (source.includes(`id="${id}-usage"`)) return
  const expression = new RegExp(`(<section[^>]*id="${id}"[^>]*>[\\s\\S]*?)(</section>)`)
  if (!expression.test(source)) throw new Error(`section not found: ${id}`)
  source = source.replace(expression, `$1${html}$2`)
}

const escapeAttribute = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')

const reference = (options) => `
        <div class="reference-toolbar"><div class="reference-tabs"><a class="reference-tab active" href="#${options.id}-usage">使用</a><a class="reference-tab" href="#${options.id}-api">接口</a><a class="reference-tab" href="#${options.id}-slots">插槽与组合</a></div>${options.demo ? `<a class="reference-demo" href="demo.html?type=${options.demo}" target="_blank" rel="noreferrer">打开真实示例 ↗</a>` : ''}</div>
        <div class="reference-block" id="${options.id}-usage"><div class="reference-copy"><div><h3>基础用法</h3><p>${options.usage}</p></div><a class="inline-demo-link" href="demo.html?type=${options.demo ?? 'editor'}" target="_blank" rel="noreferrer">在线预览 ↗</a></div><div class="code-block"><div class="code-header"><span>${options.file ?? 'App.vue'}</span><button class="copy-button" data-copy="${escapeAttribute(options.copy)}">复制</button></div><pre><code>${options.code}</code></pre></div></div>
        <div class="reference-block" id="${options.id}-api"><h3>接口</h3>${options.api}</div>
        <div class="reference-block" id="${options.id}-slots"><h3>插槽与组合</h3>${options.slots}</div>`

insertInto('block-editor', reference({
  id: 'block-editor', demo: 'editor', file: 'BlockEditor.vue',
  usage: '通过 v-model 绑定 TiptapDocumentJson。组件会自动初始化块 ID，并提供编辑、选择、拖拽、Slash 命令和历史记录。',
  copy: '<EditorProvider>\\n  <BlockEditor v-model="content" @text-update="handleTextUpdate" />\\n</EditorProvider>',
  code: '&lt;EditorProvider&gt;\n  &lt;BlockEditor\n    v-model="content"\n    :readonly="false"\n    :features="{ disabledBlocks: [\'mathBlock\'] }"\n    @text-update="handleTextUpdate"\n  /&gt;\n&lt;/EditorProvider&gt;',
  api: `<table class="prop-table"><thead><tr><th>Props</th><th>类型</th><th>默认值</th><th>说明</th></tr></thead><tbody><tr><td><code>modelValue</code></td><td><code>TiptapDocumentJson</code></td><td>undefined</td><td>v-model 文档内容</td></tr><tr><td><code>readonly</code></td><td><code>boolean</code></td><td>false</td><td>禁用编辑交互</td></tr><tr><td><code>settings</code></td><td><code>AppSettings</code></td><td>DEFAULT_APP_SETTINGS</td><td>编辑器宽度、字号、快捷键等</td></tr><tr><td><code>features</code></td><td><code>EditorFeatureOptions</code></td><td>{}</td><td>禁用块、隐藏块和自定义 Slash 菜单</td></tr><tr><td><code>plugins</code></td><td><code>EditorPlugin[]</code></td><td>[]</td><td>注册自定义块插件</td></tr><tr><td><code>documentId</code></td><td><code>string</code></td><td>''</td><td>内部文档链接和 Agent 上下文</td></tr></tbody></table><h4>Events</h4><div class="event-grid"><code>update:modelValue</code><span>内容 JSON 发生变化时触发</span><code>textUpdate</code><span>纯文本变化时触发，适合更新搜索索引</span><code>ready / destroy</code><span>编辑器实例创建和销毁</span><code>openDocument</code><span>点击内部文档链接，参数为 documentId、blockId</span></div><h4>Expose</h4><div class="token-list"><code>getJSON()</code><code>getText()</code><code>getSelectedBlocks()</code><code>insertMarkdown()</code><code>replaceBlocksWithMarkdown()</code><code>focus()</code><code>undo()</code><code>redo()</code></div>`,
  slots: `<p>BlockEditor 本身没有公开内容插槽，工具栏和上下文菜单由编辑器内部管理。需要替换交互层时，使用 <code>features.slashMenuComponent</code>、<code>features.slashMenuProps</code>，或组合导出的 <code>EditorBubbleMenu</code>、<code>EditorContextMenu</code>。</p><div class="atom-links"><a href="#ui-primitives">NButton / NButtonGroup →</a><a href="#slash-menu">SlashCommandMenu →</a><a href="#context-menu">EditorContextMenu →</a></div>`,
}))

insertInto('renderer', reference({
  id: 'renderer', demo: 'renderer', file: 'RendererPage.vue',
  usage: '把与编辑器相同的 JSON 传给 BlockRenderer，即可在预览、分享或搜索结果页面中只读渲染。',
  copy: '<BlockRenderer :content="content" :features="features" />',
  code: '&lt;BlockRenderer\n  :content="content"\n  :features="{ disabledRenderers: [\'mathBlock\'] }"\n  @open-document="openDocument"\n/&gt;',
  api: `<table class="prop-table"><thead><tr><th>Props</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><code>content</code></td><td><code>TiptapDocumentJson</code></td><td>待渲染的文档内容</td></tr><tr><td><code>features</code></td><td><code>EditorFeatureOptions</code></td><td>控制隐藏块和禁用内置渲染器</td></tr><tr><td><code>renderers</code></td><td><code>Record&lt;string, Component&gt;</code></td><td>按 block ID 或 node type 覆盖渲染器</td></tr><tr><td><code>plugins</code></td><td><code>EditorPlugin[]</code></td><td>与编辑器共享插件注册表</td></tr></tbody></table><h4>Events</h4><div class="event-grid"><code>openDocument</code><span>内部链接点击事件，参数为 documentId、blockId</span></div>`,
  slots: `<p>BlockRenderer 没有公开插槽。通过 <code>renderers</code> 注入自定义 readonlyView，组件会把 <code>node</code>、<code>attrs</code>、<code>content</code> 和 <code>readonly</code> 传给自定义组件。</p><div class="atom-links"><a href="#block-editor">BlockEditor ↗</a><a href="#content">文档数据契约 ↗</a></div>`,
}))

insertInto('tree', reference({
  id: 'tree', demo: 'tree', file: 'Sidebar.vue',
  usage: 'DocumentTree 只负责树形交互和事件派发，文档保存、路由和权限由宿主应用控制。',
  copy: '<DocumentTree :nodes="forest.rootNodes" :current-document-id="currentId" />',
  code: '&lt;DocumentTree\n  :nodes="forest.rootNodes"\n  :current-document-id="currentId"\n  :collapsed-document-ids="collapsedIds"\n  :dragged-article-id="draggedId"\n  :busy="saving"\n  @select="openDocument"\n  @rename="renameDocument"\n/&gt;',
  api: `<table class="prop-table"><thead><tr><th>Props</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><code>nodes</code></td><td><code>SidebarDocumentNode[]</code></td><td>buildSidebarDocumentForest 的树节点</td></tr><tr><td><code>currentDocumentId</code></td><td><code>DocumentId</code></td><td>当前高亮文档</td></tr><tr><td><code>collapsedDocumentIds</code></td><td><code>Set&lt;DocumentId&gt;</code></td><td>需要收起的节点集合</td></tr><tr><td><code>draggedArticleId</code></td><td><code>DocumentId | null</code></td><td>拖拽中的文章 ID</td></tr><tr><td><code>busy</code></td><td><code>boolean</code></td><td>保存期间禁用选择</td></tr></tbody></table><h4>Events</h4><div class="event-grid"><code>select / toggle</code><span>选择文档、展开或收起节点</span><code>createChild</code><span>请求在指定文档下新建子页面</span><code>properties / rename / delete</code><span>属性、重命名和删除操作</span><code>dragStart / dragEnd</code><span>拖拽生命周期，宿主负责排序持久化</span></div>`,
  slots: `<p>DocumentTree 本身没有插槽。每个节点由 <code>DocumentTreeNode</code>、<code>DocumentTreeNodeActions</code> 和 <code>DocumentTreeContextMenu</code> 组合；需要定制节点操作时，建议直接使用这些导出组件。</p><div class="atom-links"><a href="#ui-primitives">NTooltip / NPopover →</a><a href="#document-tree-node">DocumentTreeNode →</a></div>`,
}))

insertInto('table', reference({
  id: 'table', demo: 'table', file: 'TablePage.vue',
  usage: 'NativeTableEditor 使用原生 table 和 textarea，支持键盘导航、行列操作以及 TSV 粘贴。',
  copy: '<NativeTableEditor :rows="rows" @update="rows = $event" />',
  code: '&lt;NativeTableEditor\n  :rows="rows"\n  :fields="fields"\n  :readonly="readonly"\n  @update="rows = $event"\n  @update-fields="fields = $event"\n/&gt;',
  api: `<table class="prop-table"><thead><tr><th>Props</th><th>类型</th><th>说明</th></tr></thead><tbody><tr><td><code>rows</code></td><td><code>string[][] | null</code></td><td>包含标题行的二维单元格数组</td></tr><tr><td><code>fields</code></td><td><code>TableField[] | null</code></td><td>字段定义与类型信息</td></tr><tr><td><code>readonly</code></td><td><code>boolean</code></td><td>只读展示，隐藏编辑工具栏</td></tr></tbody></table><h4>Events</h4><div class="event-grid"><code>update</code><span>单元格、增删行列后返回新的 rows</span><code>update-fields</code><span>字段标题发生变化时返回字段定义</span></div>`,
  slots: `<p>NativeTableEditor 没有公开插槽。需要更换工具栏或单元格时，可复用内部的 <code>NativeTableToolbar</code>、<code>NativeTableHeader</code>、<code>NativeTableBody</code> 和 <code>useTableEditor</code> 组合。</p><div class="atom-links"><a href="#ui-primitives">NButton →</a><a href="#content">文档块数据 →</a></div>`,
}))

insertInto('provider', reference({
  id: 'provider', file: 'App.vue',
  usage: 'EditorProvider 提供包内 UI 服务上下文。把编辑器和需要消息、对话框的页面包在 Provider 内即可。',
  copy: '<EditorProvider>...</EditorProvider>',
  code: '&lt;EditorProvider&gt;\n  &lt;BlockEditor v-model="content" /&gt;\n&lt;/EditorProvider&gt;\n\n// 在子组件中\nconst message = useMessage()\nmessage.success(\'保存成功\')',
  api: `<table class="prop-table"><thead><tr><th>服务</th><th>方法</th><th>说明</th></tr></thead><tbody><tr><td><code>useMessage()</code></td><td><code>success(text)</code></td><td>显示成功 Toast</td></tr><tr><td><code>useMessage()</code></td><td><code>error(text)</code></td><td>显示错误 Toast</td></tr><tr><td><code>useDialog()</code></td><td><code>warning(options)</code></td><td>打开带确认/取消操作的警告对话框</td></tr></tbody></table>`,
  slots: `<p>EditorProvider 只有默认插槽，用于承载应用内容。消息服务和对话框服务通过 Vue provide/inject 提供；在 Provider 外调用时会得到安全的 no-op 实现。</p><div class="atom-links"><a href="#ui-primitives">查看 UI 原子组件 →</a></div>`,
}))

const primitives = `
      <section class="section" id="ui-primitives" data-title="UI 原子组件"><div class="section-kicker">UI PRIMITIVES</div><h2>UI 原子组件</h2><p class="section-lead">这些组件是编辑器菜单和宿主页面的基础积木，接口稳定、样式可被 class/style 透传。</p><div class="primitive-grid"><article class="primitive-card"><div><h3>NButton / NButtonGroup</h3><p>按钮、图标按钮、加载和禁用状态。</p></div><code>size · type · loading · #icon</code></article><article class="primitive-card"><div><h3>NInput / NSelect</h3><p>带 prefix、清空、计数和选项列表的表单控件。</p></div><code>v-model:value · options</code></article><article class="primitive-card"><div><h3>NPopover / NTooltip</h3><p>通过 trigger 命名插槽组合触发元素和浮层内容。</p></div><code>#trigger · default</code></article><article class="primitive-card"><div><h3>NModal / NDrawer</h3><p>对话框、抽屉和 footer 操作区。</p></div><code>v-model:show · #footer</code></article><article class="primitive-card"><div><h3>NColorPicker / NIcon</h3><p>原生颜色选择和统一尺寸图标容器。</p></div><code>update:value · #default</code></article><article class="primitive-card"><div><h3>SlashCommandMenu</h3><p>可替换 item、empty、footer 的命令列表。</p></div><code>#item · #empty · #footer</code></article></div><div class="atom-api"><h3>插槽速查</h3><div class="slot-list"><div><code>NButton</code><span>#icon、默认内容</span></div><div><code>NInput</code><span>#prefix</span></div><div><code>NPopover / NTooltip</code><span>#trigger、默认内容</span></div><div><code>NModal</code><span>#footer、默认内容</span></div><div><code>SlashCommandMenu</code><span>#item(item, selected)、#empty、#footer(items)</span></div><div><code>EditorContextMenu</code><span>#trigger、#content</span></div></div></div></section>`
if (!source.includes('class="primitive-usage"')) source = source.replace('<footer', `${primitives}\n      <footer`)

writeFileSync(path, source)
