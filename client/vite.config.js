import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000', // forward /api requests to backend
      '/auth': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
  },
})
