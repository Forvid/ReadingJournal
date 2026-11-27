const scope = self.registration.scope;
const cachePrefix = 'reading-journal:' + scope + ':';
const cacheName = cachePrefix + VERSION;
const shellUrls = new Set(SHELL_FILES.map((path) => new URL(path, scope).href));
const indexUrl = new URL('index.html', scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll([...shellUrls])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(cachePrefix) && name !== cacheName)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(scope)) return;

  if (request.mode === 'navigate') {
    const url = new URL(request.url);
    if (url.pathname !== new URL(scope).pathname && url.pathname !== new URL(indexUrl).pathname) return;
    event.respondWith(caches.open(cacheName)
      .then((cache) => cache.match(indexUrl))
      .then((cached) => cached ?? fetch(request)));
    return;
  }

  if (shellUrls.has(request.url)) {
    event.respondWith(caches.open(cacheName)
      .then((cache) => cache.match(request))
      .then((cached) => cached ?? fetch(request)));
  }
});
