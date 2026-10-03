import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Match Cloudflare's directory-index behaviour when previewing download links locally.
const downloadRoutes = new Set(['/modelflow/', '/checkin/', '/local-toolbox/', '/billtrace/', '/token-monitor/', '/zenew/', '/ai-chronicle/'])
const rewriteDownloads = (server) => {
  server.middlewares.use((req, _res, next) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1')
    if (downloadRoutes.has(url.pathname)) req.url = `${url.pathname}index.html${url.search}`
    next()
  })
}

export default defineConfig({
  plugins: [react(), { name: 'voyra-download-index', configureServer: rewriteDownloads, configurePreviewServer: rewriteDownloads }],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'lucide': ['lucide-react'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
