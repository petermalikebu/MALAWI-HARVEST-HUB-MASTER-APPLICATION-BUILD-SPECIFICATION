import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for offline marketplace caching across rural Malawi
const isNotTest = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.MODE !== 'test' : true;
if ('serviceWorker' in navigator && isNotTest) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[Mbewalink PWA] Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('[Mbewalink PWA] Service Worker registration skipped or failed:', err);
      });
  });
}
