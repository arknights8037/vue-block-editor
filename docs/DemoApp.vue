<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { endpointFetch } from './endpointTransport'
import { createAdminEndpoint, documentFingerprint } from './adminEndpoint'
import { loadEndpoints, saveEndpoints, type Endpoint } from './endpointSettings'
import { createKnowledgeEndpoint, type RemoteLibrary, type RemoteItem } from './knowledgeEndpoint'
import {
  createModelCompletion,
  loadModelConfig,
  saveModelConfig,
  validateModelConfig,
  type AgentModelConfig,
} from './agentModel'
import {
  Cloud,
  FilePlus2,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  Plus,
  Pencil,
  Trash2,
  Search,
  Server,
  Settings,
} from '@lucide/vue'
import BlockEditor from '../src/editor/EditorShell.vue'
import BlockRenderer from '../src/components/BlockRenderer.vue'
import DocumentTree from '../src/components/DocumentTree.vue'
import EditorProvider from '../src/ui/UiProvider.vue'
import { NInput, NModal, NSelect, NTooltip } from '../src/ui'
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
const activePanel = ref<'editor' | 'renderer'>('editor')
type EndpointKind = 'local' | 'remote'
let restored = { endpoints: [{ id: 'local', name: '本地端点', kind: 'local' }] as Endpoint[], activeId: 'local' }
try { restored = loadEndpoints(localStorage) } catch { /* Storage can be unavailable in private mode. */ }
const endpoints = ref<Endpoint[]>(restored.endpoints)
const activeEndpointId = ref('local')
const endpointDocuments = ref<Record<string, SidebarDocumentNode[]>>({})
const showCreateModal = ref(false)
const showEndpointModal = ref(false)
const showSettingsModal = ref(false)
let restoredModel: AgentModelConfig = { baseUrl: '', model: '', apiKey: '' }
try { restoredModel = loadModelConfig(localStorage) } catch { /* Storage can be unavailable in private mode. */ }
const modelConfig = ref<AgentModelConfig>(restoredModel)
const modelError = ref('')
const modelNotice = ref('')
const modelCompletion = computed(() => {
  try {
    return createModelCompletion(modelConfig.value, endpointFetch)
  } catch {
    return undefined
  }
})
const modelReady = computed(() => Boolean(modelCompletion.value))
const editorAi = computed(() => modelCompletion.value ? { complete: modelCompletion.value } : undefined)
const showDeleteEndpointModal = ref(false)
const deletingEndpointId = ref<string | null>(null)
const deletingEndpoint = computed(() => endpoints.value.find(item => item.id === deletingEndpointId.value))
const settingsNotice = ref('')
const endpointModalKind = ref<EndpointKind>('local')
const endpointModalMode = ref<'create' | 'edit'>('create')
const editingEndpointId = ref<string | null>(null)
const endpointName = ref('')
const endpointUrl = ref('')
const endpointAuthMode = ref<'none' | 'token' | 'basic'>('none')
const endpointAccessToken = ref('')
const endpointUsername = ref('')
const endpointPassword = ref('')
const endpointError = ref('')
const searchQuery = ref('')
const searchScope = ref<'current' | 'global'>('current')
const lastEvent = ref('仅保存在当前会话')
const remoteLoading = ref(false)
const documentLoading = ref(false)
const remoteError = ref('')
const documentError = ref('')
const endpointLibraries = ref<Record<string, RemoteLibrary[]>>({})
const libraryTrees = ref<Record<string, Record<string, SidebarDocumentNode[]>>>({})
const activeLibraryId = ref('')
const remoteItems = new Map<string, { endpointId: string; library: RemoteLibrary; item: RemoteItem }>()
const adminClients = new Map<string, ReturnType<typeof createAdminEndpoint>>()
const adminPermissions = ref<Record<string, string[]>>({})
const showAdminModal = ref(false)
const adminToken = ref('')
const adminError = ref('')
const adminConnecting = ref(false)
const saving = ref(false)
const saveError = ref('')
const savedFingerprint = ref('')
let serverFingerprint = ''
let initializeEditorBaseline = false
const editorInstance = ref<InstanceType<typeof BlockEditor> | null>(null)
async function editorReady(): Promise<void> {
  if (!initializeEditorBaseline || !isRemote.value) return
  const id = currentDocumentId.value
  await nextTick()
  const normalized = editorInstance.value?.getJSON()
  if (id !== currentDocumentId.value || !normalized) return
  content.value = normalized
  savedFingerprint.value = documentFingerprint(normalized)
  initializeEditorBaseline = false
}
function showEditor(): void {
  initializeEditorBaseline = isRemote.value && !dirty.value
  activePanel.value = 'editor'
}
const saveNotice = ref('')
const dirty = computed(() => isRemote.value && !!savedFingerprint.value && documentFingerprint(content.value) !== savedFingerprint.value)
const canEdit = computed(() => {
  const remote = remoteItems.get(currentDocumentId.value)
  const tool = remote?.library.kind === 'wiki' ? 'update_wiki_article' : remote?.library.kind === 'course' ? 'update_lesson' : ''
  return !!remote?.item.slug && (adminPermissions.value[activeEndpointId.value] ?? []).includes(tool)
})
const showLeaveModal = ref(false)
let leaveResolution: ((allowed: boolean) => void) | undefined
watch(showLeaveModal, show => { if (!show && leaveResolution) { leaveResolution(false); leaveResolution = undefined } })
function askToLeave(): Promise<boolean> {
  if (saving.value) return Promise.resolve(false)
  if (!dirty.value) return Promise.resolve(true)
  if (leaveResolution) return Promise.resolve(false)
  showLeaveModal.value = true
  return new Promise(resolve => { leaveResolution = resolve })
}
async function finishLeave(action: 'save' | 'discard' | 'cancel'): Promise<void> {
  if (saving.value) return
  if (action === 'save' && !await saveRemote()) return
  const resolve = leaveResolution
  leaveResolution = undefined
  showLeaveModal.value = false
  resolve?.(action !== 'cancel')
}
function openAdminModal(): void {
  adminToken.value = ''
  adminError.value = ''
  showAdminModal.value = true
}
function saveModelSettings(): void {
  modelError.value = ''
  modelNotice.value = ''
  try {
    validateModelConfig(modelConfig.value)
    saveModelConfig(localStorage, modelConfig.value)
    modelNotice.value = 'AI 设置已保存，编辑器中的 AI 助手已启用。'
  } catch (error) {
    modelError.value = error instanceof Error ? error.message : 'AI 设置无效。'
  }
}
watch(showSettingsModal, show => {
  if (show) { modelError.value = ''; modelNotice.value = '' }
})
async function enableEditing(): Promise<void> {
  if (adminConnecting.value || !activeEndpoint.value?.url) return
  const endpoint = activeEndpoint.value
  const id = endpoint.id
  adminConnecting.value = true
  adminError.value = ''
  try {
    const client = createAdminEndpoint(endpoint.url!, adminToken.value, endpointFetch)
    const tools = await client.connect()
    if (activeEndpointId.value !== id || !showAdminModal.value) return
    adminClients.set(id, client)
    adminPermissions.value[id] = [...tools]
    adminToken.value = ''
    showAdminModal.value = false
    readonly.value = false
    if (canEdit.value) showEditor()
    else activePanel.value = 'renderer'
    saveNotice.value = '管理员权限已验证'
  } catch (error) { adminError.value = error instanceof Error ? error.message : '管理员连接失败，请检查服务和令牌。' }
  finally { adminConnecting.value = false }
}
watch(showAdminModal, show => { if (!show) adminToken.value = '' })
async function saveRemote(): Promise<boolean> {
  const remote = remoteItems.get(currentDocumentId.value)
  const endpoint = activeEndpoint.value
  const client = adminClients.get(activeEndpointId.value)
  if (saving.value || !canEdit.value || !remote?.item.slug || !endpoint || !client) return false
  if (!dirty.value) return true
  saving.value = true
  saveError.value = ''
  saveNotice.value = ''
  const draft = JSON.parse(JSON.stringify(content.value)) as TiptapDocumentJson
  try {
    const api = endpointApi(endpoint, new AbortController().signal)
    const fresh = await api.readFresh(remote.library, remote.item)
    if (documentFingerprint(fresh) !== serverFingerprint) throw new Error('服务器内容已更新，未覆盖他人的修改。请先复制当前修改，再重新加载文档。')
    await client.save(remote.library.kind, remote.item.slug, draft)
    const persisted = await api.readFresh(remote.library, remote.item)
    if (documentFingerprint(persisted) !== documentFingerprint(draft)) throw new Error('服务器已接收保存，但回读内容不同，请核对后重试；当前修改仍保留。')
    savedFingerprint.value = documentFingerprint(draft)
    serverFingerprint = documentFingerprint(persisted)
    // Replace cached course bodies too, so switching away and back cannot restore old content.
    remote.item.content_json = JSON.stringify(draft)
    saveNotice.value = '已保存到 VibeCodingWiki'
    return true
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存失败，修改已保留，请检查网络后重试。'
    return false
  } finally { saving.value = false }
}
function beforeUnload(event: BeforeUnloadEvent): void {
  if (dirty.value || saving.value) { event.preventDefault(); event.returnValue = '' }
}
function saveShortcut(event: KeyboardEvent): void {
  if (isRemote.value && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void saveRemote() }
}
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); window.addEventListener('keydown', saveShortcut) })
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('keydown', saveShortcut); leaveResolution?.(false) })
const localContent = new Map<string, TiptapDocumentJson>([['roadmap', initialContent()]])
let endpointRequest = 0
let documentRequest = 0
let endpointController: AbortController | undefined
let documentController: AbortController | undefined
onBeforeUnmount(() => { endpointController?.abort(); documentController?.abort() })
const isRemote = computed(() => activeEndpoint.value?.kind === 'remote')
const libraryOptions = computed(() => (endpointLibraries.value[activeEndpointId.value] ?? []).map(item => ({ value: item.id, label: item.title })))
const activeLibrary = computed(() => endpointLibraries.value[activeEndpointId.value]?.find(item => item.id === activeLibraryId.value))


