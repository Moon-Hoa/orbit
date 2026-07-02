/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves project sites from /<repo-name>/, so the build needs
  // that prefix; local dev keeps serving from the root.
  base: command === 'build' ? '/orbit/' : '/',
  plugins: [react(), tailwindcss()],
  // satellite.js's package entry pulls in an (unused, by us) WASM/worker
  // submodule that contains top-level await; the default 'iife' worker
  // format doesn't support that, so switch to 'es' module workers.
  worker: { format: 'es' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
}))
