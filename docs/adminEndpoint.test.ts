import { describe, expect, it, vi } from 'vitest'
import { createAdminEndpoint } from './adminEndpoint'

const doc = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: '管理员编辑后的正文，必须同时保存为 Markdown 和文档 JSON。' }] }] }
function fixture(options: { denied?: boolean; error?: boolean; sse?: boolean; tools?: string[] } = {}) {
  const fetcher = vi.fn(async (_url: any, init: any) => {
    const request = JSON.parse(init.body)
    if (options.denied) return new Response('{}', { status: 401 })
    if (request.method === 'notifications/initialized') return new Response(null, { status: 202 })
    const result = request.method === 'initialize' ? { protocolVersion: '2025-11-25' }
      : request.method === 'tools/list' ? { tools: (options.tools ?? ['update_wiki_article', 'update_lesson']).map(name => ({ name })) }
      : { isError: options.error ?? false, content: [{ type: 'text', text: options.error ? '写入被拒绝' : '{"version":2}' }] }
    const response = JSON.stringify({ jsonrpc: '2.0', id: request.id, result })
    return new Response(options.sse ? `event: message\ndata: ${response}\n\n` : response, { headers: { 'Content-Type': options.sse ? 'text/event-stream' : 'application/json', 'Mcp-Session-Id': 'test-session' } })
  })
  return { fetcher: fetcher as typeof fetch & typeof fetcher, client: createAdminEndpoint('http://127.0.0.1:8000/api/v1', 'admin-token', fetcher as typeof fetch) }
}
describe('administrator writes', () => {
  it('negotiates auth/session and saves Markdown plus JSON without changing metadata', async () => {
    const { client, fetcher } = fixture({ sse: true })
    await client.connect()
    await client.save('wiki', 'wiki-slug', doc)
    const [url, init] = fetcher.mock.calls.at(-1)!
    expect(url).toBe('http://127.0.0.1:8000/mcp/admin')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer admin-token', 'Mcp-Session-Id': 'test-session' })
    const call = JSON.parse(init.body)
    expect(call.params.name).toBe('update_wiki_article')
    expect(call.params.arguments).toEqual({ slug: 'wiki-slug', body_markdown: '管理员编辑后的正文，必须同时保存为 Markdown 和文档 JSON。\n', content_json: JSON.stringify(doc) })
  })
  it('uses the lesson tool when saving a course', async () => {
    const { client, fetcher } = fixture()
    await client.connect()
    await client.save('course', 'lesson-slug', doc)
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body).params.name).toBe('update_lesson')
  })
  it('rejects unauthorized credentials before allowing writes', async () => {
    const { client, fetcher } = fixture({ denied: true })
    await expect(client.connect()).rejects.toThrow('管理员权限验证失败')
    await expect(client.save('wiki', 'slug', doc)).rejects.toThrow('请先验证')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('surfaces tool errors instead of treating HTTP 200 as saved', async () => {
    const { client } = fixture({ error: true })
    await client.connect()
    await expect(client.save('wiki', 'slug', doc)).rejects.toThrow('写入被拒绝')
  })
  it('respects the tool permissions of each library', async () => {
    const { client, fetcher } = fixture({ tools: ['update_lesson'] })
    await client.connect()
    await expect(client.save('wiki', 'slug', doc)).rejects.toThrow('请先验证')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it('validates Wiki body limits before issuing a write', async () => {
    const { client, fetcher } = fixture()
    await client.connect()
    await expect(client.save('wiki', 'slug', { type: 'doc', content: [] })).rejects.toThrow('20～50000')
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
})
