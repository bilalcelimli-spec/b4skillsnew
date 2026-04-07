import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { auth } from './lib/firebase';

// Global API Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    const userEmail = auth.currentUser?.email || 'bilalcelimli@gmail.com';
    init = init || {};
    init.headers = {
      ...init.headers,
      'x-user-email': userEmail
    };
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