function makeSummary(id: string, title: string, parentId: string | null = null, documentKind: DocumentSummary['documentKind'] = 'article'): DocumentSummary {
  return { id, title, parentId, documentKind, tags: [], sourceUrl: '', author: '', description: '', plainText: '', revision: 1, sortOrder: 0, isDeleted: false, createdAt: 0, updatedAt: 0 }
}
const initialNodes: SidebarDocumentNode[] = [
  { document: makeSummary('product', '产品规划'), children: [
    { document: makeSummary('roadmap', '产品路线图', 'product'), children: [] },
    { document: makeSummary('release', '发布计划', 'product'), children: [] },
  ] },
  { document: makeSummary('meeting', '会议记录'), children: [] },
  { document: makeSummary('engineering', '技术文档'), children: [] },
]
endpointDocuments.value.local = initialNodes
for (const endpoint of endpoints.value) {
  if (endpoint.id !== 'local') endpointDocuments.value[endpoint.id] = []
}
onMounted(() => { if (restored.activeId !== 'local') void selectEndpoint(restored.activeId) })
watch([endpoints, activeEndpointId], () => {
  try { saveEndpoints(localStorage, endpoints.value, activeEndpointId.value) }
  catch { settingsNotice.value = '无法保存端点设置，重启后需要重新添加。' }
}, { deep: true })
const currentDocumentId = ref('roadmap')
const collapsedDocumentIds = ref(new Set<string>())
const activeEndpoint = computed(() => endpoints.value.find(item => item.id === activeEndpointId.value) ?? endpoints.value[0])
const nodes = computed(() => isRemote.value ? libraryTrees.value[activeEndpointId.value]?.[activeLibraryId.value] ?? [] : endpointDocuments.value[activeEndpointId.value] ?? [])
const currentTitle = computed(() => findTitle(nodes.value, currentDocumentId.value) || '请选择文档')

