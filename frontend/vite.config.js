import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Use an explicit loopback address. On some Windows setups `localhost`
        // resolves to IPv6 first while the API is listening on IPv4, causing
        // intermittent proxy connection resets.
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        timeout: 30_000,
        proxyTimeout: 30_000,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        timeout: 30_000,
        proxyTimeout: 30_000,
      },
      '/socket.io': {
        target: 'ws://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
        timeout: 30_000,
        proxyTimeout: 30_000,
      },
    },
  },
})
