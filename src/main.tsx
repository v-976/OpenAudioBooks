import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { registerServiceWorker } from './pwa';
import './styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root is missing from index.html.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Local-first PWA: the service worker only caches the application shell and
// previously visited pages. It never proxies or rewrites third-party audio
// requests, and it reports no usage data anywhere.
registerServiceWorker();
