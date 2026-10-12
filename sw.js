// Höj VERSION (v1-test -> v2-test osv.) varje gång du laddar upp nya
// filer, så hämtas och cachas den nya versionen säkert.
const VERSION = 'v17-test';
const CACHE = 'brobyggare-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './figur_data.js',
  './material.js',
  './fysik.js',
  './banor.js',
  './spel.js',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installera: cacha allt (förbi webbläsarens HTTP-cache) och ta över direkt.
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        return c.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// Aktivera: radera gamla cache-versioner och ta kontroll över sidan.
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

// Hämta: nätet först (spelet ändras ofta just nu), cachen om man är offline.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        }
        return res;
      })
      .catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
      })
  );
});
