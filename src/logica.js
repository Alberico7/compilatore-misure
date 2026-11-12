/* Logica pura (nessun accesso al DOM): conversione, validazione, Code 128, blocchi QR, confronto lettura.
   Usata sia dalla pagina sia dai test in Node. */
var Logica = (function () {
  'use strict';

  var CR = '\r';

  function rimuoviZeri(cifre) {
    var s = cifre.replace(/^0+/, '');
    return s === '' ? '0' : s;
  }

  /* Valore come appare in macchina: inserisce il separatore a "decimali" cifre da destra. */
  function formatoMacchina(cifre, decimali) {
    var neg = cifre.charAt(0) === '-';
    var d = neg ? cifre.slice(1) : cifre;
    if (decimali > 0) {
      while (d.length < decimali + 1) d = '0' + d;
      d = d.slice(0, d.length - decimali) + '.' + d.slice(d.length - decimali);
    }
    return (neg ? '-' : '') + d;
  }

  /* Converte il testo di una casella nelle cifre da digitare.
     modo: 'macchina' (2000) | 'separatore' (20.00 / 20,00)
     Ritorna { stato: 'vuoto'|'errore'|'ok', messaggio, cifre, display, negativo } */
  function converti(testo, modo, decimali) {
    var s = String(testo == null ? '' : testo).trim();
    if (s === '') return { stato: 'vuoto', messaggio: 'Casella vuota' };

    var neg = false, intera, frazione = '';
    if (modo === 'macchina') {
      if (/^-?\d*[.,]\d*$/.test(s) && /\d/.test(s)) {
        return { stato: 'errore', messaggio: 'Non scrivere il separatore (es. 2000 per ' + formatoMacchina('2000', decimali) + ')' };
      }
      var m1 = /^(-?)(\d+)$/.exec(s);
      if (!m1) return { stato: 'errore', messaggio: 'Valore non numerico' };
      neg = m1[1] === '-';
      intera = m1[2];
    } else {
      var m2 = /^(-?)(\d*)(?:[.,](\d*))?$/.exec(s);
      if (!m2 || !/\d/.test(s)) return { stato: 'errore', messaggio: 'Valore non numerico' };
      neg = m2[1] === '-';
      intera = m2[2];
      frazione = m2[3] || '';
      if (frazione.length > decimali) {
        return { stato: 'errore', messaggio: 'Troppi decimali (massimo ' + decimali + ')' };
      }
      while (frazione.length < decimali) frazione += '0';
    }

    var cifre = rimuoviZeri(intera + frazione);
    if (cifre === '0') neg = false;
    if (neg) cifre = '-' + cifre;
    return {
      stato: 'ok',
      cifre: cifre,
      display: formatoMacchina(cifre, decimali),
      negativo: neg
    };
  }

  /* Analizza tutta la tabella. righe: [[angolo, altezza], ...]
     imp: { modo, decAng, decAlt } */
  function analizza(righe, imp) {
    var celle = [], errori = [], avvisi = [], valori = [];
    var separatoriInMacchina = 0;
    for (var i = 0; i < righe.length; i++) {
      var ra = converti(righe[i][0], imp.modo, imp.decAng);
      var rh = converti(righe[i][1], imp.modo, imp.decAlt);
      celle.push([ra, rh]);
      [[ra, 'Angolo', 0], [rh, 'Altezza', 1]].forEach(function (x) {
        var r = x[0], nome = x[1] + ' ' + (i + 1);
        if (r.stato !== 'ok') {
          errori.push({ riga: i, col: x[2], testo: nome + ': ' + r.messaggio });
          if (/separatore/.test(r.messaggio)) separatoriInMacchina++;
        } else {
          if (r.negativo) avvisi.push({ riga: i, col: x[2], testo: nome + ': valore negativo (' + r.display + ')' });
          valori.push({ etichetta: nome, tipo: x[1], coppia: i + 1, cifre: r.cifre, display: r.display });
        }
      });
    }
    return {
      celle: celle,
      errori: errori,
      avvisi: avvisi,
      valido: righe.length > 0 && errori.length === 0,
      valori: errori.length === 0 ? valori : [],
      suggerisciSeparatore: separatoriInMacchina > 0
    };
  }

  /* ---------------- Code 128 ---------------- */
  var PATTERN = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
  ];
  var START_B = 104, START_C = 105, CODE_B = 100, STOP = 106;

  /* Ritorna i valori dei simboli (start + dati + checksum + stop). */
  function code128Simboli(testo) {
    var s = String(testo), simboli = [];
    for (var k = 0; k < s.length; k++) {
      var cc = s.charCodeAt(k);
      if (cc < 32 || cc > 126) throw new Error('Carattere non codificabile: ' + s.charAt(k));
    }
    var soloCifre = /^\d+$/.test(s);
    if (soloCifre && s.length >= 2) {
      simboli.push(START_C);
      var pari = s.length - (s.length % 2);
      for (var i = 0; i < pari; i += 2) simboli.push(parseInt(s.substr(i, 2), 10));
      if (pari < s.length) {
        simboli.push(CODE_B);
        simboli.push(s.charCodeAt(pari) - 32);
      }
    } else {
      simboli.push(START_B);
      for (var j = 0; j < s.length; j++) simboli.push(s.charCodeAt(j) - 32);
    }
    var somma = simboli[0];
    for (var n = 1; n < simboli.length; n++) somma += n * simboli[n];
    simboli.push(somma % 103);
    simboli.push(STOP);
    return simboli;
  }

  /* Larghezze dei moduli alternate barra/spazio, iniziando da barra. */
  function code128Larghezze(testo) {
    return code128Simboli(testo).map(function (v) { return PATTERN[v]; }).join('').split('').map(Number);
  }

  /* SVG del codice a barre. modulo = px per modulo; zona di rispetto 10 moduli per lato. */
  function code128Svg(testo, modulo, altezza) {
    modulo = modulo || 3; altezza = altezza || 80;
    var larg = code128Larghezze(testo), quiet = 10, x = quiet, rett = [];
    for (var i = 0; i < larg.length; i++) {
      if (i % 2 === 0) rett.push('<rect x="' + x + '" y="0" width="' + larg[i] + '" height="1"/>');
      x += larg[i];
    }
    var tot = x + quiet;
    return '<svg xmlns="http://www.w3.org/2000/svg" class="barcode" width="' + tot * modulo + '" height="' + altezza +
      '" viewBox="0 0 ' + tot + ' 1" preserveAspectRatio="none" shape-rendering="crispEdges" role="img" aria-label="Codice ' + testo + '">' +
      '<rect width="' + tot + '" height="1" fill="#fff"/><g fill="#000">' + rett.join('') + '</g></svg>';
  }

  /* ---------------- QR a blocchi ---------------- */
  function blocchiQR(valori, coppiePerBlocco, invioFinale) {
    var perBlocco = Math.max(1, coppiePerBlocco | 0) * 2, blocchi = [];
    for (var i = 0; i < valori.length; i += perBlocco) {
      var parte = valori.slice(i, i + perBlocco);
      var testo = parte.map(function (v) { return v.cifre; }).join(CR) + (invioFinale ? CR : '');
      blocchi.push({
        indice: blocchi.length,
        valori: parte,
        testo: testo,
        primaCoppia: parte[0].coppia,
        ultimaCoppia: parte[parte.length - 1].coppia,
        iniziaCon: parte[0].etichetta,
        finisceCon: parte[parte.length - 1].etichetta
      });
    }
    return blocchi;
  }

  /* qrcodeLib: la funzione qrcode() di qrcode-generator. */
  /* lato: dimensione desiderata in px (si usa un numero intero di px per modulo). */
  function qrSvg(qrcodeLib, testo, lato) {
    var qr = qrcodeLib(0, 'M');
    qr.addData(testo, 'Byte');
    qr.make();
    var n = qr.getModuleCount(), quiet = 4, tot = n + 2 * quiet, path = [];
    var modulo = Math.max(3, Math.floor((lato || 400) / tot));
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) path.push('M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z');
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" class="qr" width="' + tot * modulo + '" height="' + tot * modulo +
      '" viewBox="0 0 ' + tot + ' ' + tot + '" shape-rendering="crispEdges" role="img" aria-label="Codice QR">' +
      '<rect width="' + tot + '" height="' + tot + '" fill="#fff"/><path fill="#000" d="' + path.join('') + '"/></svg>';
  }

  /* ---------------- Prova del lettore ---------------- */
  /* ricevuto: testo della casella di prova (INVIO = \n, TAB = \t).
     attesi: array di stringhe (cifre). */
  function confronta(ricevuto, attesi) {
    var testo = String(ricevuto).replace(/\r\n?/g, '\n');
    var problemi = [], suggerimenti = {};
    if (testo.indexOf('\t') >= 0) {
      suggerimenti.tab = 'Il lettore invia TAB: nella configurazione del lettore impostare il suffisso INVIO (CR).';
      testo = testo.replace(/\t/g, '\n');
    }
    var righe = testo.split('\n');
    if (righe.length && righe[righe.length - 1] === '') righe.pop(); // INVIO finale normale

    var letti = [], vuoteDopo = [];
    righe.forEach(function (r) {
      if (r === '') vuoteDopo.push(letti.length);
      else letti.push(r);
    });
    vuoteDopo.forEach(function (n) {
      problemi.push(n === 0 ? 'INVIO in più all\'inizio.' : 'INVIO doppio dopo il valore n. ' + n + ': in macchina si salterebbe un campo.');
    });
    if (vuoteDopo.length) {
      suggerimenti.doppio = 'INVIO doppi: se usi i QR disattiva "Aggiungi INVIO finale nel QR"; altrimenti controlla il suffisso del lettore.';
    }

    var esiti = [], ok = 0, i = 0, j = 0;
    while (i < letti.length || j < attesi.length) {
      var r = i < letti.length ? letti[i] : null;
      var a = j < attesi.length ? attesi[j] : null;
      if (r === null) break; // non ancora letti: non è un errore
      if (a === null) {
        esiti.push({ n: j + 1, atteso: '', ricevuto: r, esito: 'in più' });
        problemi.push('Valore in più: "' + r + '".');
        i++; j++; continue;
      }
      if (r === a) {
        esiti.push({ n: j + 1, atteso: a, ricevuto: r, esito: 'ok' });
        ok++; i++; j++; continue;
      }
      /* valori attaccati: il lettore non ha inviato il CR fra un valore e l'altro */
      var concat = a, k = j + 1;
      while (concat.length < r.length && k < attesi.length) { concat += attesi[k]; k++; }
      if (concat === r && k - j > 1) {
        esiti.push({ n: j + 1, atteso: attesi.slice(j, k).join(' ⏎ '), ricevuto: r, esito: 'attaccati' });
        problemi.push('Valori ' + (j + 1) + '–' + k + ' arrivati attaccati, senza INVIO in mezzo.');
        suggerimenti.attaccati = 'Valori attaccati: attiva sul lettore "Function key emulation" (invio dei caratteri di controllo), così il CR nel QR diventa INVIO.';
        i++; j = k; continue;
      }
      esiti.push({ n: j + 1, atteso: a, ricevuto: r, esito: 'diverso' });
      problemi.push('Valore n. ' + (j + 1) + ': atteso "' + a + '", ricevuto "' + r + '".');
      if (/[^\d\-]/.test(r) || (a.length === r.length)) {
        suggerimenti.layout = 'Caratteri diversi: il layout di tastiera del lettore non corrisponde a quello del PC (es. "-" che arriva come "ß" o "\'"). Imposta sul lettore lo stesso layout del PC che stai usando.';
      }
      if (r.length < a.length && a.indexOf(r) === 0) {
        suggerimenti.persi = 'Caratteri persi: imposta un ritardo tra i caratteri (inter-character delay) sul lettore.';
      }
      i++; j++;
    }

    return {
      esiti: esiti,
      letti: letti.length,
      attesi: attesi.length,
      corretti: ok,
      mancanti: Math.max(0, attesi.length - j),
      problemi: problemi,
      suggerimenti: Object.keys(suggerimenti).map(function (k2) { return suggerimenti[k2]; }),
      tuttoOk: problemi.length === 0 && !suggerimenti.tab && j >= attesi.length && letti.length > 0
    };
  }

  return {
    CR: CR,
    converti: converti,
    formatoMacchina: formatoMacchina,
    analizza: analizza,
    code128Simboli: code128Simboli,
    code128Larghezze: code128Larghezze,
    code128Svg: code128Svg,
    blocchiQR: blocchiQR,
    qrSvg: qrSvg,
    confronta: confronta
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Logica;
