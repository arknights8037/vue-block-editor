import { MICRO_AGENT_TOOLS, type MicroCompletion, type MicroMessage } from '../src/agent/microRuntime'
import './endpointTransport'

export interface AgentModelConfig { baseUrl: string; model: string; apiKey: string }
export function completionUrl(base: string): string {
  let url: URL
  try { url = new URL(base.trim()) } catch { throw new Error('请填写有效的模型服务 URL。') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('模型地址需为不含凭证和查询参数的 HTTP 或 HTTPS URL。')
  url.pathname = url.pathname.replace(/\/+$/, '')
  if (!url.pathname.endsWith('/chat/completions')) url.pathname += '/chat/completions'
  return url.toString()
}
export function validateModelConfig(config: AgentModelConfig): void {
  const url = new URL(completionUrl(config.baseUrl))
  if (!config.model.trim()) throw new Error('请填写模型名称。')
  if (!config.apiKey.trim() && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('请填写模型服务的 API Key。')
}
export function loadModelConfig(storage: Storage): AgentModelConfig {
  try {
    const data = JSON.parse(storage.getItem('block-editor:micro-agent:v1') ?? '{}')
    return { baseUrl: typeof data.baseUrl === 'string' ? data.baseUrl : '', model: typeof data.model === 'string' ? data.model : '', apiKey: '' }
  } catch { return { baseUrl: '', model: '', apiKey: '' } }
}
export function saveModelConfig(storage: Storage, config: AgentModelConfig): void {
  storage.setItem('block-editor:micro-agent:v1', JSON.stringify({ baseUrl: config.baseUrl, model: config.model }))
}

export function createModelCompletion(config: AgentModelConfig, fetcher: typeof fetch = fetch): MicroCompletion {
  validateModelConfig(config)
  const url = completionUrl(config.baseUrl)
  return async (messages, signal) => {
    signal.throwIfAborted()
    const body = JSON.stringify({ model: config.model.trim(), messages, tools: MICRO_AGENT_TOOLS, tool_choice: 'auto', stream: false })
    if (body.length > 2 * 1024 * 1024) throw new Error('文档超出本次助手处理范围，请缩小文档后重试。')
    const authorization = config.apiKey.trim() ? `Bearer ${config.apiKey.trim()}` : null
    let response: Response
    try {
      if (window.__TAURI__) {
        const result = await window.__TAURI__.core.invoke<{ status: number; body: string }>('agent_completion', { url, authorization, body })
        signal.throwIfAborted()
        response = new Response(result.body, { status: result.status })
      } else {
        const bridged = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(location.hostname)
        response = await fetcher(bridged ? '/__agent/completions' : url, {
          method: 'POST', redirect: 'error', body,
          signal: AbortSignal.any([signal, AbortSignal.timeout(60000)]),
          headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}), ...(bridged ? { 'X-Agent-Endpoint': url } : {}) },
        })
      }
    } catch (error) {
      if (signal.aborted) throw error
      throw new Error('模型连接失败或响应超时，请检查服务地址、网络和跨域设置。')
    }
    signal.throwIfAborted()
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? '模型认证失败，请检查 API Key。' : response.status === 429 ? '模型请求过于频繁或额度不足，请稍后重试。' : `模型请求失败（HTTP ${response.status}），请检查模型名称和服务设置。`)
    const payload = await response.json()
    const choice = payload?.choices?.[0]
    if (!choice || choice.finish_reason === 'length' || !choice.message || choice.message.role !== 'assistant') throw new Error('模型回复不完整或格式不兼容，请调整模型设置后重试。')
    const value = choice.message
    if (value.content != null && typeof value.content !== 'string') throw new Error('模型回复格式不兼容。')
    if (value.tool_calls != null && (!Array.isArray(value.tool_calls) || value.tool_calls.some((call: any) => typeof call.id !== 'string' || call.type !== 'function' || typeof call.function?.name !== 'string' || typeof call.function?.arguments !== 'string'))) throw new Error('模型返回了无效工具调用。')
    // Preserve thinking-mode context required by compatible providers, without rendering it.
    return { role: 'assistant', content: value.content ?? null, ...(value.tool_calls ? { tool_calls: value.tool_calls } : {}), ...(typeof value.reasoning_content === 'string' ? { reasoning_content: value.reasoning_content } : {}) } as MicroMessage
  }
}
