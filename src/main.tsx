import { createAuthenticatedFetch } from "./lib/http/api-fetch";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './design-system/components';
import { AppToastProvider } from './hooks/useToast';
import './index.css';

// Initialize Sentry for frontend error tracking.
// Set VITE_SENTRY_DSN in .env to enable; no-op when unset.
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
  });
}

// Refresh once for concurrent requests so rotating cookies do not invalidate
// each other. An unrelated external 401 must not log the user out.
window.fetch = createAuthenticatedFetch(window.fetch.bind(window), () => {
  window.location.href = '/login';
});

const rootEl = document.getElementById('root')!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AppToastProvider>
            <App />
          </AppToastProvider>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);

createRoot(rootEl).render(app);

// PWA Service Worker registration
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/', updateViaCache: 'none' })
      .then((reg) => {
        console.log('[PWA] Service worker registered, scope:', reg.scope);
        // Check for updates every 60 minutes
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
  });
}
