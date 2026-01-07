import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Some transitive Mermaid bundles (via Excalidraw) import `d3-sankey` from nested node_modules.
    // Make sure Rollup can always resolve it from the app root.
    alias: {
      'd3-sankey': fileURLToPath(new URL('./node_modules/d3-sankey/src/index.js', import.meta.url)),
    },
  },
})
