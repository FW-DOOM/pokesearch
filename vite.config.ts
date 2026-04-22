import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/target': {
        target: 'https://redsky.target.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/target/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
          'Origin': 'https://www.target.com',
          'Referer': 'https://www.target.com/',
        },
      },
      '/api/walmart': {
        target: 'https://www.walmart.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/walmart/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      },
    },
  },
})
