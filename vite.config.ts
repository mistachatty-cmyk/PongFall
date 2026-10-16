import { defineConfig } from 'vite'
import { resolve } from 'node:path'
// Two pages: the latest game (index.html) and the frozen Trijam 393 build (jam/index.html).
export default defineConfig({
  build: { outDir: 'dist', rollupOptions: { input: { main: resolve(__dirname, 'index.html'), jam: resolve(__dirname, 'jam/index.html'), 'l10n-page': resolve(__dirname, 'src/l10nPage.ts') }, output: { entryFileNames: chunk => chunk.name === 'l10n-page' ? 'l10n-page.js' : 'assets/[name]-[hash].js' } } },
})
