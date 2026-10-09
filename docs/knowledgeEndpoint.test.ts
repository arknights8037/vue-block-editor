import { describe, expect, it, vi } from 'vitest'
import { createKnowledgeEndpoint, remoteContent, type RemoteLibrary } from './knowledgeEndpoint'

const base = 'http://127.0.0.1:8000/api/v1'
const wiki: RemoteLibrary = { id: 'wiki', title: '知识库', kind: 'wiki', links: { list: 'wiki', item: 'wiki/{slug}' } }
const manifest = { protocol: 'knowledge-endpoint', name: 'Wiki', libraries: [wiki] }
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

describe('knowledge endpoint import', () => {
  it('refreshes cached course bodies and refuses a removed lesson before saving', async () => {
    const course = { ...wiki, kind: 'course', links: { list: 'courses', item: 'courses/{slug}' } }
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response([{ title: 'Course', lessons: [{ title: 'Lesson', slug: 'lesson', body_markdown: 'New server content' }] }])).mockResolvedValueOnce(response([]))
    const api = createKnowledgeEndpoint(base, {}, undefined, fetcher)
    expect(JSON.stringify(await api.readFresh(course, { title: 'Lesson', slug: 'lesson', body_markdown: 'Old cached content' }))).toContain('New server content')
    await expect(api.readFresh(course, { title: 'Lesson', slug: 'lesson' })).rejects.toThrow('文档已移除')
    expect(fetcher.mock.calls[0]?.[0]).toBe(`${base}/courses`)
  })
  it('discovers the exact manifest URL and follows relative library/detail links', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response(manifest))
      .mockResolvedValueOnce(response({ items: [{ title: 'Git', slug: 'git' }], total: 1, page: 1 }))
      .mockResolvedValueOnce(response({ title: 'Git', body_markdown: '# Git\n\nActual body' }))
    const api = createKnowledgeEndpoint(`${base}/`, { Authorization: 'Bearer test' }, undefined, fetcher)
    const found = await api.discover()
    const items = await api.list(found.libraries[0]!)
    expect(JSON.stringify(await api.read(wiki, items[0]!))).toContain('Actual body')
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([base, `${base}/wiki`, `${base}/wiki/git`])
    expect(fetcher.mock.calls[2]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer test' })
  })

  it('loads all pages instead of silently truncating to the first page', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ items: [{ title: 'First', id: 1 }], total: 2, page: 1 }))
      .mockResolvedValueOnce(response({ items: [{ title: 'Second', id: 2 }], total: 2, page: 2 }))
    expect(await createKnowledgeEndpoint(base, {}, undefined, fetcher).list(wiki)).toHaveLength(2)
    expect(fetcher.mock.calls[1]?.[0]).toBe(`${base}/wiki?page=2`)
  })

  it('fails visibly when a server repeats a page', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ items: [{ title: 'First', id: 1 }], total: 3, page: 1 }))
    await expect(createKnowledgeEndpoint(base, {}, undefined, fetcher).list(wiki)).rejects.toThrow('分页')
  })

  it.each([401, 403, 500])('does not disguise HTTP %s as a successful legacy import', async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({}, status))
    await expect(createKnowledgeEndpoint(base, {}, undefined, fetcher).discover()).rejects.toThrow(String(status))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('supports the existing document-kernel API only after manifest 404', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(response([{ id: 'one', title: 'One' }]))
      .mockResolvedValueOnce(response({ id: 'one', title: 'One', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kernel content' }] }] } }))
    const api = createKnowledgeEndpoint(base, {}, undefined, fetcher)
    const found = await api.discover()
    expect(JSON.stringify(await api.read(found.libraries[0]!, { id: 'one', title: 'One' }))).toContain('Kernel content')
    expect(fetcher.mock.calls[2]?.[0]).toBe(`${base}/documents/one`)
  })

  it('uses course lesson JSON directly without calling a course detail URL with the lesson slug', async () => {
    const fetcher = vi.fn<typeof fetch>()
    const doc = { type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lesson body' }] }] }
    const course = { ...wiki, kind: 'course', links: { list: 'courses', item: 'courses/{slug}' } }
    expect(await createKnowledgeEndpoint(base, {}, undefined, fetcher).read(course, { title: 'Lesson', slug: 'lesson', content_json: JSON.stringify(doc) })).toEqual(doc)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('falls back to Markdown when old JSON content is invalid', () => {
    expect(JSON.stringify(remoteContent({ title: 'Lesson', content_json: 'invalid', body_markdown: 'Markdown body' }))).toContain('Markdown body')
  })

  it('rejects malformed manifests and lists instead of presenting empty success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => response({ unexpected: true }))
    const api = createKnowledgeEndpoint(base, {}, undefined, fetcher)
    await expect(api.discover()).rejects.toThrow('端点清单')
    await expect(api.list(wiki)).rejects.toThrow('列表格式')
  })

  it('rejects cross-origin manifest URLs before sending credentials there', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ ...manifest, libraries: [{ ...wiki, links: { list: 'https://other.example/data' } }] }))
    await expect(createKnowledgeEndpoint(base, { Authorization: 'Bearer test' }, undefined, fetcher).discover()).rejects.toThrow('其他站点')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('reports network failure and forwards cancellation to fetch', async () => {
    const controller = new AbortController()
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(createKnowledgeEndpoint(base, {}, controller.signal, fetcher).discover()).rejects.toThrow('跨域')
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBe(controller.signal)
  })
})
