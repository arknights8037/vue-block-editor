/** Kept dependency-free for both the browser and the development bridge. */
export function completionUrl(base: string): string {
  let url: URL
  try { url = new URL(base.trim()) } catch { throw new Error('请填写有效的模型服务 URL。') }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('模型地址需为不含凭证和查询参数的 HTTP 或 HTTPS URL。')
  url.pathname = url.pathname.replace(/\/+$/, '')
  if (!url.pathname.endsWith('/chat/completions')) url.pathname += '/chat/completions'
  return url.toString()
}
