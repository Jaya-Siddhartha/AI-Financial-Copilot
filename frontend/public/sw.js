// FinCopilot offline support. Pages come from the network when there is one (so updates show up
// straight away) and from the cache when offline. Built files under /assets/ have a content hash in
// their name, so a cached copy is always the right one. Other sites (fonts, the AI model) are left
// alone: WebLLM keeps its own cache of the model.

const CACHE = 'fincopilot-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/icon.svg'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => putInCache('/', response))
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((response) => putInCache(request, response))));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => putInCache(request, response))
      .catch(() => caches.match(request).then((hit) => hit || Response.error()))
  );
});
