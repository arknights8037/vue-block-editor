import { createServer } from 'node:http'
import { createDocumentKernel, createInitialDocumentContent } from '../../dist/kernel.js'

const kernel = createDocumentKernel({
  documents: [{ id: 'welcome', title: '欢迎使用 Vue Block Editor', content: createInitialDocumentContent('欢迎使用 Vue Block Editor') }],
})

function json(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' })
  response.end(JSON.stringify(payload))
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (request.method === 'OPTIONS') return json(response, 204, null)
  if (url.pathname === '/api/endpoint') return json(response, 200, kernel.endpoints)
  if (url.pathname === '/api/documents' && request.method === 'GET') return json(response, 200, kernel.listDocuments())
  if (url.pathname === '/api/search' && request.method === 'GET') return json(response, 200, kernel.search(url.searchParams.get('q') ?? ''))
  if (url.pathname.startsWith('/api/documents/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/documents/'.length))
    if (request.method === 'PUT') {
      let body = ''
      for await (const chunk of request) body += chunk
      try {
        const input = JSON.parse(body)
        return json(response, 200, kernel.saveDocument({ id, title: input.title ?? '未命名文档', content: input.content, parentId: input.parentId }))
      } catch (error) {
        return json(response, 400, { error: error instanceof Error ? error.message : 'Invalid JSON' })
      }
    }
    const document = kernel.getDocument(id)
    return document ? json(response, 200, document) : json(response, 404, { error: 'Document not found' })
  }
  return json(response, 404, { error: 'Not found' })
})

const port = Number(process.env.PORT ?? 8787)
server.listen(port, '0.0.0.0', () => console.log(`Vue Block Editor kernel listening on http://0.0.0.0:${port}`))
