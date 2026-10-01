<script setup lang="ts">
import { computed, ref } from 'vue'
import BlockEditor from '../src/editor/EditorShell.vue'
import BlockRenderer from '../src/components/BlockRenderer.vue'
import DocumentTree from '../src/components/DocumentTree.vue'
import NativeTableEditor from '../src/editor/NativeTableEditor.vue'
import EditorProvider from '../src/ui/UiProvider.vue'
import { createInitialDocumentContent } from '../src/editor/documentTemplate'
import type { TiptapDocumentJson, DocumentSummary } from '../src/models/document'
import type { SidebarDocumentNode } from '../src/components/documentTree'

const demo = new URLSearchParams(location.search).get('type') ?? 'editor'
const initialContent = (): TiptapDocumentJson => {
  const doc = createInitialDocumentContent('第二季度发布计划')
  doc.content = [
    doc.content?.[0] ?? { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '第二季度发布计划' }] },
    { type: 'paragraph', content: [{ type: 'text', text: '让团队在一个清晰、可操作的空间里协作。' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '完成用户访谈' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '整理反馈并创建路线图' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: '发布 Beta 版本' }] }] },
    ] },
  ]
  return doc
}
const content = ref<TiptapDocumentJson>(initialContent())
const readonly = ref(false)
const lastEvent = ref('点击或编辑内容以体验组件')
const rows = ref<string[][]>([
  ['任务', '负责人', '状态'],
  ['组件文档', '设计组', '进行中'],
  ['交互测试', '前端组', '待开始'],
])

function makeSummary(id: string, title: string, parentId: string | null = null): DocumentSummary {
  return {
    id, title, parentId, documentKind: 'article', tags: [], sourceUrl: '', author: '',
    description: '', plainText: '', revision: 1, sortOrder: 0, isDeleted: false,
    createdAt: 0, updatedAt: 0,
  }
}

const nodes = ref<SidebarDocumentNode[]>([
  { document: makeSummary('product', '产品规划'), children: [
    { document: makeSummary('roadmap', '产品路线图', 'product'), children: [] },
    { document: makeSummary('release', '发布计划', 'product'), children: [] },
  ] },
  { document: makeSummary('meeting', '会议记录'), children: [] },
  { document: makeSummary('engineering', '技术文档'), children: [] },
])
const currentDocumentId = ref('roadmap')
const collapsedDocumentIds = ref(new Set<string>())
const treeStatus = computed(() => `当前文档：${findTitle(nodes.value, currentDocumentId.value)}`)

function findTitle(items: SidebarDocumentNode[], id: string): string {
  for (const item of items) {
    if (item.document.id === id) return item.document.title
    const childTitle = findTitle(item.children, id)
    if (childTitle) return childTitle
  }
  return ''
}

function toggleTree(id: string): void {
  const next = new Set(collapsedDocumentIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedDocumentIds.value = next
}

function addChild(id: string): void {
  const parent = nodes.value.find(node => node.document.id === id)
  if (!parent) return
  const childId = `new-${Date.now()}`
  parent.children.push({ document: makeSummary(childId, '新建页面', id), children: [] })
  collapsedDocumentIds.value = new Set([...collapsedDocumentIds.value].filter(value => value !== id))
  currentDocumentId.value = childId
}
</script>

<template>
  <EditorProvider>
    <div class="demo-root" :class="`demo-root--${demo}`">
      <template v-if="demo === 'editor'">
        <div class="demo-chrome"><span class="demo-brand">N</span><span>产品发布计划</span><span class="demo-spacer"></span><button type="button" @click="readonly = !readonly">{{ readonly ? '切换编辑' : '只读模式' }}</button><button type="button" @click="content = initialContent()">重置</button></div>
        <div class="demo-editor"><BlockEditor v-model="content" :readonly="readonly" aria-label="交互式块编辑器示例" @text-update="lastEvent = '内容已更新'" /></div>
        <div class="demo-status">{{ lastEvent }} · 试试输入文字、回车或 “/” 命令</div>
      </template>
      <template v-else-if="demo === 'renderer'">
        <div class="demo-chrome"><span class="demo-brand">N</span><span>只读文档预览</span></div>
        <div class="demo-renderer"><BlockRenderer :content="content" aria-label="只读渲染示例" /></div>
      </template>
      <template v-else-if="demo === 'tree'">
        <div class="demo-tree-layout"><div class="demo-tree"><div class="demo-tree-title">工作空间 <span>文档</span></div><DocumentTree :nodes="nodes" :current-document-id="currentDocumentId" :collapsed-document-ids="collapsedDocumentIds" :dragged-article-id="null" :busy="false" @select="currentDocumentId = $event" @toggle="toggleTree" @create-child="addChild" /></div><div class="demo-tree-detail"><span class="demo-detail-kicker">DOCUMENT TREE</span><h2>{{ findTitle(nodes, currentDocumentId) }}</h2><p>选择一个文档，或展开“产品规划”查看子页面。</p><small>{{ treeStatus }}</small></div></div>
      </template>
      <template v-else-if="demo === 'table'">
        <div class="demo-chrome"><span class="demo-brand">N</span><span>任务清单</span><span class="demo-spacer"></span><span class="demo-count">{{ rows.length - 1 }} 行数据</span></div>
        <div class="demo-table"><NativeTableEditor :rows="rows" @update="rows = $event" /></div>
        <div class="demo-status">可以编辑单元格、添加行列，或粘贴 TSV 数据。</div>
      </template>
    </div>
  </EditorProvider>
</template>
