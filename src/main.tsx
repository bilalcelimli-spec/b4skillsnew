import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

// Global API Fetch Interceptor
const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  if (typeof input === 'string' && input.startsWith('/api/')) {
    let userEmail = 'bilalcelimli@gmail.com';
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userEmail = payload.email || userEmail;
      } catch (e) {
        // ignore invalid token parsing
      }
    }
    
    init = init || {};
    init.headers = {
      ...init.headers,
      'x-user-email': userEmail,
      ...(token && { 'Authorization': `Bearer ${token}` })
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
