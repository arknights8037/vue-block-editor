import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { agentProxy } from './agentProxy'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [vue(), agentProxy()],
  server: {
    proxy: {
      // Local demo bridge; remote deployments should configure CORS on their API.
      '/__vibecodingwiki-test': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/__vibecodingwiki-test/, ''),
        configure: proxy => proxy.on('proxyReq', request => request.removeHeader('origin')),
      },
      '/__vibecodingwiki': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/__vibecodingwiki/, ''),
        configure: proxy => proxy.on('proxyReq', request => request.removeHeader('origin')),
      },
    },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  build: {
    outDir: fileURLToPath(new URL('../docs-dist', import.meta.url)),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo.html', import.meta.url)),
      },
    },
  },
})
