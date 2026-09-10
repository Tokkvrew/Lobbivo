// ============================================================
//  LOBBIVO SERVICE WORKER (ULTRA-RESILIENT MOBILE & PWA CACHE)
// ============================================================

const CACHE_NAME = 'lobbivo-cache-v2.9.6';
const OFFLINE_URL = './index.html';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css?v=2.9.3',
  './css/base.css?v=2.9.3',
  './css/components.css?v=2.9.3',
  './css/animations.css?v=2.9.3',
  './css/media.css?v=2.9.3',
  './js/data.js?v=2.9.3',
  './js/security-shield.js?v=2.9.3',
  './js/firebase-sync.js?v=2.9.3',
  './js/storage.js?v=2.9.3',
  './js/retention.js?v=2.9.3',
  './js/auth.js?v=2.9.3',
  './js/games.js?v=2.9.3',
  './js/chat.js?v=2.9.3',
  './js/profile.js?v=2.9.3',
  './js/admin.js?v=2.9.3',
  './js/app.js?v=2.9.3',
  './assets/icons/sprite.svg',
  './assets/images/games/roblox.jpg'
];

// Установка: Мгновенный предзагруз всех критических файлов в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CORE_ASSETS).catch((err) => {
        console.warn('[SW Precache Warning] Some non-critical assets skipped:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Активация: Очистка старых версий кэша
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Обработка запросов (Stale-While-Revalidate для ассетов, Network-First с таймаутом для HTML)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Игнорируем внешние запросы к Firebase и Google APIs
  if (
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('firestore') ||
    url.origin.includes('gstatic.com') ||
    url.origin.includes('google-analytics.com')
  ) {
    return;
  }

  // 1. Страницы навигации (HTML) — Network-First с быстрым таймаутом 1.8s
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      new Promise((resolve) => {
        let hasResolved = false;

        const networkTimeout = setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            caches.match(OFFLINE_URL).then((cached) => {
              if (cached) resolve(cached);
            });
          }
        }, 1800);

        fetch(request)
          .then((networkResponse) => {
            clearTimeout(networkTimeout);
            if (!hasResolved) {
              hasResolved = true;
              if (networkResponse && networkResponse.status === 200) {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              }
              resolve(networkResponse);
            }
          })
          .catch(() => {
            clearTimeout(networkTimeout);
            if (!hasResolved) {
              hasResolved = true;
              caches.match(OFFLINE_URL).then((cached) => {
                resolve(cached || new Response('Offline', { status: 503, statusText: 'Offline' }));
              });
            }
          });
      })
    );
    return;
  }

  // 2. Статические файлы (CSS, JS, Картинки, SVG, Шрифты) — Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => null);

      // Если файл уже есть в кэше — отдаем его мгновенно (0мс), а в фоне обновляем
      if (cachedResponse) {
        return cachedResponse;
      }

      // Если в кэше нет — ждем сеть
      return fetchPromise.then((networkRes) => {
        return networkRes || caches.match(OFFLINE_URL);
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
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (sender) {
            client.postMessage({ type: 'OPEN_DIRECT_CHAT', sender: sender });
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
