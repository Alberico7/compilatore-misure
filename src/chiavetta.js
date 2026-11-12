/* Chiavetta (Raspberry Pi Pico 2 W): testo dei valori, protocollo di caricamento e
   collegamento via Bluetooth (Web Bluetooth) o con il cavo (WebUSB).
   La parte pura è usata anche dai test in Node. Il formato e il protocollo sono gli
   stessi del firmware: chiavetta/src/dati.h. */
var Chiavetta = (function () {
  'use strict';

  var MAX_TESTO = 12000, MAX_VALORI = 1000, MAX_CIFRE = 9;
  var SERVIZIO = '0f600001-7d5c-4ab1-a5aa-df4e1c99d7c0';
  var COMANDO = '0f600002-7d5c-4ab1-a5aa-df4e1c99d7c0';
  var RISPOSTA = '0f600003-7d5c-4ab1-a5aa-df4e1c99d7c0';
  var USB_VID = 0x1209, USB_PID_CARICAMENTO = 0x0006;
  var NESSUN_CODICE = 0xFFFFFFFF;
  var ATTESA_RISPOSTA_MS = 8000;
  /* Versione del firmware pubblicato sul sito: build.js la prende da chiavetta/CMakeLists.txt. */
  var VERSIONE_PUBBLICATA = '__VERSIONE_FIRMWARE__';
  function versionePubblicata() { return /^\d+\.\d+\.\d+$/.test(VERSIONE_PUBBLICATA) ? VERSIONE_PUBBLICATA : null; }

  /* < 0 se a è più vecchia di b, 0 se uguali, > 0 se più nuova ("1.10.0" > "1.9.3"). */
  function confrontaVersioni(a, b) {
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
    return 0;
  }
  /* Stessi nomi e limiti della tabella IMPOSTAZIONI in chiavetta/src/dati.c (lo controlla un test). */
  var IMPOSTAZIONI = [
    { nome: 'ritardo_carattere_ms', campo: 'ritardoCarattere', min: 1, max: 1000, etichetta: 'Pausa tra i tasti (ms)' },
    { nome: 'ritardo_invio_ms', campo: 'ritardoInvio', min: 0, max: 5000, etichetta: 'Pausa dopo INVIO (ms)' },
    { nome: 'coppie_per_pressione', campo: 'coppiePerPressione', min: 0, max: 500, etichetta: 'Coppie per pressione' }
  ];

  var TABELLA_CRC = (function () {
    var t = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t.push(c >>> 0);
    }
    return t;
  })();

  function crc32(byte) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < byte.length; i++) c = TABELLA_CRC[(c ^ byte[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function esa(n) { return ('00000000' + (n >>> 0).toString(16).toUpperCase()).slice(-8); }

  function codifica(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7F;
    return out;
  }


  /* Controlla che i valori vadano bene per la chiavetta. Ritorna null o un messaggio. */
  function controlla(valori, imp) {
    if (!valori.length) return 'Nessun valore.';
    if (valori.length % 2) return 'Il numero di valori è dispari.';
    if (valori.length > MAX_VALORI) return 'Troppi valori per la chiavetta: al massimo ' + MAX_VALORI / 2 + ' coppie.';
    for (var i = 0; i < valori.length; i++) {
      if (!new RegExp('^-?\\d{1,' + MAX_CIFRE + '}$').test(valori[i].cifre)) {
        return (valori[i].etichetta || 'Valore ' + (i + 1)) + ': troppe cifre per la chiavetta (al massimo ' + MAX_CIFRE + ').';
      }
    }
    if (imp) {
      for (var k = 0; k < IMPOSTAZIONI.length; k++) {
        var x = IMPOSTAZIONI[k], v = imp[x.campo];
        if (!(v >= x.min && v <= x.max)) return x.etichetta + ': da ' + x.min + ' a ' + x.max + '.';
      }
    }
    return null;
  }

  /* Testo per la chiavetta (solo caratteri ASCII).
     valori: [{cifre}], imp: {ritardoCarattere, ritardoInvio, coppiePerPressione, decAng, decAlt}
     Niente data né ora: stessi valori e impostazioni = stesso testo = stesso codice di controllo,
     così "Controlla la chiavetta" può confrontarlo con la tabella. */
  function testo(valori, imp) {
    var righe = [
      '# Compilatore misure - valori per la chiavetta',
      '# ' + valori.length / 2 + ' coppie - decimali angolo ' + imp.decAng + ', altezza ' + imp.decAlt
    ];
    IMPOSTAZIONI.forEach(function (x) { righe.push(x.nome + ' = ' + imp[x.campo]); });
    valori.forEach(function (v) { righe.push(v.cifre); });
    return righe.join('\n') + '\n';
  }

  function u32(n) { return [n & 0xFF, (n >>> 8) & 0xFF, (n >>> 16) & 0xFF, (n >>> 24) & 0xFF]; }

  /* Pacchetti 'I' (inizio), 'D' (dati, a pezzi di "pezzo" byte), 'F' (fine). */
  function pacchetti(byte, pezzo) {
    var lista = [new Uint8Array([0x49].concat(u32(byte.length), u32(crc32(byte))))];
    for (var i = 0; i < byte.length; i += pezzo) {
      var p = new Uint8Array(1 + Math.min(pezzo, byte.length - i));
      p[0] = 0x44;
      p.set(byte.subarray(i, i + pezzo), 1);
      lista.push(p);
    }
    lista.push(new Uint8Array([0x46]));
    return lista;
  }

  function pacchettoStato() { return new Uint8Array([0x53]); }
  function pacchettoCodice(codice) {
    return new Uint8Array([0x50].concat(u32(codice == null ? NESSUN_CODICE : codice)));
  }

  /* Con il cavo ogni pacchetto è preceduto dalla sua lunghezza (2 byte). */
  function telaio(p) {
    var t = new Uint8Array(p.length + 2);
    t[0] = p.length & 0xFF;
    t[1] = p.length >> 8;
    t.set(p, 2);
    return t;
  }

  var ERRORI = {
    RIGA: 'una riga non è un valore valido',
    IMPOSTAZIONE: 'impostazione non valida',
    VUOTO: 'nessun valore',
    DISPARI: 'numero di valori dispari',
    TROPPI: 'troppi valori',
    LUNGHEZZA: 'dati incompleti o troppo lunghi',
    CRC: 'dati arrivati rovinati (codice di controllo diverso)',
    SEQUENZA: 'trasmissione interrotta',
    OCCUPATO: 'la chiavetta sta scrivendo: aspetta che finisca o fermala',
    CODICE: 'codice non valido (il codice si imposta solo con il cavo)',
    PACCHETTO: 'dati non riconosciuti',
    MEMORIA: 'salvataggio nella chiavetta non riuscito'
  };

  var STATI = {
    VUOTO: 'nessun valore', PRONTO: 'pronta, dall\'inizio', ATTESA: 'sta per scrivere', SCRIVE: 'sta scrivendo',
    FERMATO: 'fermata a metà', FINITO: 'ha finito di scrivere', CARICAMENTO: 'in modo caricamento (cavo)'
  };

  /* Interpreta la risposta di testo della chiavetta. */
  function risposta(s) {
    var p = String(s).trim().split(/\s+/);
    if (p[0] === 'OK' && p.length === 3) return { tipo: 'ok', n: +p[1], crc: p[2] };
    if (p[0] === 'ERRORE' && p.length === 3) {
      var riga = +p[2];
      return { tipo: 'errore', codice: p[1], riga: riga,
        messaggio: 'La chiavetta ha rifiutato i dati: ' + (ERRORI[p[1]] || p[1]) + (riga ? ' (riga ' + riga + ')' : '') + '.' };
    }
    if (p[0] === 'STATO' && (p.length === 6 || p.length === 7)) {   // 6 campi: firmware senza versione
      return { tipo: 'stato', n: +p[1], pos: +p[2], crc: p[3], bluetooth: p[4] === 'BT', stato: p[5], descrizione: STATI[p[5]] || p[5],
        versione: p.length === 7 && /^\d+\.\d+\.\d+$/.test(p[6]) ? p[6] : null };
    }
    if (p[0] === 'CODICE' && p.length === 2) return { tipo: 'codice', attivo: p[1] === 'OK' };
    return { tipo: 'sconosciuta', testo: String(s) };
  }

  function conTempo(promessa, ms, messaggio) {
    return new Promise(function (risolvi, rifiuta) {
      var t = setTimeout(function () { rifiuta(new Error(messaggio)); }, ms);
      promessa.then(function (v) { clearTimeout(t); risolvi(v); }, function (e) { clearTimeout(t); rifiuta(e); });
    });
  }

  /* ---------- Bluetooth ---------- */
  function bluetoothDisponibile() { return typeof navigator !== 'undefined' && !!navigator.bluetooth; }

  function collegaBluetooth() {
    var dispositivo, comando, risp, inAttesa = null, decod = new TextDecoder();
    return navigator.bluetooth.requestDevice({ filters: [{ services: [SERVIZIO] }] }).then(function (d) {
      dispositivo = d;
      return d.gatt.connect();
    }).then(function (server) {
      return server.getPrimaryService(SERVIZIO);
    }).then(function (servizio) {
      return Promise.all([servizio.getCharacteristic(COMANDO), servizio.getCharacteristic(RISPOSTA)]);
    }).then(function (c) {
      comando = c[0];
      risp = c[1];
      risp.addEventListener('characteristicvaluechanged', function (e) {
        var testoRisposta = decod.decode(e.target.value);
        if (inAttesa) { var f = inAttesa; inAttesa = null; f(testoRisposta); }
      });
      return risp.startNotifications();   // qui il telefono chiede il codice, la prima volta
    }).then(function () {
      function scrivi(p) { return comando.writeValueWithResponse(p); }
      return {
        tipo: 'bluetooth',
        nome: dispositivo.name || 'chiavetta',
        /* Manda i pacchetti; l'ultimo produce una risposta. */
        invia: function (lista) {
          var attesa = new Promise(function (risolvi) { inAttesa = risolvi; });
          var catena = Promise.resolve();
          lista.forEach(function (p) { catena = catena.then(function () { return scrivi(p); }); });
          return catena.then(function () {
            return conTempo(attesa, ATTESA_RISPOSTA_MS, 'La chiavetta non ha risposto.');
          }).then(risposta);
        },
        chiudi: function () { try { dispositivo.gatt.disconnect(); } catch (e) { /* già chiuso */ } }
      };
    });
  }

  /* ---------- Cavo (WebUSB) ---------- */
  function usbDisponibile() { return typeof navigator !== 'undefined' && !!navigator.usb; }

  function collegaUsb() {
    var dispositivo, decod = new TextDecoder(), avanzo = '';
    var EP_OUT = 2, EP_IN = 2;
    return navigator.usb.requestDevice({ filters: [{ vendorId: USB_VID, productId: USB_PID_CARICAMENTO }] }).then(function (d) {
      dispositivo = d;
      return d.open();
    }).then(function () {
      return dispositivo.configuration ? null : dispositivo.selectConfiguration(1);
    }).then(function () {
      return dispositivo.claimInterface(0);
    }).then(function () {
      function leggiRiga() {
        var i = avanzo.indexOf('\n');
        if (i >= 0) {
          var riga = avanzo.slice(0, i);
          avanzo = avanzo.slice(i + 1);
          return Promise.resolve(riga);
        }
        return dispositivo.transferIn(EP_IN, 64).then(function (r) {
          if (r.data) avanzo += decod.decode(r.data);
          return leggiRiga();
        });
      }
      return {
        tipo: 'cavo',
        nome: dispositivo.productName || 'chiavetta',
        invia: function (lista) {
          var catena = Promise.resolve();
          lista.forEach(function (p) { catena = catena.then(function () { return dispositivo.transferOut(EP_OUT, telaio(p)); }); });
          return catena.then(function () {
            return conTempo(leggiRiga(), ATTESA_RISPOSTA_MS, 'La chiavetta non ha risposto.');
          }).then(risposta);
        },
        chiudi: function () { try { dispositivo.close(); } catch (e) { /* già chiuso */ } }
      };
    });
  }

  /* Messaggio leggibile per un errore del browser durante il collegamento. */
  function messaggioCollegamento(e, tipo) {
    var nome = e && e.name, msg = (e && e.message) || String(e);
    if (nome === 'NotFoundError') return tipo === 'cavo'
      ? 'Nessuna chiavetta scelta. Collegala tenendo premuto il pulsante (LED che lampeggia) e riprova.'
      : 'Nessuna chiavetta scelta. Controlla che sia accesa, vicina e con il Bluetooth attivo (codice impostato).';
    if (nome === 'SecurityError' || nome === 'NotAllowedError') return 'Il browser non ha dato il permesso: ' + msg;
    if (nome === 'NetworkError') return 'Collegamento perso: ' + msg + ' Avvicina la chiavetta e riprova.';
    return msg;
  }

  return {
    MAX_TESTO: MAX_TESTO, MAX_VALORI: MAX_VALORI, MAX_CIFRE: MAX_CIFRE, IMPOSTAZIONI: IMPOSTAZIONI,
    SERVIZIO: SERVIZIO, COMANDO: COMANDO, RISPOSTA: RISPOSTA, USB_VID: USB_VID, USB_PID_CARICAMENTO: USB_PID_CARICAMENTO,
    ERRORI: ERRORI, STATI: STATI, versionePubblicata: versionePubblicata, confrontaVersioni: confrontaVersioni,
    crc32: crc32, esa: esa, codifica: codifica, controlla: controlla, testo: testo, pacchetti: pacchetti,
    pacchettoStato: pacchettoStato, pacchettoCodice: pacchettoCodice, telaio: telaio, risposta: risposta,
    bluetoothDisponibile: bluetoothDisponibile, usbDisponibile: usbDisponibile,
    collegaBluetooth: collegaBluetooth, collegaUsb: collegaUsb, messaggioCollegamento: messaggioCollegamento
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Chiavetta;
