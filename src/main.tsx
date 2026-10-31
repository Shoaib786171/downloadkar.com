// Defend against browser extension injection errors (e.g. Ant Video Downloader frame_ant.js)
// where extensions attempt to overwrite window.fetch in environments where it only has a getter.
try {
  let activeFetch = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : undefined;
  if (typeof window !== 'undefined' && activeFetch) {
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return activeFetch;
      },
      set(fn) {
        activeFetch = fn;
      },
    });

    window.addEventListener(
      'error',
      (event) => {
        if (
          event.filename?.includes('chrome-extension://') ||
          event.message?.includes('Cannot set property fetch')
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }
} catch {
  // Ignore fallback
}

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </ThemeProvider>
);
