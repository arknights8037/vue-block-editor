import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadEndpoints, saveEndpoints } from './endpointSettings'
import { endpointFetch } from './endpointTransport'

afterEach(() => { localStorage.clear(); delete window.__TAURI__; vi.unstubAllGlobals() })

describe('endpoint settings across desktop restarts', () => {
  it('restores the edited configuration and selection, without storing credentials', () => {
    saveEndpoints(localStorage, [
      { id: 'local', name: '我的本地库', kind: 'local' },
      { id: 'wiki', name: 'Wiki 新名称', kind: 'remote', url: 'http://127.0.0.1:8000/api/v1', authMode: 'token', accessToken: 'secret', password: 'password' },
    ], 'wiki')
    const restored = loadEndpoints(localStorage)
    expect(restored.activeId).toBe('wiki')
    expect(restored.endpoints.map(item => item.name)).toEqual(['我的本地库', 'Wiki 新名称'])
    expect(JSON.stringify(restored)).not.toContain('secret')
    expect(JSON.stringify(localStorage)).not.toContain('password')
    expect(restored.endpoints[1]?.authMode).toBe('token')
  })
  it('falls back to the local endpoint after removing a remote connection', () => {
    saveEndpoints(localStorage, [{ id: 'local', name: '本地端点', kind: 'local' }], 'removed')
    expect(loadEndpoints(localStorage)).toMatchObject({ activeId: 'local', endpoints: [{ id: 'local' }] })
  })
  it('recovers malformed saved settings', () => {
    localStorage.setItem('block-editor:endpoints:v1', '{broken')
    expect(loadEndpoints(localStorage).endpoints).toHaveLength(1)
  })
})

describe('desktop endpoint transport', () => {
  it('uses native GET transport with auth and preserves HTTP errors', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 401, body: '{"detail":"unauthorized"}' })
    window.__TAURI__ = { core: { invoke } }
    const browserFetch = vi.fn()
    vi.stubGlobal('fetch', browserFetch)
    const result = await endpointFetch('http://127.0.0.1:8000/api/v1', { headers: { Authorization: 'Bearer test' } })
    expect(result.status).toBe(401)
    expect(invoke).toHaveBeenCalledWith('read_endpoint', { url: 'http://127.0.0.1:8000/api/v1', authorization: 'Bearer test' })
    expect(browserFetch).not.toHaveBeenCalled()
  })
  it('discards a desktop response after its endpoint was switched or deleted', async () => {
    const controller = new AbortController()
    const invoke = vi.fn().mockImplementation(async () => { controller.abort(); return { status: 200, body: '{}' } })
    window.__TAURI__ = { core: { invoke } }
    await expect(endpointFetch('http://127.0.0.1:8000/api/v1', { signal: controller.signal })).rejects.toThrow('Aborted')
  })
  it('uses native POST with MCP session headers and preserves SSE responses', async () => {
    const invoke = vi.fn().mockResolvedValue({ status: 200, body: 'data: {"id":1,"result":{}}\n\n', contentType: 'text/event-stream', sessionId: 'session' })
    window.__TAURI__ = { core: { invoke } }
    const result = await endpointFetch('http://127.0.0.1:8000/mcp/admin', {
      method: 'POST', body: '{"method":"initialize"}', headers: { Authorization: 'Bearer admin', 'Mcp-Session-Id': 'session', 'MCP-Protocol-Version': '2025-11-25' },
    })
    expect(invoke).toHaveBeenCalledWith('admin_endpoint', { url: 'http://127.0.0.1:8000/mcp/admin', authorization: 'Bearer admin', body: '{"method":"initialize"}', sessionId: 'session', protocol: '2025-11-25' })
    expect(result.headers.get('Content-Type')).toBe('text/event-stream')
    expect(result.headers.get('Mcp-Session-Id')).toBe('session')
  })
})
