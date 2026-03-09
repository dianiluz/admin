const CACHE_NAME = 'cupissa-admin-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/variables.css',
  '/css/panel.css',
  '/js/config.js',
  '/js/panel-admin.js',
  '/assets/logo.png',
  '/assets/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});