function matchesQuery(node: SidebarDocumentNode, query: string): boolean {
  return node.document.title.toLowerCase().includes(query) || node.children.some(child => matchesQuery(child, query))
}
function filterNodes(items: SidebarDocumentNode[], query: string): SidebarDocumentNode[] {
  if (!query) return items
  return items.filter(item => matchesQuery(item, query)).map(item => item.document.title.toLowerCase().includes(query) ? item : ({ ...item, children: filterNodes(item.children, query) }))
}
const filteredNodes = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query || searchScope.value === 'current') return filterNodes(nodes.value, query)
  return endpoints.value.flatMap(endpoint => filterNodes(endpointDocuments.value[endpoint.id] ?? [], query).map(node => ({ ...node, document: { ...node.document, title: `${endpoint.name} · ${node.document.title}` } })))
})

function findTitle(items: SidebarDocumentNode[], id: string): string {
  for (const item of items) {
    if (item.document.id === id) return item.document.title
    const childTitle = findTitle(item.children, id)
    if (childTitle) return childTitle
  }
  return ''
}
function findNode(items: SidebarDocumentNode[], id: string): SidebarDocumentNode | undefined {
  for (const item of items) {
    if (item.document.id === id) return item
    const child = findNode(item.children, id)
    if (child) return child
  }
}
function toggleTree(id: string): void {
  const next = new Set(collapsedDocumentIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  collapsedDocumentIds.value = next
}
function addChild(id: string): void {
  if (isRemote.value) return
  const parent = findNode(nodes.value, id)
  if (!parent) return
  const childId = `new-${Date.now()}`
  parent.children.push({ document: makeSummary(childId, '新建页面', id), children: [] })
  collapsedDocumentIds.value = new Set([...collapsedDocumentIds.value].filter(value => value !== id))
  void selectDocument(childId)
  showCreateModal.value = false
}
function createRootDocument(): void {
  if (isRemote.value) return
  const id = `new-${Date.now()}`
  nodes.value.push({ document: makeSummary(id, '新建页面'), children: [] })
  void selectDocument(id)
  showCreateModal.value = false
}
function createGroup(): void {
  if (isRemote.value) return
  const id = `group-${Date.now()}`
  nodes.value.push({ document: makeSummary(id, '新建分组', null, 'group'), children: [] })
  void selectDocument(id)
  showCreateModal.value = false
}
function buildDocumentTree(summaries: DocumentSummary[]): SidebarDocumentNode[] {
  const byId = new Map(summaries.map(summary => [summary.id, { document: summary, children: [] as SidebarDocumentNode[] }]))
  const roots: SidebarDocumentNode[] = []
  for (const node of byId.values()) {
    const parent = node.document.parentId ? byId.get(node.document.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}
function endpointHeaders(endpoint: Endpoint): Record<string, string> {
  if (endpoint.authMode === 'token' && endpoint.accessToken) return { Authorization: `Bearer ${endpoint.accessToken}` }
  if (endpoint.authMode === 'basic' && endpoint.username) {
    const bytes = new TextEncoder().encode(`${endpoint.username}:${endpoint.password ?? ''}`)
    return { Authorization: `Basic ${btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))}` }
  }
  return {}
}
function endpointApi(endpoint: Endpoint, signal: AbortSignal) {
  return createKnowledgeEndpoint(endpoint.url!, endpointHeaders(endpoint), signal, endpointFetch)
}
function remoteTree(endpointId: string, library: RemoteLibrary, items: RemoteItem[]): SidebarDocumentNode[] {
  const summaries: DocumentSummary[] = []
  const key = (kind: string, id: string | number) => JSON.stringify([endpointId, library.id, kind, id])
  const groups = new Set<string>()
  function add(item: RemoteItem, parentId: string | null = null, prefix = '') {
    const id = key('item', `${prefix}${item.slug ?? item.id}`)
    if (item.slug === undefined && item.id === undefined) throw new Error(`“${item.title}”缺少文档标识。`)
    const summary = makeSummary(id, item.title, parentId, item.documentKind ?? 'article')
    summary.description = item.summary ?? ''
    summaries.push(summary)
    remoteItems.set(id, { endpointId, library, item })
  }
  for (const item of items) {
    if (library.kind === 'course') {
      if (!Array.isArray(item.lessons)) throw new Error(`课程“${item.title}”缺少课时列表。`)
      const groupId = key('course', item.slug ?? String(item.id))
      summaries.push(makeSummary(groupId, item.title, null, 'group'))
      for (const lesson of item.lessons) add(lesson, groupId, `${item.slug ?? item.id}/`)
    } else if (library.kind === 'wiki') {
      const category = typeof item.category === 'string' ? item.category : item.category?.name
      const groupId = category ? key('category', typeof item.category === 'object' ? item.category?.id ?? category : category) : null
      if (groupId && !groups.has(groupId)) {
        summaries.push(makeSummary(groupId, category!, null, 'group'))
        groups.add(groupId)
      }
      add(item, groupId)
    } else {
      add(item, item.parentId ? key('item', item.parentId) : null)
    }
  }
  return buildDocumentTree(summaries)
}
function firstArticle(items: SidebarDocumentNode[]): string {
  for (const node of items) {
    if (node.document.documentKind !== 'group') return node.document.id
    const child = firstArticle(node.children)
    if (child) return child
  }
  return ''
}
async function selectEndpoint(id: string): Promise<void> {
  if (!await askToLeave()) return
  savedFingerprint.value = ''
  saveError.value = ''
  saveNotice.value = ''
  const requestId = ++endpointRequest
  endpointController?.abort()
  documentController?.abort()
  ++documentRequest
  documentLoading.value = false
  activeEndpointId.value = id
  currentDocumentId.value = ''
  searchQuery.value = ''
  remoteError.value = ''
  documentError.value = ''
  remoteLoading.value = false
  const endpoint = endpoints.value.find(item => item.id === id)
  if (endpoint?.kind === 'remote' && endpoint.url) {
    if ((endpoint.authMode === 'token' && !endpoint.accessToken) || (endpoint.authMode === 'basic' && (!endpoint.username || !endpoint.password))) {
      remoteError.value = '此端点需要认证，请点击“编辑端点”重新填写凭证。'
      return
    }
    const previousLibrary = activeLibraryId.value
    endpointLibraries.value[id] = []
    libraryTrees.value[id] = {}
    endpointDocuments.value[id] = []
    for (const [key, value] of remoteItems) if (value.endpointId === id) remoteItems.delete(key)
    remoteLoading.value = true
    endpointController = new AbortController()
    try {
      const api = endpointApi(endpoint, endpointController.signal)
      const manifest = await api.discover()
      const lists = await Promise.all(manifest.libraries.map(async library => ({ library, items: await api.list(library) })))
      if (requestId !== endpointRequest) return
      const trees = Object.fromEntries(lists.map(({ library, items }) => [library.id, remoteTree(id, library, items)]))
      endpointLibraries.value[id] = manifest.libraries
      libraryTrees.value[id] = trees
      endpointDocuments.value[id] = Object.values(trees).flat()
      activeLibraryId.value = manifest.libraries.find(item => item.id === previousLibrary)?.id ?? manifest.libraries[0]?.id ?? ''
      activePanel.value = 'renderer'
    } catch (error) {
      if (requestId !== endpointRequest) return
      remoteError.value = error instanceof Error ? error.message : '读取端点失败'
      return
    } finally {
      if (requestId === endpointRequest) remoteLoading.value = false
    }
  }
  void selectDocument(firstArticle(nodes.value))
}
async function selectLibrary(id: string): Promise<void> {
  if (id === activeLibraryId.value || !await askToLeave()) return
  savedFingerprint.value = ''
  activeLibraryId.value = id
  searchQuery.value = ''
  void selectDocument(firstArticle(nodes.value))
}
function updateContent(value: TiptapDocumentJson): void {
  if (isRemote.value) {
    if (!canEdit.value || saving.value) return
    content.value = value
    saveNotice.value = ''
    return
  }
  content.value = value
  localContent.set(currentDocumentId.value, value)
  lastEvent.value = '仅保存在当前会话'
}
function openEndpointModal(kind: EndpointKind, endpointId?: string): void {
  endpointModalMode.value = endpointId ? 'edit' : 'create'
  editingEndpointId.value = endpointId ?? null
  endpointModalKind.value = kind
  const existing = endpointId ? endpoints.value.find(item => item.id === endpointId) : undefined
  endpointName.value = existing?.name ?? (kind === 'local' ? '本地端点' : '远程端点')
  endpointUrl.value = existing?.url ?? ''
  endpointAuthMode.value = existing?.authMode ?? 'none'
  endpointAccessToken.value = existing?.accessToken ?? ''
  endpointUsername.value = existing?.username ?? ''
  endpointPassword.value = existing?.password ?? ''
  endpointError.value = ''
  settingsNotice.value = ''
  showEndpointModal.value = true
}
async function createEndpoint(): Promise<void> {
  const name = endpointName.value.trim() || (endpointModalKind.value === 'local' ? '本地端点' : '远程端点')
  const url = endpointUrl.value.trim()
  if (endpointModalKind.value === 'remote' && !/^https?:\/\//i.test(url)) {
    endpointError.value = '远程端点需要填写 http:// 或 https:// 服务地址。'
    return
  }
  if (endpointAuthMode.value === 'token' && !endpointAccessToken.value.trim()) {
    endpointError.value = 'Token 认证需要填写访问令牌。'
    return
  }
  if (endpointAuthMode.value === 'basic' && (!endpointUsername.value.trim() || !endpointPassword.value)) {
    endpointError.value = 'Basic 认证需要填写用户名和密码。'
    return
  }
  if (!await askToLeave()) return
  savedFingerprint.value = ''
  const id = editingEndpointId.value ?? `${endpointModalKind.value}-${Date.now()}`
  const config = {
    id, name, kind: endpointModalKind.value, url: url || undefined,
    authMode: endpointAuthMode.value,
    accessToken: endpointAuthMode.value === 'token' ? endpointAccessToken.value : undefined,
    username: endpointAuthMode.value === 'basic' ? endpointUsername.value : undefined,
    password: endpointAuthMode.value === 'basic' ? endpointPassword.value : undefined,
  } satisfies Endpoint
  const existingIndex = endpoints.value.findIndex(item => item.id === id)
  if (existingIndex >= 0) endpoints.value[existingIndex] = config
  else endpoints.value.push(config)
  endpointDocuments.value[id] ??= config.kind === 'remote' ? [] : [{ document: makeSummary(`${id}-welcome`, '欢迎使用新端点'), children: [] }]
  showEndpointModal.value = false
  adminClients.delete(id)
  delete adminPermissions.value[id]
  selectEndpoint(id)
}
function requestDeleteEndpoint(): void {
  if (activeEndpointId.value === 'local') return
  deletingEndpointId.value = activeEndpointId.value
  showDeleteEndpointModal.value = true
}
async function deleteEndpoint(): Promise<void> {
  const id = deletingEndpointId.value
  if (!id || id === 'local') return
  if (!await askToLeave()) return
  savedFingerprint.value = ''
  if (activeEndpointId.value === id) await selectEndpoint('local')
  adminClients.delete(id)
  delete adminPermissions.value[id]
  const removed = endpointDocuments.value[id] ?? []
  function removeLocalContent(items: SidebarDocumentNode[]) {
    for (const item of items) { localContent.delete(item.document.id); removeLocalContent(item.children) }
  }
  removeLocalContent(removed)
  endpoints.value = endpoints.value.filter(item => item.id !== id)
  delete endpointDocuments.value[id]
  delete endpointLibraries.value[id]
  delete libraryTrees.value[id]
  for (const [key, item] of remoteItems) if (item.endpointId === id) remoteItems.delete(key)
  showDeleteEndpointModal.value = false
  deletingEndpointId.value = null
  settingsNotice.value = '端点连接已移除。'
}
async function selectDocument(id: string): Promise<void> {
  if (!await askToLeave()) return
  savedFingerprint.value = ''
  saveError.value = ''
  saveNotice.value = ''
  const owner = endpoints.value.find(endpoint => findNode(endpointDocuments.value[endpoint.id] ?? [], id))
  const remote = remoteItems.get(id)
  if (owner && owner.id !== activeEndpointId.value) {
    ++endpointRequest
    endpointController?.abort()
    remoteLoading.value = false
    remoteError.value = ''
    activeEndpointId.value = owner.id
  }
  if (remote) activeLibraryId.value = remote.library.id
  // Group search results can also belong to a different library.
  if (isRemote.value && !remote) {
    const library = Object.entries(libraryTrees.value[activeEndpointId.value] ?? {}).find(([, tree]) => findNode(tree, id))
    if (library) activeLibraryId.value = library[0]
  }
  const requestId = ++documentRequest
  documentController?.abort()
  documentLoading.value = false
  documentError.value = ''
  currentDocumentId.value = id
  content.value = { type: 'doc', content: [] }
  if (!id) return
  if (!isRemote.value) {
    content.value = localContent.get(id) ?? createInitialDocumentContent(currentTitle.value)
    activePanel.value = 'editor'
    return
  }
  activePanel.value = 'renderer'
  if (!remote) {
    content.value = createInitialDocumentContent(currentTitle.value)
    return
  }
  documentLoading.value = true
  documentController = new AbortController()
  try {
    const endpoint = activeEndpoint.value!
    const loaded = await endpointApi(endpoint, documentController.signal).readFresh(remote.library, remote.item)
    if (requestId === documentRequest) {
      content.value = loaded
      savedFingerprint.value = documentFingerprint(loaded)
      serverFingerprint = documentFingerprint(loaded)
      initializeEditorBaseline = true
      activePanel.value = canEdit.value ? 'editor' : 'renderer'
    }
  } catch (error) {
    if (requestId === documentRequest) documentError.value = error instanceof Error ? error.message : '读取正文失败'
  } finally {
    if (requestId === documentRequest) documentLoading.value = false
  }
}
</script>

<template>
  <EditorProvider>
    <div v-if="demo === 'editor'" class="workspace-shell">
      <aside class="workspace-rail" aria-label="应用导航">
        <div class="workspace-rail__top">
          <div class="endpoint-rail__label"><Server :size="15" /><span>端点</span></div>
          <NTooltip v-for="item in endpoints" :key="item.id">
            <template #trigger><button class="rail-button endpoint-button" :class="{ 'endpoint-button--active': item.id === activeEndpointId }" type="button" :aria-label="item.name" @click="selectEndpoint(item.id)"><Cloud v-if="item.kind === 'remote'" :size="18" /><HardDrive v-else :size="18" /><i /></button></template>
            {{ item.name }}<span v-if="item.url" class="tooltip-url">{{ item.url }}</span>
          </NTooltip>
          <NTooltip><template #trigger><button class="rail-button rail-button--add" type="button" aria-label="添加端点" @click="openEndpointModal('local')"><Plus :size="19" /></button></template>添加端点</NTooltip>
        </div>
        <div class="workspace-rail__bottom">
          <NTooltip><template #trigger><button class="rail-button" type="button" aria-label="设置" @click="showSettingsModal = true"><Settings :size="18" /></button></template>设置</NTooltip>
        </div>
      </aside>

      <aside class="workspace-library" aria-label="文档目录">
        <div class="library-search">
          <Search :size="15" />
          <NInput v-model:value="searchQuery" placeholder="搜索文档" aria-label="搜索文档" />
          <button type="button" class="search-scope" :class="{ active: searchScope === 'global' }" :aria-label="searchScope === 'current' ? '当前知识库搜索' : '全局搜索'" @click="searchScope = searchScope === 'current' ? 'global' : 'current'"><span>{{ searchScope === 'current' ? '当前' : '全局' }}</span></button>
        </div>
        <div class="endpoint-actions">
          <button type="button" @click="activeEndpoint && openEndpointModal(activeEndpoint.kind, activeEndpoint.id)"><Pencil :size="14" />编辑端点</button>
          <button type="button" class="endpoint-delete" :disabled="activeEndpointId === 'local'" :title="activeEndpointId === 'local' ? '默认本地端点不可删除' : '删除当前端点连接'" @click="requestDeleteEndpoint"><Trash2 :size="14" />删除端点</button>
        </div>
        <p v-if="settingsNotice" class="settings-notice" role="status">{{ settingsNotice }}</p>
        <div v-if="isRemote && libraryOptions.length" class="library-switch">
          <span class="library-switch__label">知识库</span>
          <NSelect :value="activeLibraryId" :options="libraryOptions" aria-label="切换知识库" @update:value="selectLibrary" />
        </div>
        <div v-if="isRemote" class="connection-status" role="status">{{ remoteLoading ? '正在读取端点…' : remoteError ? '连接失败' : `已连接 · ${libraryOptions.length} 个库 · ${adminPermissions[activeEndpointId]?.length ? '管理员' : '只读'}` }}<button :disabled="remoteLoading || saving" @click="selectEndpoint(activeEndpointId)">重新加载</button></div>
        <p v-if="remoteError" class="connection-error" role="alert">{{ remoteError }}</p>
        <div class="tree-heading"><span>目录</span><div class="tree-heading__actions"><NTooltip><template #trigger><button type="button" aria-label="新建分组" :disabled="isRemote" @click="showCreateModal = true"><Folder :size="15" /></button></template>新建分组</NTooltip><NTooltip><template #trigger><button type="button" aria-label="新建页面" :disabled="isRemote" @click="showCreateModal = true"><FilePlus2 :size="15" /></button></template>新建页面</NTooltip><NTooltip><template #trigger><button type="button" aria-label="配置当前端点" @click="activeEndpoint && openEndpointModal(activeEndpoint.kind, activeEndpoint.id)"><Settings :size="13" /></button></template>配置当前端点</NTooltip></div></div>
        <div class="library-tree">
          <DocumentTree :nodes="filteredNodes" :current-document-id="currentDocumentId" :collapsed-document-ids="collapsedDocumentIds" :dragged-article-id="null" :busy="remoteLoading" :readonly="isRemote" @select="selectDocument" @toggle="toggleTree" @create-child="addChild" />
          <div v-if="!remoteLoading && !remoteError && !filteredNodes.length" class="search-empty">{{ searchQuery ? '没有匹配的文档' : '当前库暂无文档' }}</div>
        </div>
        <div class="library-footer"><FileText :size="14" /><span>{{ nodes.length }} 个顶级文档</span><button type="button" @click="openEndpointModal('remote')">添加远程</button></div>
      </aside>

      <main class="workspace-main">
        <header class="editor-header">
          <div class="editor-breadcrumb"><span>{{ activeEndpoint?.name }}{{ activeLibrary && isRemote ? ` · ${activeLibrary.title}` : '' }}</span><span class="editor-breadcrumb__slash">/</span><strong>{{ currentTitle }}</strong></div>
          <div class="editor-actions">
            <div v-if="!isRemote || canEdit" class="view-switch" role="tablist" aria-label="编辑或预览"><button :class="{ active: activePanel === 'editor' }" type="button" @click="showEditor">编辑</button><button :class="{ active: activePanel === 'renderer' }" type="button" @click="activePanel = 'renderer'">预览</button></div>
            <button v-if="isRemote" type="button" class="modal-secondary admin-button" :disabled="saving || remoteLoading || !!remoteError" @click="openAdminModal">{{ adminPermissions[activeEndpointId]?.length ? '管理员凭证' : '启用编辑' }}</button>
            <span class="save-state" role="status">{{ isRemote ? saving ? '正在保存…' : dirty ? '有未保存修改' : saveNotice || (canEdit ? '管理员编辑' : '远程内容 · 只读') : lastEvent }}</span>
            <button v-if="isRemote && canEdit" type="button" class="modal-primary" :disabled="!dirty || saving || documentLoading" @click="saveRemote">{{ saving ? '保存中…' : '保存到 Wiki' }}</button>
            <button v-if="!isRemote" class="header-icon" type="button" aria-label="重置文档" @click="updateContent(createInitialDocumentContent(currentTitle))"><span>↺</span></button>
          </div>
        </header>
        <p v-if="saveError" class="remote-save-error" role="alert">{{ saveError }}</p>
        <section class="editor-stage" :aria-label="activePanel === 'editor' ? '文档编辑器' : '文档预览'">
          <div v-if="remoteLoading || documentLoading" class="content-message" role="status">正在加载内容…</div>
          <div v-else-if="documentError" class="content-message" role="alert">{{ documentError }} <button @click="selectDocument(currentDocumentId)">重试</button></div>
          <div v-else-if="!currentDocumentId" class="content-message">{{ remoteError ? '连接失败，请检查端点配置后重新加载。' : '请选择一篇文档' }}</div>
          <BlockEditor v-else-if="activePanel === 'editor' && (!isRemote || canEdit)" ref="editorInstance" :key="currentDocumentId" :model-value="content" :readonly="readonly || saving" :document-id="currentDocumentId" :ai="editorAi" aria-label="文档编辑器" @ready="editorReady" @update:model-value="updateContent" />
          <BlockRenderer v-else :content="content" aria-label="文档预览" />
        </section>
      </main>

      <NModal v-model:show="showCreateModal" title="新建内容">
        <div class="modal-actions"><button type="button" class="modal-action" @click="createGroup"><Folder :size="17" /><span><strong>新建分组</strong><small>创建一个用于整理页面的顶级分组</small></span></button><button type="button" class="modal-action" @click="createRootDocument"><FileText :size="17" /><span><strong>新建页面</strong><small>在当前库创建一个顶级页面</small></span></button><button type="button" class="modal-action" :disabled="!currentDocumentId" @click="addChild(currentDocumentId)"><FolderPlus :size="17" /><span><strong>新建子页面</strong><small>在当前文档下创建子页面</small></span></button></div>
      </NModal>
      <NModal v-model:show="showEndpointModal" :title="`${endpointModalMode === 'edit' ? '配置' : '添加'}${endpointModalKind === 'local' ? '本地端点' : '远程端点'}`">
        <div class="endpoint-form">
          <label><span>端点名称</span><NInput v-model:value="endpointName" placeholder="例如：个人知识库" /></label>
          <label><span>{{ endpointModalKind === 'remote' ? '服务 URL' : '本地地址（可选）' }}</span><NInput v-model:value="endpointUrl" :placeholder="endpointModalKind === 'remote' ? 'http://127.0.0.1:8000/api/v1' : '例如：C:/data/knowledge'" /></label>
          <label><span>操作凭证</span><select v-model="endpointAuthMode"><option value="none">无需认证</option><option value="token">访问 Token</option><option value="basic">用户名和密码</option></select></label>
          <label v-if="endpointAuthMode === 'token'"><span>访问 Token</span><NInput v-model:value="endpointAccessToken" type="password" autocomplete="off" placeholder="输入服务访问令牌" /></label>
          <template v-if="endpointAuthMode === 'basic'"><label><span>用户名</span><NInput v-model:value="endpointUsername" autocomplete="username" placeholder="用户名" /></label><label><span>密码</span><NInput v-model:value="endpointPassword" type="password" autocomplete="current-password" placeholder="密码" /></label></template>
          <p v-if="endpointError" class="endpoint-error">{{ endpointError }}</p>
          <p class="endpoint-hint">VibeCodingWiki 填写 http://127.0.0.1:8000/api/v1，可读取公开内容。打开文档后点击“启用编辑”，验证管理员 MCP Token 即可保存回服务器。端点名称和地址会自动保存，认证凭证仅保留在当前会话。</p>
        </div>
        <template #footer><button type="button" class="modal-primary" @click="createEndpoint">{{ endpointModalMode === 'edit' ? '保存配置' : '添加端点' }}</button></template>
      </NModal>
      <NModal v-model:show="showDeleteEndpointModal" title="删除端点">
        <p class="endpoint-delete-description">确定删除“{{ deletingEndpoint?.name }}”的连接配置？{{ deletingEndpoint?.kind === 'remote' ? '远程服务器上的文档不会被删除。' : '此端点当前会话中的本地页面也会被移除。' }}</p>
        <template #footer><div class="modal-footer-actions"><button type="button" class="modal-secondary" @click="showDeleteEndpointModal = false">取消</button><button type="button" class="modal-danger" @click="deleteEndpoint">确认删除端点</button></div></template>
      </NModal>
      <NModal v-model:show="showSettingsModal" title="工作台设置">
        <div class="settings-form">
          <label><span>编辑器模式</span><select v-model="readonly"><option :value="false">可编辑</option><option :value="true">只读</option></select></label>
          <label><span>模型服务地址</span><NInput v-model:value="modelConfig.baseUrl" placeholder="例如：http://127.0.0.1:11434/v1" /></label>
          <label><span>模型名称</span><NInput v-model:value="modelConfig.model" placeholder="例如：qwen2.5:7b 或 gpt-4o-mini" /></label>
          <label><span>API Key（当前会话）</span><NInput v-model:value="modelConfig.apiKey" type="password" autocomplete="off" placeholder="本地模型可留空" /></label>
          <p>填写 OpenAI 兼容的 Chat Completions 地址后，编辑器右下角会出现 AI 助手；右键块菜单可使用“块内 AI 编辑”。地址和模型名会保存，API Key 只保留在当前会话。</p>
          <p v-if="modelReady" class="settings-notice" role="status">AI 助手已就绪。</p>
          <p v-if="modelNotice" class="settings-notice" role="status">{{ modelNotice }}</p>
          <p v-if="modelError" class="endpoint-error" role="alert">{{ modelError }}</p>
        </div>
        <template #footer><button type="button" class="modal-primary" @click="saveModelSettings">保存 AI 设置</button></template>
      </NModal>
      <NModal v-model:show="showAdminModal" title="启用管理员编辑">
        <div class="endpoint-form">
          <p class="endpoint-hint">连接 {{ activeEndpoint?.name }} 的管理员接口，修改将写回 VibeCodingWiki。</p>
          <label><span>管理员 MCP Token</span><NInput v-model:value="adminToken" type="password" autocomplete="off" aria-label="管理员 MCP Token" placeholder="粘贴管理员账户的 MCP Token" :disabled="adminConnecting" /></label>
          <p class="endpoint-hint">在 VibeCodingWiki 中以管理员身份登录，从个人中心生成 MCP Token；也可使用后台 MCP 管理配置的令牌。令牌只保留在本次会话。</p>
          <p v-if="adminError" class="endpoint-error" role="alert">{{ adminError }}</p>
        </div>
        <template #footer><button type="button" class="modal-primary" :disabled="adminConnecting" @click="enableEditing">{{ adminConnecting ? '正在验证…' : '验证并进入编辑' }}</button></template>
      </NModal>
      <NModal v-model:show="showLeaveModal" title="有未保存的修改">
        <p class="endpoint-delete-description">“{{ currentTitle }}”的修改尚未保存到 VibeCodingWiki。</p>
        <p v-if="saveError" class="endpoint-error" role="alert">{{ saveError }}</p>
        <template #footer><div class="modal-footer-actions"><button type="button" class="modal-secondary" :disabled="saving" @click="finishLeave('cancel')">继续编辑</button><button type="button" class="modal-danger" :disabled="saving" @click="finishLeave('discard')">放弃修改</button><button type="button" class="modal-primary" :disabled="saving" @click="finishLeave('save')">{{ saving ? '保存中…' : '保存并继续' }}</button></div></template>
      </NModal>
    </div>
    <div v-else class="demo-root"><div class="demo-chrome"><span class="demo-brand">N</span><span>组件示例</span></div><div class="demo-editor"><BlockEditor v-model="content" :readonly="readonly" :ai="editorAi" aria-label="交互式块编辑器示例" /></div></div>
  </EditorProvider>
</template>
