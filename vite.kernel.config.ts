import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [dts({
    entryRoot: 'src',
    include: ['src/kernel.ts'],
    insertTypesEntry: false,
    tsconfigPath: './tsconfig.json',
    beforeWriteFile: (filePath, content) => ({
      filePath: filePath.replace(/[\\/]src[\\/]kernel\.d\.ts$/, '/kernel.d.ts'),
      content,
    }),
  })],
  build: {
    emptyOutDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/kernel.ts', import.meta.url)),
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'kernel.js' : 'kernel.cjs',
    },
    rollupOptions: {
      plugins: [{
        name: 'kernel-runtime-boundary',
        generateBundle(_, bundle) {
          for (const output of Object.values(bundle)) {
            if (output.type !== 'chunk' || output.imports.length || output.dynamicImports.length) {
              this.error('The kernel entry must contain only self-contained JavaScript.')
            }
            const uiModules = Object.keys(output.modules).filter((id) =>
              id.includes('/node_modules/') || /\.vue|\.css(\?|$)/.test(id),
            )
            if (uiModules.length) this.error(`Unexpected kernel dependencies: ${uiModules.join(', ')}`)
          }
        },
      }],
    },
  },
})
