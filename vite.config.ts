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
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        devOptions: { enabled: true },
        manifest: {
          name: 'LinguAdapt — Adaptive English Assessment',
          short_name: 'LinguAdapt',
          description: 'CEFR-aligned adaptive English proficiency testing — take your exam anywhere.',
          theme_color: '#1a56db',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'any',
          scope: '/',
          start_url: '/?source=pwa',
          categories: ['education', 'productivity'],
          icons: [
            { src: '/icons/pwa-64.png',   sizes: '64x64',   type: 'image/png' },
            { src: '/icons/pwa-192.png',  sizes: '192x192', type: 'image/png' },
            { src: '/icons/pwa-512.png',  sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/pwa-512.png',  sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'Start Assessment',
              short_name: 'Assess',
              description: 'Launch a new English proficiency test',
              url: '/assessment?source=shortcut',
              icons: [{ src: '/icons/pwa-96.png', sizes: '96x96' }],
            },
          ],
          screenshots: [
            { src: '/screenshots/mobile-assessment.png', sizes: '390x844', type: 'image/png', form_factor: 'narrow' },
            { src: '/screenshots/desktop-dashboard.png', sizes: '1280x800', type: 'image/png', form_factor: 'wide' },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5_000_000,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            // API reads: network-first, 30s stale-while-revalidate
            {
              urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/auth'),
              handler: 'NetworkFirst' as const,
              options: {
                cacheName: 'api-reads',
                networkTimeoutSeconds: 10,
                expiration: { maxEntries: 100, maxAgeSeconds: 300 },
                backgroundSync: {
                  name: 'api-sync-queue',
                  options: { maxRetentionTime: 24 * 60 },
                },
              },
            },
            // Static assets: cache-first (Vite hashes filenames)
            {
              urlPattern: /\/assets\/.+\.(js|css|woff2?|ttf)$/,
              handler: 'CacheFirst' as const,
              options: {
                cacheName: 'static-assets',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            // Audio & images: stale-while-revalidate
            {
              urlPattern: /\.(mp3|ogg|webm|wav|png|jpg|webp|svg)$/,
              handler: 'StaleWhileRevalidate' as const,
              options: {
                cacheName: 'media-assets',
                expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
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
    build: {
      // Lighthouse 95+: aggressive code-splitting + asset optimisation
      target:          "es2020",
      cssCodeSplit:    true,
      sourcemap:       false,
      reportCompressedSize: true,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          // Manual chunk splitting — keeps vendor code separate for long-term caching
          manualChunks(id: string) {
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/recharts")) return "react";
            if (id.includes("node_modules/@radix-ui"))      return "radix";
            if (id.includes("node_modules/motion"))          return "motion";
            if (id.includes("node_modules/i18next"))         return "i18n";
            if (id.includes("node_modules/prisma") || id.includes("node_modules/@prisma")) return "prisma";
          },
          // Deterministic filenames for CDN caching
          chunkFileNames:  "assets/[name]-[hash].js",
          entryFileNames:  "assets/[name]-[hash].js",
          assetFileNames:  "assets/[name]-[hash][extname]",
        },
      },
    },
    optimizeDeps: {
      include: ['recharts'],
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
