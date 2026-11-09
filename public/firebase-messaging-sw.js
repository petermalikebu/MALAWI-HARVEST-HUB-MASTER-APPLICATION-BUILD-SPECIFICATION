// Firebase Cloud Messaging Service Worker for Mberalink Malawi Harvest Hub
// Handles background push notifications when user is outside the active browser tab.
// Configured for project: malawi-harvest-hub

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

try {
  const swUrl = new URL(self.location.href);
  const projectId = swUrl.searchParams.get('projectId') || 'malawi-harvest-hub';
  const messagingSenderId = swUrl.searchParams.get('senderId') || '';
  const appId = swUrl.searchParams.get('appId') || '';
  const apiKey = swUrl.searchParams.get('apiKey') || '';

  const config = {
    projectId: projectId,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: `${projectId}.firebasestorage.app`,
  };

  if (messagingSenderId) config.messagingSenderId = messagingSenderId;
  if (appId) config.appId = appId;
  if (apiKey) config.apiKey = apiKey;

  firebase.initializeApp(config);

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background push received:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Mberalink Notification';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New agricultural update available.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: payload.data?.notificationId || 'mberalink-alert',
      data: payload.data || {},
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (initErr) {
  console.warn('[firebase-messaging-sw.js] Compat init fallback:', initErr);
}

// Fallback listener for standard Web Push events
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.notification?.title || data.title || 'Mberalink Agricultural Alert';
      const options = {
        body: data.notification?.body || data.body || 'New notification received.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        data: data.data || {},
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch {
      // Handled by compat messaging
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
