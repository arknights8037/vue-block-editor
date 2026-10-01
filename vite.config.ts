import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        statements: 35,
        branches: 30,
        functions: 30,
        lines: 35,
      },
    },
  },
  plugins: [
    vue(),
    dts({
      entryRoot: 'src',
      exclude: ['src/**/*.test.ts'],
      insertTypesEntry: true,
      tsconfigPath: './tsconfig.json',
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'VueBlockEditor',
      formats: ['es', 'umd'],
      fileName: (format) => (format === 'es' ? 'vue-block-editor.js' : 'vue-block-editor.umd.cjs'),
      cssFileName: 'vue-block-editor',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
})
