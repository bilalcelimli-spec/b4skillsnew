import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ isSsrBuild }) => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        // One worker owns the root scope. main.tsx registers it without reloading
        // an open assessment; the legacy sync queue remains supported.
        strategies: 'injectManifest',
        srcDir: 'public',
        filename: 'service-worker.js',
        injectRegister: false,
        injectManifest: { injectionPoint: undefined },
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
        // Development service workers make local/E2E runs stateful and can
        // serve stale exam assets. Enable only for an explicit PWA test run.
        devOptions: { enabled: process.env.ENABLE_PWA_DEV === 'true' },
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
            if (id.includes("node_modules/react") || id.includes("node_modules/react-dom") || id.includes("node_modules/@radix-ui") || id.includes("node_modules/recharts")) return "react";
            if (id.includes("node_modules/motion"))          return "motion";
            if (id.includes("node_modules/i18next"))         return "i18n";
            if (id.includes("node_modules/prisma") || id.includes("node_modules/@prisma")) return "prisma";
          },
          // Deterministic filenames for CDN caching
          // SSR build: deterministic filename so server.ts can import it directly
          chunkFileNames:  isSsrBuild ? "[name].js"              : "assets/[name]-[hash].js",
          entryFileNames:  isSsrBuild ? "[name].js"              : "assets/[name]-[hash].js",
          assetFileNames:  isSsrBuild ? "[name][extname]"        : "assets/[name]-[hash][extname]",
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
      watch: {
        ignored: ['**/playwright-report/**', '**/test-results/**', '**/coverage/**'],
      },
      proxy: {
        '/api': 'http://localhost:3001'
      }
    },
  };
});
