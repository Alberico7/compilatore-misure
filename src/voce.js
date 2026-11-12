/* Motore vocale: Vosk (vosk-browser 0.0.8) con il modello italiano small-it-0.22.
   Come nel progetto "stampa etichette webusb" (src/voice/): modello dalla copia su Hugging Face con
   impronta controllata, zip convertito in tar.gz nel browser e conservato in Cache Storage,
   audio mono a 16 kHz. Le librerie (voce/vosk.js, voce/fflate.js) si caricano solo al primo uso.
   Funziona solo dal sito (https): da file locale il worker di Vosk non legge il modello.
   Vedi docs/2026-11-12-dettatura-vosk.md. */
var Voce = (function () {
  'use strict';

  var MODELLO_ZIP = 'https://huggingface.co/ambind/vosk-model-small-it-0.22/resolve/a1e27778d4c7f7da6162c6d84685921462a59f7f/vosk-model-small-it-0.22.zip';
  var MODELLO_SHA256 = '9ec65e75861d1c6c2e457cccd932705340dcdf233f5b239f00733b4de0bf3267';
  var MODELLO_BYTE = 49665141;
  var CACHE = 'compilatore-misure-voce';
  var CHIAVE_MODELLO = 'vosk-model-small-it-0.22.tar.gz';
  var FREQ = 16000;

  function disponibile() {
    return location.protocol !== 'file:' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof WebAssembly === 'object' && typeof Worker === 'function';
  }

  function chiaveModello() { return new URL(CHIAVE_MODELLO, location.href).href; }

  function apriCache() {
    try { return caches.open(CACHE).catch(function () { return null; }); } catch (e) { return Promise.resolve(null); }
  }

  function modelloScaricato() {
    return apriCache().then(function (c) { return c ? c.match(chiaveModello()) : null; })
      .then(function (r) { return !!r; }).catch(function () { return false; });
  }

  var caricamentoScript = {};
  function caricaScript(src) {
    if (!caricamentoScript[src]) {
      caricamentoScript[src] = new Promise(function (ok, ko) {
        var s = document.createElement('script');
        s.src = src; s.async = true;
        s.onload = ok;
        s.onerror = function () { delete caricamentoScript[src]; ko(new Error('Impossibile caricare ' + src)); };
        document.head.appendChild(s);
      });
    }
    return caricamentoScript[src];
  }

  /* ---------- tar minimo (ustar), come src/voice/tar.ts delle etichette ---------- */
  function creaTar(files) {
    var enc = new TextEncoder(), B = 512, cartelle = {}, voci = [];
    Object.keys(files).forEach(function (nome) {
      var parti = nome.split('/');
      for (var i = 1; i < parti.length; i++) cartelle[parti.slice(0, i).join('/') + '/'] = true;
      if (nome.slice(-1) !== '/') voci.push({ nome: nome, dati: files[nome] });
    });
    Object.keys(cartelle).forEach(function (c) { voci.push({ nome: c, dati: new Uint8Array(0) }); });
    voci.sort(function (a, b) { return a.nome.localeCompare(b.nome); });
    var dim = voci.reduce(function (n, v) { return n + B + (v.nome.slice(-1) === '/' ? 0 : Math.ceil(v.dati.length / B) * B); }, 2 * B);
    var out = new Uint8Array(dim), at = 0;
    function scrivi(h, o, l, s) { var b = enc.encode(s); if (b.length > l) throw new Error('Campo tar troppo lungo: ' + s); h.set(b, o); }
    function ottale(h, o, l, n) { scrivi(h, o, l, n.toString(8).padStart(l - 1, '0') + '\0'); }
    voci.forEach(function (v) {
      var h = new Uint8Array(B), dir = v.nome.slice(-1) === '/';
      scrivi(h, 0, 100, v.nome); ottale(h, 100, 8, dir ? 493 : 420); ottale(h, 108, 8, 0); ottale(h, 116, 8, 0);
      ottale(h, 124, 12, dir ? 0 : v.dati.length); ottale(h, 136, 12, 0);
      h.fill(0x20, 148, 156); h[156] = dir ? 0x35 : 0x30; scrivi(h, 257, 6, 'ustar\0'); scrivi(h, 263, 2, '00');
      var somma = 0; for (var i = 0; i < B; i++) somma += h[i];
      scrivi(h, 148, 8, somma.toString(8).padStart(6, '0') + '\0 ');
      out.set(h, at); at += B;
      if (!dir) { out.set(v.dati, at); at += Math.ceil(v.dati.length / B) * B; }
    });
    return out;
  }

  function sha256(dati) {
    return crypto.subtle.digest('SHA-256', dati).then(function (d) {
      return Array.prototype.map.call(new Uint8Array(d), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }

  function mb(n) { return (n / 1e6).toFixed(1).replace('.', ',') + ' MB'; }

  /* URL (blob:) del modello in tar.gz: dalla cache del browser, o scaricato e convertito. */
  function fileModello(avanzamento) {
    var cache;
    return apriCache().then(function (c) {
      cache = c;
      return c ? c.match(chiaveModello()) : null;
    }).then(function (r) {
      if (r) { avanzamento('Modello già nel dispositivo, caricamento…'); return r.blob(); }
      return fetch(MODELLO_ZIP).then(function (res) {
        if (!res.ok || !res.body) throw new Error('scaricamento non riuscito (' + res.status + ')');
        var totale = Number(res.headers.get('content-length')) || MODELLO_BYTE;
        var dati = new Uint8Array(totale), letti = 0, lettore = res.body.getReader();
        function leggi() {
          return lettore.read().then(function (p) {
            if (p.done) return dati.subarray(0, letti);
            if (letti + p.value.length > dati.length) throw new Error('il file è più grande del previsto');
            dati.set(p.value, letti); letti += p.value.length;
            avanzamento('Scaricamento: ' + mb(letti) + ' di ' + mb(totale), letti / totale);
            return leggi();
          });
        }
        return leggi();
      }).then(function (zip) {
        avanzamento('Controllo dell’impronta…');
        return sha256(zip).then(function (h) {
          if (h !== MODELLO_SHA256) throw new Error('il file scaricato non è quello ufficiale (impronta diversa)');
          avanzamento('Conversione del modello…');
          var gz = fflate.gzipSync(creaTar(fflate.unzipSync(zip)), { level: 1 });
          var blob = new Blob([gz], { type: 'application/gzip' });
          return (cache ? cache.put(chiaveModello(), new Response(blob)).catch(function () {}) : Promise.resolve()).then(function () { return blob; });
        });
      });
    }).then(function (blob) { return URL.createObjectURL(blob); });
  }

  /* Raccolta dell'audio fuori dalla pagina (AudioWorklet), pezzi da 1024 campioni; "flush" manda l'ultimo pezzo. */
  var WORKLET = 'class Cattura extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(1024);this.n=0;this.port.onmessage=()=>this.invia()}' +
    'invia(){if(this.n)this.port.postMessage(this.b.slice(0,this.n));this.n=0}' +
    'process(i){const c=i[0]&&i[0][0];if(c){for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===this.b.length)this.invia()}}return true}}' +
    'registerProcessor("cattura-voce",Cattura);';

  /* Ricampiona a 16 kHz (media dei campioni scendendo, interpolazione salendo), come src/voice/audio.ts. */
  function ricampiona(input, da) {
    if (da === FREQ) return input.slice();
    var n = Math.round(input.length * FREQ / da), out = new Float32Array(n), r = da / FREQ, i, j;
    if (r > 1) {
      for (i = 0; i < n; i++) {
        var a = Math.floor(i * r), b = Math.min(input.length, Math.max(a + 1, Math.floor((i + 1) * r))), s = 0;
        for (j = a; j < b; j++) s += input[j];
        out[i] = s / (b - a);
      }
    } else {
      for (i = 0; i < n; i++) {
        var p = i * r, k = Math.floor(p), x = input[k] || 0, y = input[k + 1] === undefined ? x : input[k + 1];
        out[i] = x + (y - x) * (p - k);
      }
    }
    return out;
  }

  /* Motore Vosk. Eventi: onParziale(testo), onRisultato(testo) a ogni pausa (Vosk chiude la frase). */
  function MotoreVosk() {
    this.pronto = null; this.rec = null; this.ctx = null; this.flusso = null; this.nodo = null;
    this.ascolta = false; this.campioni = 0; this.onParziale = null; this.onRisultato = null; this.attesaFine = null;
  }
  MotoreVosk.prototype.prepara = function (avanzamento) {
    var self = this;
    avanzamento = avanzamento || function () {};
    if (!this.pronto) {
      this.pronto = Promise.all([caricaScript('voce/fflate.js'), caricaScript('voce/vosk.js')]).then(function () {
        return fileModello(avanzamento);
      }).then(function (url) {
        avanzamento('Preparazione del riconoscimento…');
        return Vosk.createModel(url, -1).then(function (modello) {
          URL.revokeObjectURL(url);
          var rec = new modello.KaldiRecognizer(FREQ);
          rec.on('partialresult', function (m) {
            var t = m.result.partial;
            if (t && self.ascolta && self.onParziale) self.onParziale(t);
          });
          rec.on('result', function (m) {
            var t = m.result.text;
            if (self.attesaFine) { var f = self.attesaFine; self.attesaFine = null; f(t || ''); return; }
            if (t && self.onRisultato) self.onRisultato(t);
          });
          self.rec = rec;
        });
      }).catch(function (e) { self.pronto = null; throw e; });
    }
    return this.pronto;
  };
  MotoreVosk.prototype.apriMicrofono = function () {
    var self = this;
    if (this.ctx && this.flusso && this.flusso.active) return Promise.resolve();
    this.chiudiMicrofono();
    return navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    }).then(function (flusso) {
      var ctx, sorgente;
      try { ctx = new AudioContext({ sampleRate: FREQ }); sorgente = ctx.createMediaStreamSource(flusso); }
      catch (e) { ctx = new AudioContext(); sorgente = ctx.createMediaStreamSource(flusso); }
      self.ctx = ctx; self.flusso = flusso;
      function riceviPezzo(pezzo) {
        if (!self.ascolta || !self.rec) return;
        var c = ricampiona(pezzo, ctx.sampleRate);
        self.campioni += c.length;
        self.rec.acceptWaveformFloat(c, FREQ);
      }
      var muto = ctx.createGain(); muto.gain.value = 0; muto.connect(ctx.destination);
      var url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }));
      return ctx.audioWorklet.addModule(url).then(function () {
        URL.revokeObjectURL(url);
        var nodo = new AudioWorkletNode(ctx, 'cattura-voce', { numberOfInputs: 1, numberOfOutputs: 1 });
        nodo.port.onmessage = function (ev) { riceviPezzo(ev.data); };
        sorgente.connect(nodo); nodo.connect(muto);
        self.nodo = nodo;
      }, function () {
        // senza AudioWorklet: vecchio ScriptProcessor
        URL.revokeObjectURL(url);
        var nodo = ctx.createScriptProcessor(4096, 1, 1);
        nodo.onaudioprocess = function (e) { riceviPezzo(e.inputBuffer.getChannelData(0).slice()); };
        sorgente.connect(nodo); nodo.connect(muto);
        self.nodo = nodo;
      });
    });
  };
  MotoreVosk.prototype.avvia = function (gestori) {
    var self = this;
    return this.prepara().then(function () { return self.apriMicrofono(); }).then(function () { return self.ctx.resume(); }).then(function () {
      self.onParziale = gestori.onParziale; self.onRisultato = gestori.onRisultato;
      self.campioni = 0; self.ascolta = true;
    });
  };
  /* Ferma l'ascolto e restituisce l'ultima frase non ancora chiusa (con durata dell'audio e tempo di calcolo). */
  MotoreVosk.prototype.ferma = function () {
    var self = this;
    if (!this.ascolta || !this.rec) return Promise.resolve({ testo: '', audioMs: 0, ms: 0 });
    return new Promise(function (ok) { setTimeout(ok, 150); }).then(function () {
      if (self.nodo && self.nodo.port) self.nodo.port.postMessage('flush');
      return new Promise(function (ok) { setTimeout(ok, 50); });
    }).then(function () {
      self.ascolta = false;
      var audioMs = self.campioni / FREQ * 1000, t0 = performance.now();
      return new Promise(function (ok) {
        self.attesaFine = ok;
        self.rec.retrieveFinalResult();
      }).then(function (testo) { return { testo: testo, audioMs: audioMs, ms: performance.now() - t0 }; });
    });
  };
  MotoreVosk.prototype.chiudiMicrofono = function () {
    this.ascolta = false;
    if (this.flusso) this.flusso.getTracks().forEach(function (t) { t.stop(); });
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} }
    this.flusso = null; this.ctx = null; this.nodo = null;
  };

  /* Nei test si può sostituire il motore con uno simulato (window.__motoreVoceSimulato). */
  function creaMotore() {
    return window.__motoreVoceSimulato ? window.__motoreVoceSimulato() : new MotoreVosk();
  }

  return {
    disponibile: function () { return !!window.__motoreVoceSimulato || disponibile(); },
    modelloScaricato: function () { return window.__motoreVoceSimulato ? Promise.resolve(!!window.__modelloSimulatoScaricato) : modelloScaricato(); },
    creaMotore: creaMotore,
    creaTar: creaTar,
    ricampiona: ricampiona
  };
})();
