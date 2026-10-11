import { defineConfig } from 'vite'
import { resolve } from 'node:path'
// Two pages: the latest game (index.html) and the frozen Trijam 393 build (jam/index.html).
export default defineConfig({
  build: { outDir: 'dist', rollupOptions: { input: { main: resolve(__dirname, 'index.html'), jam: resolve(__dirname, 'jam/index.html') } } },
})
