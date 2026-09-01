// ── CESC HUB SERVICE WORKER ──
// No terminal needed - just copy this file!

const CACHE_NAME = 'cesc-hub-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/login.html',
  '/chat.html',
  '/profiles.html',
  '/settings.html',
  '/notifications.html',
  '/download.html',
  '/shared.js',
  '/shared.css',
  '/js/theme-presets.js',
  '/js/theme-engine.js',
  '/css/pages/index.css',
  '/css/pages/chat.css',
  '/css/pages/profiles.css',
  '/css/pages/settings.css',
  '/css/pages/notifications.css',
  '/css/pages/login.css',
  '/css/pages/download.css',
  '/manifest.json'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching assets...');
        return cache.addAll(STATIC_ASSETS);
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
  
  // Skip Supabase and CDN
  if (url.hostname.includes('supabase.co') || 
      url.hostname.includes('cdnjs.cloudflare.com') ||
      url.hostname.includes('fonts.googleapis.com') ||
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
              .then(cache => cache.put(event.request, clone));
            
            return networkResponse;
          })
          .catch(() => {
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ── CHECK FOR UPDATES (Every hour) ──
self.addEventListener('message', event => {
  if (event.data === 'checkUpdate') {
    self.skipWaiting();
  }
});

// ── VERSION INFO ──
const APP_VERSION = '1.0.0';
const UPDATE_DATE = new Date().toISOString();

console.log(`✅ CESC Hub v${APP_VERSION} - ${UPDATE_DATE}`);