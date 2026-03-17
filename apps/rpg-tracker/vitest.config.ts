import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // Mock Next.js server-only modules that are unavailable in jsdom
      'next/headers': path.resolve(__dirname, './__mocks__/next/headers.ts'),
      'next/navigation': path.resolve(__dirname, './__mocks__/next/navigation.ts'),
      'next/server': path.resolve(__dirname, './__mocks__/next/server.ts'),
    },
  },
})
