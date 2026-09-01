import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
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

// Global API Fetch Interceptor — adds credentials and handles 401 globally
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    init = init || {};
    init.credentials = 'include';
  }
  const response = await originalFetch(input, init);
  // On 401 outside of auth endpoints, try a token refresh then reload.
  // Prevents silent failures when the access token expires mid-session.
  if (
    response.status === 401 &&
    typeof input === 'string' &&
    !input.includes('/api/auth/')
  ) {
    try {
      const refreshRes = await originalFetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        // Retry the original request once with the new token cookie
        return originalFetch(input, init);
      }
    } catch {
      // Refresh failed — fall through to redirect
    }
    // Redirect to login if refresh also fails
    window.location.href = '/';
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);

// PWA Service Worker registration
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service worker registered, scope:', reg.scope);
        // Check for updates every 60 minutes
        setInterval(() => reg.update(), 60 * 60 * 1000);
      })
      .catch((err) => console.warn('[PWA] Service worker registration failed:', err));
  });
}
