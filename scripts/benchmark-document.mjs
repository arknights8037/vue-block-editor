import { performance } from 'node:perf_hooks'

const {
  applyCoreOperations,
  createDocumentSnapshot,
  normalizeEditorContent,
  searchDocumentBlocks,
} = await import('../dist/vue-block-editor.js')

const blockCount = Number(process.env.BENCHMARK_BLOCKS ?? 1000)
const source = {
  type: 'doc',
  content: Array.from({ length: blockCount }, (_, index) => ({
    type: index % 10 === 0 ? 'heading' : 'paragraph',
    attrs: index % 10 === 0 ? { level: 2 } : undefined,
    content: [{ type: 'text', text: `Benchmark block ${index}` }],
  })),
}

function measure(label, task) {
  const start = performance.now()
  const result = task()
  const elapsed = performance.now() - start
  console.log(`${label}: ${elapsed.toFixed(2)} ms`)
  return result
}

const normalized = measure('normalize', () => normalizeEditorContent(source))
const snapshot = measure('snapshot', () => createDocumentSnapshot('benchmark', 1, normalized))
measure('search', () => searchDocumentBlocks(snapshot, 'block 99'))
measure('apply', () => applyCoreOperations(snapshot, [{
  type: 'update_attrs',
  blockId: snapshot.blocks[Math.floor(blockCount / 2)].id,
  attrs: { benchmark: true },
}]))
console.log(`blocks: ${blockCount}`)
