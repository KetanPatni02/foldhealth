/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { devApiPlugin } from './vite-plugin-dev-api.js';

// https://vite.dev/config/
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [tailwindcss(), react(), devApiPlugin()],
  server: {
    // Honor the harness-assigned PORT so the preview browser and the actual
    // dev server always agree — without this, Vite's default 5173 collides
    // with other sessions and silently auto-increments to a port the
    // harness never learns about.
    port: Number(process.env.PORT) || 5173,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // No manualChunks. Earlier attempts to group recharts into a
    // 'vendor-charts' chunk caused Rolldown's CJS interop to hoist React's
    // require_* wrappers into that chunk, which then dragged vendor-charts
    // into the entry's static import graph — defeating lazy-loading and
    // forcing recharts onto the first-paint critical path.
    //
    // Auto-chunking respects the lazy() boundaries in AppLayout: recharts
    // lands in its own chunk that only loads when an analytics view mounts.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    projects: [{
      extends: true,
      test: {
        name: 'unit',
        environment: 'node',
        include: ['src/**/*.test.{js,jsx}'],
      },
    }, {
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});