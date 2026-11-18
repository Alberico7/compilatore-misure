/* Service worker del sito (docs/2026-11-18-offline-liste-avvisi.md): il sito funziona anche senza rete.
   - All'installazione salva i file del sito in una cache con l'impronta della versione (le librerie della
     dettatura le salva al primo uso).
   - Con la rete risponde con la versione nuova (e aggiorna la copia); se la rete non risponde entro
     ATTESA ms, o non c'è, usa la copia salvata.
   - Non tocca il modello della dettatura: è in un'altra cache ("compilatore-misure-voce"), gestita da voce.js,
     e arriva da un altro sito (Hugging Face), che qui non si intercetta.
   build.js sostituisce i segnaposto di VERSIONE e FILE. */
'use strict';
var VERSIONE = '__VERSIONE__';
var PREFISSO = 'compilatore-sito-';
var CACHE = PREFISSO + VERSIONE;
var FILE = __FILE__;   // { subito: [...], alBisogno: [...] }
var ATTESA = 3000;

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
