// ============================================================
//  LOBBIVO SERVICE WORKER (BACKGROUND WEB PUSH & NOTIFICATIONS)
// ============================================================

const CACHE_NAME = 'lobbivo-cache-v2.8.6';
const OFFLINE_URL = './index.html';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Автоматическое обновление: Network-First для всех локальных файлов (HTML, JS, CSS, Media)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Игнорируем внешние запросы к Firebase и Google APIs
  if (
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firestore') ||
    url.origin.includes('gstatic.com')
  ) {
    return;
  }

  // Network-First: запрашиваем сеть для получения свежих файлов с GitHub Pages, при успехе обновляем кэш, при отсутствии сети — отдаем из кэша
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
      })
  );
});

// Слушатель системных Push-уведомлений
self.addEventListener('push', (event) => {
  let payload = {
    title: 'LOBBIVO · Новое сообщение',
    body: 'Вам пришло новое сообщение от тиммейта в чате!',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" stop-color="%2300d4ff"/%3E%3Cstop offset="50%25" stop-color="%23b44dff"/%3E%3Cstop offset="100%25" stop-color="%23ff44cc"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="100" height="100" rx="24" fill="url(%23g)"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="24" fill="%2300d4ff"/%3E%3Ctext x="50" y="70" font-family="sans-serif" font-weight="900" font-size="60" fill="%23ffffff" text-anchor="middle"%3EL%3C/text%3E%3C/svg%3E',
    tag: 'lobbivo-direct-msg',
    data: { url: './index.html' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      payload = { ...payload, ...data };
    } catch (e) {
      payload.body = event.data.text() || payload.body;
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    tag: payload.tag || 'lobbivo-notification',
    renotify: true,
    silent: false,
    vibrate: [250, 100, 250, 100, 250],
    data: payload.data || { url: './index.html' },
    actions: [
      { action: 'open', title: 'Открыть чат' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Слушатель клика по Push-уведомлению (открывает чат на телефоне или ПК)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const sender = notifData.sender;
  const targetUrl = notifData.url || './index.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если уже есть открытая вкладка — фокусируемся на ней и открываем нужный чат
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (sender) {
            client.postMessage({ type: 'OPEN_DIRECT_CHAT', sender: sender });
          }
          return client.focus();
        }
      }
      // Если вкладка была закрыта — открываем сайт с параметром чата
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
