import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const entries = {
  renderer: { entry: './src/renderer.ts', name: 'VueBlockRenderer' },
  editor: { entry: './src/editor.ts', name: 'VueBlockEditor' },
} as const

export default defineConfig(({ mode }) => {
  const selected = entries[mode as keyof typeof entries]
  if (!selected) throw new Error(`Unknown subpath build mode: ${mode}`)

  return {
    plugins: [
      vue(),
      dts({
        entryRoot: 'src',
        exclude: ['src/**/*.test.ts'],
        insertTypesEntry: false,
        tsconfigPath: './tsconfig.json',
      }),
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      emptyOutDir: false,
      lib: {
        entry: fileURLToPath(new URL(selected.entry, import.meta.url)),
        name: selected.name,
        formats: ['es', 'cjs'],
        fileName: (format: string) => `${mode}.${format === 'es' ? 'js' : 'cjs'}`,
      },
      rollupOptions: {
        external: ['vue'],
        output: { globals: { vue: 'Vue' } },
      },
    },
  }
})
