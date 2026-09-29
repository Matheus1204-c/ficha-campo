// Service Worker — Ficha de Campo, Verticalização da Orla de Fortaleza
// Guarda em cache o "esqueleto" do app (página + bibliotecas) para abrir
// mesmo sem internet depois da primeira visita bem-sucedida.
// Ladrilhos de mapa (OpenStreetMap) também ficam em cache conforme são
// visitados, permitindo reabrir áreas já visualizadas mesmo offline.

var CACHE_NAME = "ficha-campo-v1";

var PRECACHE_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(PRECACHE_URLS).catch(function(){
        // se algum CDN falhar no momento da instalação, não impede o resto
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET") return;

  var url = new URL(req.url);

  // ladrilhos do mapa: usa cache se existir, atualiza em segundo plano
  if(url.hostname.indexOf("tile.openstreetmap.org") > -1){
    event.respondWith(
      caches.open(CACHE_NAME).then(function(cache){
        return cache.match(req).then(function(cached){
          var networkFetch = fetch(req).then(function(resp){
            cache.put(req, resp.clone());
            return resp;
          }).catch(function(){ return cached; });
          return cached || networkFetch;
        });
      })
    );
    return;
  }

  // página do app, manifesto, bibliotecas: cache primeiro, rede como respaldo
  event.respondWith(
    caches.match(req).then(function(cached){
      var networkFetch = fetch(req).then(function(resp){
        if(resp && (resp.status === 200 || resp.type === "opaque")){
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resp.clone()); });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
