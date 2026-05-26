import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global API Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    init = init || {};
    init.credentials = 'include';
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
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
