// Firebase Cloud Messaging Service Worker for Mberalink Malawi Harvest Hub
// Handles background push notifications when user is outside active tab.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: 'chromatic-flame-t83d0',
  appId: '1:1098287344957:web:544ebecfe9a240ed0d2954',
  apiKey: 'AIzaSyAfCVQNKUo8lHzG-OTySgPuDPqplOdGpqI',
  authDomain: 'chromatic-flame-t83d0.firebaseapp.com',
  messagingSenderId: '1098287344957'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background push received:', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Mberalink Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'New agricultural update available.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
