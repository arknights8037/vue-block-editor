import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
const workspace = mkdtempSync(join(tmpdir(), 'vue-block-editor-pack-'))

try {
  // Execute the package manager through Node, without a shell on Windows.
  const packageManagerCli = process.env.npm_execpath
  if (!packageManagerCli) throw new Error('Run this check through pnpm check:package.')
  execFileSync(process.execPath, [packageManagerCli, 'pack', '--pack-destination', workspace], {
    cwd: root, encoding: 'utf8',
  })
  const archives = readdirSync(workspace).filter((name) => name.endsWith('.tgz'))
  assert.equal(archives.length, 1)
  execFileSync('tar', ['-xf', join(workspace, archives[0]), '-C', workspace])
  const packageRoot = join(workspace, 'package')
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  for (const entry of Object.values(manifest.exports)) {
    for (const target of typeof entry === 'string' ? [entry] : Object.values(entry)) {
      assert.ok(existsSync(join(packageRoot, target)), `Missing packed export: ${target}`)
    }
  }
  const coreEntry = manifest.exports['./core']
  const esm = await import(pathToFileURL(join(packageRoot, coreEntry.import)).href)
  const cjs = createRequire(import.meta.url)(join(packageRoot, coreEntry.require))
  for (const api of [esm, cjs]) {
    const content = api.createInitialDocumentContent('Packed package test')
    const snapshot = api.createDocumentSnapshot('test', 1, content)
    assert.equal(snapshot.schemaVersion, api.DOCUMENT_SCHEMA_VERSION)
    assert.ok(api.searchDocumentBlocks(snapshot, 'Packed').length > 0)
    const serialized = api.serializeEditorContent(content)
    assert.deepEqual(api.parseEditorContentJson(serialized), content)
    const result = api.applyCoreOperations(snapshot, [{
      type: 'update_attrs', blockId: snapshot.blocks[0].id, attrs: { level: 2 },
    }])
    assert.equal(result.ok, true)
    assert.equal(result.content.content[0].attrs.level, 2)
  }
  console.log('Packed exports exist; core ESM and CommonJS work without installed runtime dependencies.')
} finally {
  rmSync(workspace, { recursive: true, force: true })
}
