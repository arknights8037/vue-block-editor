import type { Plugin } from 'vite'
import { completionUrl } from './agentModelUrl'

/** Development-only same-origin bridge. Production desktop uses its native command. */
export function agentProxy(): Plugin {
  return { name: 'micro-agent-proxy', configureServer(server) {
    server.middlewares.use('/__agent/completions', (request, response) => {
      void (async () => {
        const origin = request.headers.origin
        if (request.method !== 'POST' || !origin || new URL(origin).host !== request.headers.host || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
          response.writeHead(403).end(); return
        }
        const target = completionUrl(String(request.headers['x-agent-endpoint'] ?? ''))
        let body = ''
        for await (const chunk of request) {
          body += chunk.toString()
          if (Buffer.byteLength(body) > 2 * 1024 * 1024) { response.writeHead(413).end(); return }
        }
        const value = JSON.parse(body)
        if (value.stream !== false || !Array.isArray(value.messages) || !Array.isArray(value.tools) || value.tools.length !== 2 || value.tools.some((tool: any) => !['read', 'write'].includes(tool.function?.name))) { response.writeHead(400).end(); return }
        const upstream = await fetch(target, { method: 'POST', redirect: 'error', body, signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', ...(request.headers.authorization ? { Authorization: request.headers.authorization } : {}) } })
        const reader = upstream.body?.getReader()
        const chunks: Uint8Array[] = []
        let size = 0
        if (reader) {
          try {
            while (true) {
              const chunk = await reader.read()
              if (chunk.done) break
              size += chunk.value.length
              if (size > 8 * 1024 * 1024) throw new Error('Response too large')
              chunks.push(chunk.value)
            }
          } finally { await reader.cancel() }
        }
        response.writeHead(upstream.status, { 'Content-Type': 'application/json' }).end(Buffer.concat(chunks))
      })().catch(() => { if (!response.headersSent) response.writeHead(502); response.end() })
    })
  } }
}
