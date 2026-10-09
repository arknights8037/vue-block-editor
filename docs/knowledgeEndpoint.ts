import { parseMarkdownDocument } from '../src/editor/markdownImport'
import type { TiptapDocumentJson } from '../src/models/document'

export interface RemoteLibrary {
  id: string
  title: string
  kind: string
  links: { list: string; item?: string }
}
export interface RemoteItem {
  id?: string | number
  slug?: string
  title: string
  summary?: string
  body_markdown?: string
  content_json?: string | TiptapDocumentJson | null
  contentJson?: string
  content?: TiptapDocumentJson
  parentId?: string | null
  documentKind?: 'article' | 'group'
  category?: { id?: number; name?: string } | string | null
  lessons?: RemoteItem[]
}
export interface RemoteManifest {
  protocol: string
  name: string
  libraries: RemoteLibrary[]
}

class HttpError extends Error {
  constructor(public status: number) {
    super(status === 401 || status === 403 ? `访问被拒绝（${status}），请检查端点认证。` : `请求失败（HTTP ${status}）`)
  }
}

export function createKnowledgeEndpoint(endpoint: string, headers: Record<string, string> = {}, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
  const base = endpoint.trim().replace(/\/+$/, '')
  function resolve(link: string): string {
    const url = new URL(link, `${base}/`)
    // A manifest cannot redirect this endpoint's credentials to another service.
    const source = new URL(base)
    const loopbackAlias = [source.hostname, url.hostname].every(host => ['localhost', '127.0.0.1'].includes(host)) && source.port === url.port && source.protocol === url.protocol
    if (url.origin !== source.origin && !loopbackAlias) throw new Error('端点清单包含其他站点的地址，无法读取。')
    return url.toString()
  }
  async function request<T>(link: string): Promise<T> {
    let response: Response
    try {
      response = await fetcher(resolve(link), { headers: { Accept: 'application/json', ...headers }, signal, redirect: 'error' })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new Error('无法连接端点，请检查服务地址、网络以及后端允许的跨域来源。')
    }
    if (!response.ok) throw new HttpError(response.status)
    try { return await response.json() as T } catch { throw new Error('服务没有返回有效的 JSON，请填写 API 端点地址。') }
  }
  async function discover(): Promise<RemoteManifest> {
    let data: RemoteManifest
    try { data = await request<RemoteManifest>(base) } catch (error) {
      // Preserve the original document-kernel API, but never hide auth/network errors.
      if (!(error instanceof HttpError) || error.status !== 404) throw error
      await list({ id: 'documents', title: '文档', kind: 'document', links: { list: `${base}/documents` } })
      return { protocol: 'documents', name: '远程文档', libraries: [{ id: 'documents', title: '文档', kind: 'document', links: { list: `${base}/documents`, item: `${base}/documents/{id}` } }] }
    }
    if (data?.protocol !== 'knowledge-endpoint' || !Array.isArray(data.libraries)) throw new Error('不是知识库端点清单，请使用 http://127.0.0.1:8000/api/v1。')
    const ids = new Set<string>()
    for (const library of data.libraries) {
      if (!library.id || ids.has(library.id) || !library.title || !library.links?.list) throw new Error('端点清单中的知识库定义无效。')
      if (!['wiki', 'course', 'document'].includes(library.kind)) throw new Error(`暂不支持知识库类型：${library.kind}`)
      ids.add(library.id)
      resolve(library.links.list)
      if (library.links.item) resolve(library.links.item)
    }
    return data
  }
  async function list(library: RemoteLibrary): Promise<RemoteItem[]> {
    const result: RemoteItem[] = []
    const url = new URL(resolve(library.links.list))
    for (let page = 1; page <= 1000; page++) {
      if (page > 1) url.searchParams.set('page', String(page))
      const data = await request<RemoteItem[] | { items: RemoteItem[]; total?: number; page?: number }>(url.toString())
      const items = Array.isArray(data) ? data : data?.items
      if (!Array.isArray(items) || items.some(item => !item || typeof item.title !== 'string')) throw new Error(`“${library.title}”列表格式无效。`)
      if (!Array.isArray(data) && data.page !== undefined && data.page !== page) throw new Error('知识库分页返回异常，请重试。')
      result.push(...items)
      if (Array.isArray(data) || data.total === undefined || result.length >= data.total) return result
      if (!items.length) throw new Error('知识库分页返回异常，请重试。')
    }
    throw new Error('知识库分页过多，请缩小数据范围。')
  }
  async function read(library: RemoteLibrary, item: RemoteItem): Promise<TiptapDocumentJson> {
    const hasBody = item.body_markdown !== undefined || item.content_json != null || item.contentJson !== undefined || item.content !== undefined
    const detail = !hasBody && library.links.item
      ? await request<RemoteItem>(library.links.item.replace('{slug}', encodeURIComponent(item.slug ?? String(item.id))).replace('{id}', encodeURIComponent(String(item.id))))
      : item
    return remoteContent({ ...item, ...detail })
  }
  async function readFresh(library: RemoteLibrary, item: RemoteItem): Promise<TiptapDocumentJson> {
    if (library.kind !== 'course' && library.links.item) {
      const detail = await request<RemoteItem>(library.links.item.replace('{slug}', encodeURIComponent(item.slug ?? String(item.id))).replace('{id}', encodeURIComponent(String(item.id))))
      return remoteContent({ ...item, ...detail })
    }
    const items = await list(library)
    const fresh = (library.kind === 'course' ? items.flatMap(course => course.lessons ?? []) : items).find(value => item.slug ? value.slug === item.slug : value.id === item.id)
    if (!fresh) throw new Error('文档已移除或不再公开，修改仍保留在编辑器中。')
    return read(library, fresh)
  }
  return { discover, list, read, readFresh }
}

export function remoteContent(item: RemoteItem): TiptapDocumentJson {
  const serialized = item.content_json ?? item.contentJson ?? item.content
  if (serialized) {
    try {
      const doc = typeof serialized === 'string' ? JSON.parse(serialized) : serialized
      if (doc?.type === 'doc' && Array.isArray(doc.content)) return doc
    } catch { /* Older content may have invalid JSON; use its Markdown representation. */ }
  }
  return parseMarkdownDocument(item.body_markdown ?? item.summary ?? '', item.title).content
}
