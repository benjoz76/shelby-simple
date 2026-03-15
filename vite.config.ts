import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    exclude: [
      '@shelby-protocol/sdk',
      '@wallet-standard/core',
      '@telegram-apps/bridge'
    ],
  },
  build: {
    rollupOptions: {
      external: [
        '@wallet-standard/core',
        '@telegram-apps/bridge'
      ],
    },
  },
})