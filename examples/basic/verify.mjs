import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const packageRoot = resolve(import.meta.dirname, '..', '..')
const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
const dist = join(packageRoot, 'dist')

for (const subpath of ['./core', './renderer', './editor']) {
  const entry = manifest.exports[subpath]
  assert.ok(entry, `Missing export ${subpath}`)
  assert.ok(existsSync(join(packageRoot, entry.types)), `Missing types for ${subpath}`)
  assert.ok(existsSync(join(packageRoot, entry.import)), `Missing ESM for ${subpath}`)
  assert.ok(existsSync(join(packageRoot, entry.require)), `Missing CJS for ${subpath}`)
}

const core = await import(pathToFileURL(join(packageRoot, manifest.exports['./core'].import)).href)
const snapshot = core.createDocumentSnapshot('consumer-test', 1, core.createInitialDocumentContent('Hello'))
assert.equal(core.searchDocumentBlocks(snapshot, 'Hello').length, 1)

const require = createRequire(import.meta.url)
const editor = require(join(packageRoot, manifest.exports['./editor'].require))
const renderer = require(join(packageRoot, manifest.exports['./renderer'].require))
assert.ok(editor.BlockEditor)
assert.ok(editor.EditorProvider)
assert.ok(renderer.DocumentRenderer)
assert.ok(renderer.BlockRenderer)
assert.ok(existsSync(join(dist, 'vue-block-editor.css')))

console.log('basic consumer verification passed')
