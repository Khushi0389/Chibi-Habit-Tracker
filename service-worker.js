const CACHE = 'chibi-cache-v1';
const ASSETS = [
  './','./index.html','./style.css','./script.js','./manifest.json',
  'assets/default/chibi-0.jpeg','assets/default/chibi-1.jpeg','assets/default/chibi-2.jpeg',
  'assets/default/chibi-3.jpeg','assets/default/chibi-4.jpeg','assets/default/chibi-5.jpeg',
  'assets/pastel/chibi-0.jpeg','assets/pastel/chibi-1.jpeg','assets/pastel/chibi-2.jpeg',
  'assets/pastel/chibi-3.jpeg','assets/pastel/chibi-4.jpeg','assets/pastel/chibi-5.jpeg',
  'assets/neon/chibi-0.jpeg','assets/neon/chibi-1.jpeg','assets/neon/chibi-2.jpeg',
  'assets/neon/chibi-3.jpeg','assets/neon/chibi-4.jpeg','assets/neon/chibi-5.jpeg'
];

self.addEventListener('install', evt =>
  evt.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))
);

self.addEventListener('fetch', evt =>
  evt.respondWith(caches.match(evt.request).then(r=>r||fetch(evt.request)))
);

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});
