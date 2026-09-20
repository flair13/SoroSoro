// SoroSoro -- service worker
// Precaches the app shell so it installs and keeps working offline after the
// first successful load. Bump CACHE_NAME whenever the shell files change so
// old caches are cleaned up and users pick up the update.
var CACHE_NAME = "keika-dot-shell-v16";
var RUNTIME_CACHE = "keika-dot-runtime-v1";

var SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(SHELL_FILES); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys
          .filter(function(k){ return k !== CACHE_NAME && k !== RUNTIME_CACHE; })
          .map(function(k){ return caches.delete(k); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;

  if(sameOrigin){
    // App shell: cache-first, refresh the cache in the background (stale-while-revalidate).
    event.respondWith(
      caches.match(req).then(function(cached){
        var networkFetch = fetch(req).then(function(res){
          if(res && res.ok){
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
          }
          return res;
        }).catch(function(){ return cached; });
        return cached || networkFetch;
      })
    );
  } else {
    // Cross-origin (Google Fonts, the SQLite-import helper library, etc.):
    // try the network first for freshness, fall back to a runtime cache when offline.
    event.respondWith(
      fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(RUNTIME_CACHE).then(function(cache){ cache.put(req, copy); });
        }
        return res;
      }).catch(function(){ return caches.match(req); })
    );
  }
});
