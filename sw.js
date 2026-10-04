// ── CESC HUB SERVICE WORKER ──
// No terminal needed - just copy this file!

const CACHE_NAME = 'cesc-hub-v3.5'; // Bumped for the chat + notes + offline release
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/chat.html',
  '/profiles.html',
  '/settings.html',
  '/notifications.html',
  '/download.html',
  '/offline.html',
  '/shared.js',
  '/shared.css',
  '/badwords.json',
  'version.json',
  '/js/chat.js',
  '/js/ads.js',
  '/js/theme-presets.js',
  '/js/theme-engine.js',
  '/css/pages/index.css',
  '/css/pages/chat.css',
  '/css/pages/profiles.css',
  '/css/pages/settings.css',
  '/css/pages/notifications.css',
  '/css/pages/login.css',
  '/css/pages/download.css',
  '/css/ads.css',
  '/manifest.json',
  '/icons/icon-512x512.png',
  '/icons/icon-192x192.png'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets...');
        // Use allSettled so a single missing asset doesn't kill the whole cache
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Failed to cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
  );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip Supabase and CDN
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('uploads.onecompiler.io')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response;

        return fetch(event.request)
          .then(networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const clone = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, clone))
              .catch(() => {});

            return networkResponse;
          })
          .catch(() => {
            // For navigation requests, fall back to offline page
            const accept = event.request.headers.get('accept') || '';
            if (event.request.mode === 'navigate' || accept.includes('text/html')) {
              return caches.match('/offline.html').then(cached => {
                return cached || caches.match('/index.html');
              });
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ── CHECK FOR UPDATES ──
self.addEventListener('message', event => {
  if (event.data === 'checkUpdate') {
    self.skipWaiting();
  }
});

// ── VERSION INFO ──
const APP_VERSION = '3.5.0';
const UPDATE_DATE = new Date().toISOString();

console.log(`✅ CESC Hub v${APP_VERSION} - ${UPDATE_DATE}`);