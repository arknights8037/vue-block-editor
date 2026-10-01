import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/core.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'core.js' : 'core.cjs',
    },
    rollupOptions: {
      // Fail the build if a future core change introduces a runtime dependency.
      plugins: [{
        name: 'core-runtime-boundary',
        generateBundle(_, bundle) {
          for (const output of Object.values(bundle)) {
            if (output.type !== 'chunk' || output.imports.length || output.dynamicImports.length) {
              this.error('The core entry must contain only self-contained JavaScript.')
            }
            const uiModules = Object.keys(output.modules).filter((id) =>
              id.includes('/node_modules/') || /\.(vue|css)(\?|$)/.test(id),
            )
            if (uiModules.length) this.error(`Unexpected core dependencies: ${uiModules.join(', ')}`)
          }
        },
      }],
    },
  },
})
