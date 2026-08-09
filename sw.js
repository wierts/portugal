// Portugal Roadtrip — service worker
// Cache-first met achtergrond-update, zodat de site offline werkt op iPhone/iPad
// nadat hij via "Zet op beginscherm" is geïnstalleerd.
//
// Deze service worker beheert ook de OneSignal pushmeldingen (zie onesignal-init.js
// en README-pushmeldingen.md voor de eenmalige setup-stappen).
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'portugal-roadtrip-v2';

const PRECACHE_URLS = [
  './',
  './index.html',
  './hotels.html',
  './restaurants.html',
  './route.html',
  './appendix.html',
  './confirmations.html',
  './budget.html',
  './bronnen.html',
  './actueel.html',
  './manifest.json',
  './css/style.css',
  './nav.js',
  './install-prompt.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './images/hero.jpg',
  './images/dag01-porto.jpg',
  './images/dag02-douro.jpg',
  './images/dag03-aveiro.jpg',
  './images/dag04-nazare.jpg',
  './images/dag05-obidos.jpg',
  './images/dag06-sintra.jpg',
  './images/dag07-lisboa.jpg',
  './images/porto.jpg',
  './images/douro.jpg',
  './images/aveiro.jpg',
  './images/nazare.jpg',
  './images/obidos.jpg',
  './images/sintra.jpg',
  './images/lisbon.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Alleen same-origin requests cachen (niet Google Maps/YouTube/GitHub API/externe links)
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHTMLPage = event.request.mode === 'navigate'
    || (event.request.headers.get('accept') || '').includes('text/html');

  if (isHTMLPage) {
    // Pagina's: network-first. Zo krijg je bij elk bezoek altijd de laatste versie
    // zolang er internet is — de cache is puur een offline-vangnet.
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Overige assets (CSS/JS/afbeeldingen): cache-first met achtergrond-update.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
