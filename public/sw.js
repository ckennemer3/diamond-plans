// ============================================================
// Diamond Plans — Service Worker
// Cache name: bump this string to invalidate old caches
// ============================================================

const CACHE_NAME = 'diamond-plans-v1';

// Static assets worth caching on install.
// Next.js hashes JS/CSS filenames, so we cannot hard-code them here.
// Instead we cache them on first fetch via the fetch handler below.
const PRECACHE_URLS = [
  '/',
  '/dashboard',
];

// ── Install: pre-cache known shell URLs ─────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for static assets, network-first for everything else ──

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Never cache API routes or Supabase calls — localStorage handles offline data
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/') ||
    url.hostname.includes('supabase')
  ) {
    return;
  }

  // Cache-first strategy for Next.js static assets (hashed filenames)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(js|css|woff2?|png|svg|ico)$/);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        });
      })
    );
    return;
  }

  // Network-first with cache fallback for HTML navigation requests
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
