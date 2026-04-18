import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // Configure maximum file size limit for caching (now 5MB)
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.linguadapt\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                backgroundSync: {
                  name: 'sync-queue',
                  options: { maxRetentionTime: 24 * 60 }
                }
              }
            }
          ]
        }
      })
    ],
    // NOTE: GEMINI_API_KEY must NEVER be exposed to the client bundle.
    // Gemini calls must only happen server-side (see src/lib/scoring/*, src/lib/language-skills/ai-item-generator.ts).
    // If a client module needs a type from a file that also initializes GoogleGenAI at module scope,
    // use `import type { ... }` so tree-shaking keeps the runtime init out of the client bundle.
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': 'http://localhost:3001'
      }
    },
  };
});
