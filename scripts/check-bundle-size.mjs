import { gzipSync } from 'node:zlib'
import { statSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const files = [
  ['dist/index-*.js', 2_000_000],
  ['dist/vue-block-editor.umd.cjs', 6_000_000],
  ['dist/vue-block-editor.css', 2_000_000],
]

for (const [pattern, limit] of files) {
  const path = pattern.includes('*')
    ? (await import('node:fs')).readdirSync(resolve(root, 'dist'))
      .filter((name) => name.startsWith('index-') && name.endsWith('.js'))
      .sort((left, right) => statSync(resolve(root, 'dist', right)).size - statSync(resolve(root, 'dist', left)).size)[0]
    : pattern.slice('dist/'.length)
  if (!path) throw new Error(`Missing bundle for ${pattern}`)
  const absolute = resolve(root, 'dist', path)
  const bytes = statSync(absolute).size
  const gzip = gzipSync(readFileSync(absolute)).length
  console.log(`${path}: ${bytes} bytes (${gzip} gzip)`)
  if (bytes > limit) throw new Error(`${path} exceeds ${limit} byte budget`)
}
