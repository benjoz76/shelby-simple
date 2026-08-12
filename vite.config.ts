import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({
  base: '/',

  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
  ],

  optimizeDeps: {
    exclude: ['@shelby-protocol/clay-codes'],
    esbuildOptions: {
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true
        })
      ]
    }
  },

  define: {
    global: 'globalThis',
  },

  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },

  server: {
    port: 3000,
    // 🔥 FIX: COEP/COOP headers untuk development (wajib untuk WASM)
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },

  preview: {
    port: 4173,
    // 🔥 FIX: COEP/COOP headers untuk preview build
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})