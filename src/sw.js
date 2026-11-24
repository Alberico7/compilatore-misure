/* Service worker del sito (docs/2026-11-18-offline-liste-avvisi.md): il sito funziona anche senza rete.
   - All'installazione salva i file del sito in una cache con l'impronta della versione (le librerie della
     dettatura le salva al primo uso).
   - Con la rete risponde con la versione nuova (e aggiorna la copia); se la rete non risponde entro
     ATTESA ms, o non c'è, usa la copia salvata.
   - Il modello della dettatura è in un'altra cache ("compilatore-misure-voce"), gestita da voce.js. Qui si
     risponde solo al suo indirizzo fisso, con quella copia, per il worker di Vosk
     (docs/2026-11-24-dettatura-copie-modello.md); se non c'è: "non trovato", senza rete.
   build.js sostituisce i segnaposto di VERSIONE, FILE, MODELLO e CACHE_VOCE (questi due presi da voce.js). */
'use strict';
var VERSIONE = '__VERSIONE__';
var PREFISSO = 'compilatore-sito-';
var CACHE = PREFISSO + VERSIONE;
var FILE = __FILE__;   // { subito: [...], alBisogno: [...] }
var ATTESA = 3000;
var MODELLO = new URL('__MODELLO__', self.registration.scope).href;
var CACHE_VOCE = '__CACHE_VOCE__';

// "subito": si salvano all'installazione. "alBisogno": le librerie della dettatura (5,6 MB), salvate al primo uso del 🎤,
// che richiede comunque la rete per scaricare il modello.
var salvati = FILE.subito.concat(FILE.alBisogno).map(function (f) { return new URL(f, self.registration.scope).href; });

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(FILE.subito.map(function (f) { return new Request(f, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (chiavi) {
    return Promise.all(chiavi.filter(function (k) { return k.indexOf(PREFISSO) === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function dallaCopia(req) {
  return caches.open(CACHE).then(function (c) { return c.match(req, { ignoreSearch: true }); });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var indirizzo = req.url.split('?')[0].split('#')[0];
  if (indirizzo === MODELLO) {
    e.respondWith(caches.open(CACHE_VOCE).then(function (c) { return c.match(MODELLO); }).catch(function () { return null; })
      .then(function (r) { return r || new Response('modello non presente', { status: 404 }); }));
    return;
  }
  var daSalvare = salvati.indexOf(indirizzo) >= 0;   // solo i file del sito (non il firmware)

  e.respondWith(new Promise(function (risposta) {
    var finito = false;
    function rispondi(r) { if (!finito && r) { finito = true; risposta(r); } return !!r; }
    function ripiego() {
      return dallaCopia(req).then(function (r) { return rispondi(r); });
    }
    var timer = setTimeout(ripiego, ATTESA);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res.ok && daSalvare && res.type === 'basic') {
        var copia = res.clone();
        caches.open(CACHE).then(function (c) { return c.put(indirizzo, copia); }).catch(function () {});
      }
      rispondi(res);
    }).catch(function () {
      clearTimeout(timer);
      ripiego().then(function (trovata) { if (!trovata) rispondi(Response.error()); });
    });
  }));
});
