/* Dalle parole dette (come le scrive Vosk: minuscole, numeri in lettere) ai valori e ai comandi.
   Regole fisse, senza audio, testabili in Node. I numeri seguono le stesse regole del progetto
   "stampa etichette webusb" (src/voice/dictation.ts, parseItalianNumber).
   Vedi docs/2026-11-12-dettatura-vosk.md. */
var Dettato = (function () {
  'use strict';

  var UNITA = {
    zero: 0, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9,
    dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16,
    diciassette: 17, diciotto: 18, diciannove: 19
  };
  var CIFRE = ['', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove'];
  var DECINE = [['venti', 20], ['trenta', 30], ['quaranta', 40], ['cinquanta', 50], ['sessanta', 60], ['settanta', 70], ['ottanta', 80], ['novanta', 90]];

  /* Da 0 a 99, una parola sola ("ventotto", "quarantatre"). */
  function fino99(w) {
    if (Object.prototype.hasOwnProperty.call(UNITA, w)) return UNITA[w];
    for (var i = 0; i < DECINE.length; i++) {
      var nome = DECINE[i][0], valore = DECINE[i][1];
      if (w === nome) return valore;
      if (w.indexOf(nome) === 0) {
        var u = CIFRE.indexOf(w.slice(nome.length));
        if (u > 0) return valore + u;
      }
      var radice = nome.slice(0, -1); // elisione: ventuno, trentotto
      if (w === radice + 'uno') return valore + 1;
      if (w === radice + 'otto') return valore + 8;
    }
    return null;
  }

  /* Da 0 a 999, una parola sola ("centoventicinque", "duecento", "centotto"). */
  function fino999(w) {
    var piccolo = fino99(w);
    if (piccolo !== null) return piccolo;
    var at = w.indexOf('cent');
    if (at < 0) return null;
    var testa = w.slice(0, at);
    var centinaia = testa === '' ? 1 : CIFRE.indexOf(testa);
    if (centinaia < 1 || (testa !== '' && centinaia === 1)) return null;
    var resto = w.slice(at + 4);
    if (resto === 'otto') return centinaia * 100 + 8; // centotto
    /* da x80 a x89 Vosk toglie la "o" di cento: "centottanta", "duecentottantotto" (docs/2026-11-27-dettatura-centottanta.md) */
    if (resto.indexOf('ott') === 0) {
      var ottanta = fino99(resto);
      if (ottanta !== null && ottanta >= 80 && ottanta <= 89) return centinaia * 100 + ottanta;
    }
    if (resto.charAt(0) !== 'o') return null;
    resto = resto.slice(1);
    if (resto === '') return centinaia * 100;
    var coda = fino99(resto);
    return coda === null || coda === 0 ? null : centinaia * 100 + coda;
  }

  /* Intero da 0 a 9999 scritto in una parola italiana, o null. "un" e "una" no: sono articoli. */
  function numeroItaliano(parola) {
    var w = String(parola).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    if (w === '') return null;
    var migliaia = 0, resto = w;
    if (w.indexOf('mille') === 0) {
      migliaia = 1; resto = w.slice(5);
    } else {
      var at = w.indexOf('mila');
      if (at > 0) {
        migliaia = CIFRE.indexOf(w.slice(0, at));
        if (migliaia < 2) return null;
        resto = w.slice(at + 4);
      }
    }
    if (resto === '') return migliaia ? migliaia * 1000 : null;
    var basso = fino999(resto);
    if (basso === null || (migliaia && basso === 0)) return null;
    return migliaia * 1000 + basso;
  }

  /* Il numero più lungo che parte da i, anche su più parole ("cento venticinque", "mille e cento"). */
  function numeroDa(tok, i) {
    for (var k = Math.min(tok.length, i + 5); k > i; k--) {
      var pezzo = tok.slice(i, k);
      if (pezzo[0] === 'e' || pezzo[pezzo.length - 1] === 'e') continue;
      var v = numeroItaliano(pezzo.filter(function (t) { return t !== 'e'; }).join(''));
      if (v !== null) return { valore: v, dopo: k };
    }
    return null;
  }

  /* Come il riconoscimento può scrivere la "e" fra una cifra e le decine ("due il settanta"). */
  var CONGIUNZIONI = ['e', 'è', 'ed', 'il'];

  var COMANDI = {
    avanti: 'avanti', poi: 'avanti', prossimo: 'avanti',
    indietro: 'indietro',
    cancella: 'cancella',
    correggi: 'correggi', annulla: 'correggi',
    stop: 'stop', basta: 'stop', fine: 'stop'
  };

  /* Trasforma una frase riconosciuta in una lista di azioni, nell'ordine:
     { tipo: 'valore', testo: '214,94' }   valore da scrivere nella casella attiva
     { tipo: 'comando', comando: 'avanti'|'indietro'|'cancella'|'correggi'|'stop' }
     { tipo: 'riga', n: 12 }
     { tipo: 'ignoto', parole: '...' }      parole non capite (non si scrive niente)
     opzioni.unValore: modo "Un valore", dove anche "due settanta" (senza "e") vale 270. */
  function interpreta(frase, opzioni) {
    var unValore = !!(opzioni && opzioni.unValore);
    var tok = String(frase || '').normalize('NFC').toLowerCase().trim().split(/\s+/).filter(Boolean);
    var azioni = [], ignote = [];
    function chiudiIgnote() {
      if (ignote.length) { azioni.push({ tipo: 'ignoto', parole: ignote.join(' ') }); ignote = []; }
    }
    var i = 0;
    while (i < tok.length) {
      var t = tok[i];
      if (Object.prototype.hasOwnProperty.call(COMANDI, t)) {
        chiudiIgnote();
        azioni.push({ tipo: 'comando', comando: COMANDI[t] });
        i++; continue;
      }
      if (t === 'riga') {
        var nr = numeroDa(tok, i + 1);
        if (nr && nr.valore > 0) {
          chiudiIgnote();
          azioni.push({ tipo: 'riga', n: nr.valore });
          i = nr.dopo; continue;
        }
      }
      var meno = false, j = i;
      if (t === 'meno') { meno = true; j = i + 1; }
      var num = numeroDa(tok, j);
      if (!num) { ignote.push(t); i++; continue; }
      /* centinaia abbreviate: "due e settanta" = 270 (docs/2026-11-22-due-e-settanta.md); la "e" può
         arrivare come "è", "ed" o "il", e nel modo Un valore anche mancare ("due settanta")
         (docs/2026-11-22-un-valore-per-pressione.md) */
      if (num.dopo === j + 1 && num.valore >= 1 && num.valore <= 9) {
        var conE = CONGIUNZIONI.indexOf(tok[j + 1]) >= 0;
        var coda = conE || unValore ? numeroDa(tok, conE ? j + 2 : j + 1) : null;
        if (coda && coda.valore >= 10 && coda.valore <= 99) num = { valore: num.valore * 100 + coda.valore, dopo: coda.dopo };
      }
      chiudiIgnote();
      var testo = String(num.valore);
      j = num.dopo;
      var sep = tok[j] === 'virgola' ? ',' : tok[j] === 'punto' ? '.' : null;
      if (sep) {
        var decimali = '';
        j++;
        for (; j < tok.length; j++) {
          var d = numeroItaliano(tok[j]);
          if (d === null) break;
          decimali += String(d);
        }
        testo += sep + decimali;
      }
      azioni.push({ tipo: 'valore', testo: (meno ? '-' : '') + testo });
      i = j;
    }
    chiudiIgnote();
    return azioni;
  }

  return { numeroItaliano: numeroItaliano, interpreta: interpreta };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Dettato;
