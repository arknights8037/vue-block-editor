/** Preserve relative links; reject executable and unknown explicit schemes. */
export function safeLinkUrl(value: string): string {
  const href = value.trim()
  const probe = href.replace(/[\u0000-\u0020\u007f]/g, '')
  const scheme = probe.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase()
  return !scheme || ['http', 'https', 'mailto', 'tel'].includes(scheme) ? href : '#'
}
