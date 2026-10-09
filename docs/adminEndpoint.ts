import type { TiptapDocumentJson } from '../src/models/document'
import { exportDocumentToMarkdown } from '../src/editor/documentExport'

type RpcResponse = { id?: number; result?: any; error?: { message?: string } }

/** The admin credential is independent of credentials used to read public content. */
export function createAdminEndpoint(base: string, token: string, fetcher: typeof fetch = fetch) {
  const url = new URL('/mcp/admin', base).toString()
  if (!['http:', 'https:'].includes(new URL(base).protocol) || new URL(base).username || new URL(base).password) throw new Error('管理员服务地址无效。')
  let sequence = 0
  let session = ''
  let protocol = '2025-11-25'
  let connected = false
  const tools = new Set<string>()

  async function rpc(method: string, params?: Record<string, unknown>, notification = false): Promise<any> {
    const id = ++sequence
    const response = await fetcher(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: {
        Accept: 'application/json, text/event-stream', 'Content-Type': 'application/json',
        Authorization: `Bearer ${token.trim()}`, 'MCP-Protocol-Version': protocol,
        ...(session ? { 'Mcp-Session-Id': session } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id }), method, ...(params ? { params } : {}) }),
    })
    if (!response.ok) {
      throw new Error(response.status === 401 || response.status === 403
        ? '管理员权限验证失败，请检查管理员 MCP Token。'
        : response.status === 404 ? '管理员会话已失效，请重新启用编辑。'
        : response.status === 503 ? 'MCP 服务已停用，请在 VibeCodingWiki 后台启用。'
        : `管理员请求失败（HTTP ${response.status}）。`)
    }
    session = response.headers.get('Mcp-Session-Id') ?? session
    if (notification) { await response.body?.cancel(); return }
    let message: RpcResponse | undefined
    if (response.headers.get('Content-Type')?.includes('text/event-stream')) {
      const reader = response.body?.getReader()
      if (!reader) throw new Error('管理员服务没有返回响应。')
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (!message) {
          const chunk = await reader.read()
          buffer += decoder.decode(chunk.value, { stream: !chunk.done }).replace(/\r\n/g, '\n')
          let boundary: number
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
            const event = buffer.slice(0, boundary)
            buffer = buffer.slice(boundary + 2)
            const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
            if (!data) continue
            const candidate = JSON.parse(data) as RpcResponse
            if (candidate.id === id) message = candidate
          }
          if (chunk.done) break
        }
      } finally { await reader.cancel() }
    } else message = await response.json() as RpcResponse
    if (!message || message.id !== id) throw new Error('管理员服务响应无效。')
    if (message.error) throw new Error(message.error.message ?? '管理员操作失败。')
    return message.result
  }

  async function connect(): Promise<Set<string>> {
    if (!token.trim()) throw new Error('请填写管理员 MCP Token。')
    const initialized = await rpc('initialize', { protocolVersion: protocol, capabilities: {}, clientInfo: { name: 'Vue Block Editor', version: '0.1.0' } })
    if (!initialized?.protocolVersion) throw new Error('管理员服务初始化失败。')
    protocol = initialized.protocolVersion
    await rpc('notifications/initialized', undefined, true)
    tools.clear()
    let cursor: string | undefined
    do {
      const result = await rpc('tools/list', cursor ? { cursor } : {})
      if (!Array.isArray(result?.tools)) throw new Error('管理员工具列表无效。')
      for (const tool of result.tools) tools.add(tool.name)
      cursor = result.nextCursor
    } while (cursor)
    if (!tools.has('update_wiki_article') && !tools.has('update_lesson')) throw new Error('当前端点没有 Wiki 或课时编辑权限。')
    connected = true
    return new Set(tools)
  }

  async function save(kind: string, slug: string, content: TiptapDocumentJson): Promise<void> {
    const name = kind === 'wiki' ? 'update_wiki_article' : kind === 'course' ? 'update_lesson' : ''
    if (!connected || !tools.has(name)) throw new Error('请先验证当前知识库的管理员编辑权限。')
    const markdown = await exportDocumentToMarkdown(content, { title: '', includeTitle: false })
    if (kind === 'wiki' && (markdown.trim().length < 20 || markdown.trim().length > 50000)) throw new Error('Wiki 正文需为 20～50000 个字符，请调整后保存。')
    const result = await rpc('tools/call', { name, arguments: { slug, body_markdown: markdown, content_json: JSON.stringify(content) } })
    if (result?.isError) throw new Error(result.content?.filter((block: any) => block.type === 'text').map((block: any) => block.text).join('\n') || '保存失败，修改已保留。')
    if (!result || (!result.structuredContent && !Array.isArray(result.content))) throw new Error('服务未确认保存，请重新加载核对；修改已保留。')
  }
  return { connect, save }
}

// Ignore editor-only block identities when detecting changes to a Markdown import.
export function documentFingerprint(content: TiptapDocumentJson): string {
  return JSON.stringify(content, (key, value) => ['blockId', 'id', 'schemaVersion'].includes(key) ? undefined : value)
}
