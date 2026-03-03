// ─── SERVICE WORKER — LeGrandGeoQuiz ─────────────────────────────────────────
// Stratégie : Cache First pour les assets statiques, Network First pour l'API Daily.
// iOS Safari (standalone) nécessite un SW pour fonctionner offline.

var CACHE_NAME = 'geoquiz-v2';

// Assets à précacher au moment de l'installation
var PRECACHE_URLS = [
  '/legrandgeoquiz/',
  '/legrandgeoquiz/index.html',
  '/legrandgeoquiz/manifest.json',
  '/legrandgeoquiz/favicon.svg',
  '/legrandgeoquiz/country.json',
  '/legrandgeoquiz/css/styles.css',
  '/legrandgeoquiz/js/game.js',
  '/legrandgeoquiz/js/game-end.js',
  '/legrandgeoquiz/js/daily.js',
  '/legrandgeoquiz/js/data.js',
  '/legrandgeoquiz/js/hints.js',
  '/legrandgeoquiz/js/mobile.js',
  '/legrandgeoquiz/js/ribbon.js',
  '/legrandgeoquiz/js/seed.js',
  '/legrandgeoquiz/js/setup.js',
  '/legrandgeoquiz/js/translations.js',
  '/legrandgeoquiz/js/ui-effects.js',
  '/legrandgeoquiz/js/utils.js',
  '/legrandgeoquiz/js/zoom-prevention.js'
];

// ── Install : précacher tous les assets du jeu ────────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      // Activer immédiatement sans attendre la fermeture des onglets
      return self.skipWaiting();
    })
  );
});

// ── Activate : supprimer les anciens caches ───────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      // Prendre le contrôle de tous les clients immédiatement
      return self.clients.claim();
    })
  );
});

// ── Fetch : stratégie hybride ─────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Network First pour les appels API Daily (toujours tenter le réseau)
  if (url.indexOf('/api/') !== -1) {
    event.respondWith(
      fetch(event.request).catch(function() {
        // Offline : retourner une réponse d'erreur JSON propre
        return new Response(
          JSON.stringify({ error: 'offline', played: false }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Cache First pour tous les assets du jeu
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;

      // Pas en cache : tenter le réseau puis mettre en cache
      return fetch(event.request).then(function(response) {
        // Ne cacher que les réponses valides
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        var toCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, toCache);
        });
        return response;
      }).catch(function() {
        // Fallback ultime offline : index.html pour les navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/legrandgeoquiz/index.html');
        }
      });
    })
  );
});