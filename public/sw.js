// Mbewalink Malawi Harvest Hub - Progressive Offline Service Worker
// Enables intermittent & offline caching for rural Malawian farmers and buyers.

const CACHE_NAME = 'mbewalink-static-v1';
const DATA_CACHE_NAME = 'mbewalink-marketplace-data-v1';

// Static App Shell resources to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx'
];

// Key marketplace API routes to cache for offline availability
const OFFLINE_API_ROUTES = [
  '/api/commodities',
  '/api/categories',
  '/api/market-prices',
  '/api/platform-settings'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Best-effort precache of core app shell
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-critical precache error:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests (POST, PUT, DELETE should not be cached)
  if (request.method !== 'GET') {
    return;
  }

  // Skip WebSocket connections
  if (url.pathname.startsWith('/ws')) {
    return;
  }

  // Handle Key Marketplace Data APIs (Network-First with offline Cache-Fallback)
  const isMarketplaceApi = OFFLINE_API_ROUTES.some((route) => url.pathname.startsWith(route));
  if (isMarketplaceApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and update cache
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed (offline / intermittent) -> Fallback to cached marketplace data
          const cached = await caches.match(request);
          if (cached) {
            return cached;
          }
          // If no cache, return empty array JSON so UI gracefully renders empty state rather than error
          return new Response(JSON.stringify([]), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Mbewalink-Offline': 'true' }
          });
        })
    );
    return;
  }

  // Handle Static Assets & Pages (Stale-While-Revalidate)
  if (request.destination === 'style' || request.destination === 'script' || request.destination === 'font' || request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // General Navigation / Document fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match('/index.html');
        return cached || (await caches.match('/'));
      })
    );
  }
});
