import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../src'),
      '@api': path.resolve(__dirname, '../../src/shared/api'),
      '@components': path.resolve(__dirname, '../../src/shared/components'),
      '@pages': path.resolve(__dirname, '../../src/features'),
      '@features': path.resolve(__dirname, '../../src/features'),
      '@utils': path.resolve(__dirname, '../../src/shared/utils'),
      '@types': path.resolve(__dirname, '../../src/shared/types'),
      '@contexts': path.resolve(__dirname, '../../src/shared/contexts'),
      '@shared': path.resolve(__dirname, '../../src/shared'),
      '@ui': path.resolve(__dirname, '../../src/shared/ui'),
      '@routes': path.resolve(__dirname, '../../src/shared/routes'),
      '@hooks': path.resolve(__dirname, '../../src/shared/hooks'),
      '@constants': path.resolve(__dirname, '../../src/shared/constants'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
})
