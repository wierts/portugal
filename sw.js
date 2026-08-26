// Portugal Roadtrip — service worker
// Cache-first met achtergrond-update, zodat de site offline werkt op iPhone/iPad
// nadat hij via "Zet op beginscherm" is geïnstalleerd.
//
// Deze service worker beheert ook de OneSignal pushmeldingen (zie onesignal-init.js
// en README-pushmeldingen.md voor de eenmalige setup-stappen).
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_VERSION = 'portugal-roadtrip-v3';

// Alles wat offline beschikbaar moet zijn zodra de app geïnstalleerd is.
// Houd deze lijst gelijk aan de echte bestanden — ontbrekende items worden
// tijdens install overgeslagen (zie hieronder) i.p.v. de hele precache te breken.
const PRECACHE_URLS = [
  './',
  './index.html',
  './actueel.html',
  './reisinfo.html',
  './restaurants.html',
  './hotels.html',
  './route.html',
  './kaart.html',
  './activiteiten.html',
  './checklist.html',
  './voorbereidingen.html',
  './todo.html',
  './confirmations.html',
  './budget.html',
  './bronnen.html',

  // Restaurant-detailpagina's
  './restaurant-adega-sao-nicolau.html',
  './restaurant-alcaide.html',
  './restaurant-cantinho-do-aziz.html',
  './restaurant-cervejaria-trindade.html',
  './restaurant-cozinha-da-clara.html',
  './restaurant-enoteca-1756.html',
  './restaurant-enoteca-de-belem.html',
  './restaurant-incomum.html',
  './restaurant-largo-do-paco.html',
  './restaurant-nova-casa-de-ramiro.html',
  './restaurant-o-casalinho.html',
  './restaurant-o-telheiro.html',
  './restaurant-poco-dos-sabores.html',
  './restaurant-postigo-do-carvao.html',
  './restaurant-quinta-da-lama.html',
  './restaurant-rua-das-flores.html',
  './restaurant-salpoente.html',
  './restaurant-taberna-dos-mercadores.html',
  './restaurant-taberna-memorias.html',
  './restaurant-tagide.html',

  // Assets
  './manifest.json',
  './css/style.css',
  './nav.js',
  './install-prompt.js',
  './onesignal-init.js',
  './weer-forecast.js',
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
  './images/dag07-lisboa.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Bewust géén cache.addAll(): dat is alles-of-niets, dus één 404 zou de
      // hele precache laten mislukken. Nu cachen we elk bestand apart; de per-item
      // .catch() zorgt dat een ontbrekend of tijdelijk onbereikbaar bestand niet
      // ten koste van de rest gaat.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch((err) => {
            console.warn('[sw] precache overgeslagen:', url, err && err.message);
          })
        )
      )
    )
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
        .catch(() =>
          // Offline: eerst de gevraagde pagina zelf, anders terugvallen op de
          // startpagina zodat je nooit op een kale browserfout landt.
          caches.match(event.request).then((cached) => cached || caches.match('./'))
        )
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
