/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// On GitHub Pages the site lives under /<repo>/.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/weathervane/' : '/',
  plugins: [react(), tailwindcss()],
  test: { include: ['tests/**/*.test.ts'] },
})
