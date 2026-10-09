type NativeReadResult = { status: number; body: string; contentType?: string; sessionId?: string }
declare global {
  interface Window {
    __TAURI__?: { core: { invoke<T>(command: string, args: Record<string, unknown>): Promise<T> } }
  }
}

export const endpointFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input))
  if (window.__TAURI__) {
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const headers = new Headers(init?.headers)
    const post = init?.method?.toUpperCase() === 'POST'
    if (init?.method && !['GET', 'POST'].includes(init.method.toUpperCase())) throw new Error('不支持的端点请求。')
    const response = await window.__TAURI__.core.invoke<NativeReadResult>(post ? 'admin_endpoint' : 'read_endpoint', {
      url: url.toString(), authorization: headers.get('Authorization'),
      ...(post ? { body: init?.body, sessionId: headers.get('Mcp-Session-Id'), protocol: headers.get('MCP-Protocol-Version') } : {}),
    })
    if (init?.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return new Response(response.status === 204 || response.status === 304 ? null : response.body, {
      status: response.status, headers: { 'Content-Type': response.contentType ?? 'application/json', ...(response.sessionId ? { 'Mcp-Session-Id': response.sessionId } : {}) },
    })
  }
  const localDemo = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(location.hostname)
  const localWiki = ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:' && ['8000', '8001'].includes(url.port)
  const bridgedPath = url.pathname === '/api/v1' || url.pathname.startsWith('/api/v1/') || /^\/mcp\/admin\/?$/.test(url.pathname)
  return fetch(localDemo && localWiki && bridgedPath
    ? `/__vibecodingwiki${url.port === '8001' ? '-test' : ''}${url.pathname}${url.search}` : input, init)
}
