export interface Endpoint {
  id: string
  name: string
  kind: 'local' | 'remote'
  url?: string
  authMode?: 'none' | 'token' | 'basic'
  accessToken?: string
  username?: string
  password?: string
}

const key = 'block-editor:endpoints:v1'
export function loadEndpoints(storage: Storage): { endpoints: Endpoint[]; activeId: string } {
  const local: Endpoint = { id: 'local', name: '本地端点', kind: 'local' }
  try {
    const saved = JSON.parse(storage.getItem(key) ?? '{}')
    const ids = new Set<string>(['local'])
    const endpoints: Endpoint[] = [local]
    for (const item of Array.isArray(saved.endpoints) ? saved.endpoints : []) {
      if (item?.id === 'local' && item.kind === 'local' && typeof item.name === 'string') { local.name = item.name; continue }
      if (!item || typeof item.id !== 'string' || ids.has(item.id) || typeof item.name !== 'string' || !['local', 'remote'].includes(item.kind)) continue
      if (item.kind === 'remote' && (typeof item.url !== 'string' || !/^https?:\/\//.test(item.url))) continue
      ids.add(item.id)
      endpoints.push({ id: item.id, name: item.name, kind: item.kind, url: item.url, authMode: ['token', 'basic'].includes(item.authMode) ? item.authMode : 'none' })
    }
    return { endpoints, activeId: ids.has(saved.activeId) ? saved.activeId : 'local' }
  } catch { return { endpoints: [local], activeId: 'local' } }
}

export function saveEndpoints(storage: Storage, endpoints: Endpoint[], activeId: string): void {
  // Secrets are deliberately session-only; editing/restarting must not persist credentials.
  storage.setItem(key, JSON.stringify({ activeId, endpoints: endpoints.map(({ id, name, kind, url, authMode }) => ({ id, name, kind, url, authMode })) }))
}
