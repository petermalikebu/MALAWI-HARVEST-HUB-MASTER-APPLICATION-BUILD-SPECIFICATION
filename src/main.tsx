import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for offline marketplace caching across rural Malawi
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[Mberalink PWA] Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[Mberalink PWA] Service Worker registration skipped or failed:', err);
      });
  });
}
