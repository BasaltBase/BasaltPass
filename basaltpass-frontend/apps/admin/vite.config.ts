import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@api': path.resolve(__dirname, '../../src/api'),
      '@components': path.resolve(__dirname, '../../src/components'),
      '@pages': path.resolve(__dirname, '../../src/pages'),
      '@utils': path.resolve(__dirname, '../../src/utils'),
      '@types': path.resolve(__dirname, '../../src/types'),
      '@contexts': path.resolve(__dirname, '../../src/contexts'),
    },
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
})
