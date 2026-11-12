(function () {
  'use strict';

  var CHIAVE = 'compilatore-misure-v1';
  var MAX_RIGHE = 500;

  function statoIniziale() {
    var righe = [];
    for (var i = 0; i < 20; i++) righe.push(['', '']);
    return {
      modo: 'separatore', decAng: 2, decAlt: 2, righe: righe,
      coppieBlocco: 10, invioFinale: false, scheda: 'barre', blocco: 0, confronto: 'tutti',
      tema: 'scuro', lettura: 0, voceModo: 'premi', voceSeparatore: 'pausa',
      chRitCar: 30, chRitInv: 200, chCoppie: 0
    };
  }

  var stato = statoIniziale();
  var salvataggioOk = true;
  var analisi = null, blocchi = [];
  var avvisoIncolla = '';

  /* ---------- salvataggio ---------- */
  function carica() {
    try {
      var s = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
      if (s && Array.isArray(s.righe)) {
        var base = statoIniziale();
        Object.keys(base).forEach(function (k) { if (s[k] !== undefined) base[k] = s[k]; });
        base.righe = s.righe.slice(0, MAX_RIGHE).map(function (r) { return [String(r[0] || ''), String(r[1] || '')]; });
        if (!base.righe.length) base.righe.push(['', '']);
        stato = base;
      }
    } catch (e) { salvataggioOk = false; }
  }
  function salva() {
    try { localStorage.setItem(CHIAVE, JSON.stringify(stato)); salvataggioOk = true; }
    catch (e) { salvataggioOk = false; }
    $('stato-salvataggio').textContent = salvataggioOk ? 'I valori si salvano da soli su questo dispositivo.' : 'Attenzione: salvataggio automatico non disponibile in questo browser.';
  }

  /* ---------- utilità ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function intero(v, min, max, def) {
    var n = parseInt(v, 10);
    if (isNaN(n)) return def;
    return Math.min(max, Math.max(min, n));
  }
  function cella(r, c) { return document.querySelector('#corpo-tabella input[data-r="' + r + '"][data-c="' + c + '"]'); }
  function vai(r, c) {
    var el = cella(r, c);
    if (el) { el.focus(); el.select(); }
  }
  function schermoStretto() { return window.matchMedia('(max-width: 640px), (pointer: coarse)').matches; }

  /* Conferma dentro la pagina (confirm() non è disponibile ovunque). Ritorna una Promise<boolean>. */
  function chiedi(testo, etichettaSi) {
    return new Promise(function (risolvi) {
      var velo = $('conferma'), si = $('conferma-si'), no = $('conferma-no');
      var prima = document.activeElement;
      $('conferma-testo').textContent = testo;
      si.textContent = etichettaSi || 'Conferma';
      velo.hidden = false;
      no.focus();
      function fine(v) {
        velo.hidden = true;
        si.onclick = no.onclick = velo.onkeydown = null;
        if (prima && prima.focus) prima.focus();
        risolvi(v);
      }
      si.onclick = function () { fine(true); };
      no.onclick = function () { fine(false); };
      velo.onkeydown = function (e) { if (e.key === 'Escape') fine(false); };
    });
  }

  /* Righe usate: fino all'ultima riga con almeno un valore. Le righe vuote in fondo vengono ignorate. */
  function righeUsate() {
    var n = stato.righe.length;
    while (n > 0 && !stato.righe[n - 1][0].trim() && !stato.righe[n - 1][1].trim()) n--;
    return stato.righe.slice(0, n);
  }

  /* ---------- tema ---------- */
  function applicaTema() {
    document.documentElement.setAttribute('data-tema', stato.tema === 'chiaro' ? 'chiaro' : 'scuro');
    var b = $('btn-tema');
    b.textContent = stato.tema === 'chiaro' ? '☾ Tema scuro' : '☀ Tema chiaro';
    b.setAttribute('aria-pressed', String(stato.tema === 'chiaro'));
    b.title = 'Passa al ' + (stato.tema === 'chiaro' ? 'tema scuro' : 'tema chiaro');
  }

  /* ---------- tabella ---------- */
  /* Mentre si detta, la tastiera del telefono non deve aprirsi: inputmode "none" finché non si tocca una casella. */
  var tastieraNascosta = false;
  function modoInput() { return tastieraNascosta ? 'none' : (stato.modo === 'macchina' ? 'numeric' : 'decimal'); }
  function aggiornaModoInput() {
    document.querySelectorAll('#corpo-tabella input').forEach(function (el) { el.setAttribute('inputmode', modoInput()); });
  }

  function costruisciTabella() {
    var tipoInput = modoInput();
    var html = [];
    for (var i = 0; i < stato.righe.length; i++) {
      html.push('<tr><td class="n">' + (i + 1) + '</td>' +
        [0, 1].map(function (c) {
          var nome = (c === 0 ? 'Angolo ' : 'Altezza ') + (i + 1);
          return '<td><input type="text" inputmode="' + tipoInput + '" enterkeyhint="next" autocomplete="off" spellcheck="false" data-r="' + i + '" data-c="' + c +
            '" id="cella-' + i + '-' + c + '" aria-label="' + nome + '" value="' + esc(stato.righe[i][c]) + '"><div class="anteprima" id="ant-' + i + '-' + c + '"></div></td>';
        }).join('') + '</tr>');
    }
    $('corpo-tabella').innerHTML = html.join('');
    $('num-righe').value = stato.righe.length;
  }

  function impostaRighe(n, chiediConferma) {
    n = intero(n, 1, MAX_RIGHE, stato.righe.length);
    if (n === stato.righe.length) { $('num-righe').value = n; return Promise.resolve(); }
    var tolte = n < stato.righe.length ? stato.righe.slice(n).filter(function (r) { return r[0].trim() || r[1].trim(); }).length : 0;
    var ok = tolte && chiediConferma
      ? chiedi('Le righe da ' + (n + 1) + ' a ' + stato.righe.length + ' contengono ' + tolte + (tolte === 1 ? ' coppia' : ' coppie') + ' con valori.\nEliminarle?', 'Elimina')
      : Promise.resolve(true);
    return ok.then(function (si) {
      if (!si) { $('num-righe').value = stato.righe.length; return; }
      while (stato.righe.length < n) stato.righe.push(['', '']);
      stato.righe.length = n;
      costruisciTabella();
      aggiorna();
    });
  }

  /* Come INVIO in macchina: angolo -> altezza -> angolo della riga dopo (aggiunge una riga all'ultima). */
  function avanti(r, c) {
    if (c === 0) { vai(r, 1); return; }
    if (r === stato.righe.length - 1) {
      if (stato.righe.length >= MAX_RIGHE) return;
      stato.righe.push(['', '']); costruisciTabella(); aggiorna();
    }
    vai(r + 1, 0);
  }
  function indietro(r, c) {
    if (c === 1) vai(r, 0);
    else if (r > 0) vai(r - 1, 1);
  }
  function cambiaSegno(r, c) {
    var el = cella(r, c);
    if (!el) return;
    var v = el.value.trim();
    el.value = v.charAt(0) === '-' ? v.slice(1) : '-' + v;
    stato.righe[r][c] = el.value;
    aggiorna();
  }

  /* ---------- analisi e anteprime ---------- */
  function aggiorna() {
    var usate = righeUsate();
    var imp = { modo: stato.modo, decAng: stato.decAng, decAlt: stato.decAlt };
    analisi = Logica.analizza(usate, imp);
    blocchi = analisi.valido ? Logica.blocchiQR(analisi.valori, stato.coppieBlocco, stato.invioFinale) : [];

    for (var i = 0; i < stato.righe.length; i++) {
      for (var c = 0; c < 2; c++) {
        var inp = cella(i, c), ant = $('ant-' + i + '-' + c);
        if (!inp) continue;
        var r = i < usate.length ? analisi.celle[i][c] : null;
        inp.classList.remove('errore', 'avviso');
        ant.className = 'anteprima';
        if (!r) { ant.innerHTML = ''; continue; }
        if (r.stato !== 'ok') {
          inp.classList.add('errore'); ant.classList.add('errore');
          ant.textContent = r.messaggio;
        } else {
          if (r.negativo) { inp.classList.add('avviso'); ant.classList.add('avviso'); }
          ant.innerHTML = 'In macchina: <b>' + esc(r.display) + '</b>' +
            (r.cifre !== stato.righe[i][c].trim() ? ' · cifre: ' + esc(r.cifre) : '') +
            (r.negativo ? ' · negativo!' : '');
        }
      }
    }
    mostraRiepilogo(usate.length);
    mostraBarre();
    mostraQR();
    chEsitoFisso = false;
    mostraChiavetta();
    aggiornaConfronto();
    if (!$('lettura').hidden) mostraLettura();
    salva();
  }

  function listaMessaggi(lista, max) {
    var h = lista.slice(0, max).map(function (m) {
      return '<li><a href="#" data-vai="' + m.riga + ',' + m.col + '">' + esc(m.testo) + '</a></li>';
    }).join('');
    if (lista.length > max) h += '<li>… e altri ' + (lista.length - max) + '</li>';
    return '<ul>' + h + '</ul>';
  }

  function mostraRiepilogo(nUsate) {
    var h = '';
    if (avvisoIncolla) h += '<div class="messaggio avviso">' + esc(avvisoIncolla) + '</div>';
    if (nUsate === 0) {
      h += '<div class="messaggio avviso">Inserisci almeno una coppia Angolo/Altezza.</div>';
    } else if (analisi.errori.length) {
      h += '<div class="messaggio errore"><b>' + analisi.errori.length + (analisi.errori.length === 1 ? ' casella da correggere' : ' caselle da correggere') +
        '</b> — i codici si generano solo quando tutti i valori sono corretti.' + listaMessaggi(analisi.errori, 8) + '</div>';
      if (analisi.suggerisciSeparatore) {
        h += '<div class="messaggio avviso">Hai scritto dei valori con il separatore: se è voluto, scegli "Con separatore" in alto.</div>';
      }
    } else {
      h += '<div class="messaggio ok">Valori corretti: ' + nUsate + (nUsate === 1 ? ' coppia' : ' coppie') + ' (' + nUsate * 2 + ' valori).' +
        (nUsate < stato.righe.length ? ' Le righe vuote in fondo non vengono usate.' : '') + '</div>';
    }
    if (nUsate > 0 && analisi.avvisi.length) {
      h += '<div class="messaggio avviso"><b>Valori negativi:</b> non sappiamo ancora se la maschera accetta il segno meno. Verificalo in macchina.' +
        listaMessaggi(analisi.avvisi, 8) + '</div>';
    }
    $('riepilogo').innerHTML = h;
  }

  /* ---------- uscite ---------- */
  function messaggioNonPronto() {
    return '<div class="vuoto-codici">Correggi i valori nella sezione 1: i codici compaiono quando tutti i valori sono corretti.</div>';
  }

  function etichetta(v) {
    return '<span class="' + (v.tipo === 'Angolo' ? 'tipo-ang' : 'tipo-alt') + '">' + v.tipo + '</span> ' + v.coppia;
  }

  /* Pixel per modulo del Code 128 perché stia in "larghezza" (min 2, max "massimo"). */
  function moduloBarre(cifre, larghezza, massimo) {
    var moduli = Logica.code128Larghezze(cifre).reduce(function (s, x) { return s + x; }, 0) + 20;
    return Math.max(2, Math.min(massimo, Math.floor(larghezza / moduli)));
  }

  function mostraBarre() {
    $('btn-lettura').disabled = !analisi.valido;
    if (!analisi.valido) { $('uscita-barre').innerHTML = messaggioNonPronto(); return; }
    var largCella = Math.max(200, ($('uscita-barre').clientWidth || 600) / (schermoStretto() ? 1 : 2) - 36);
    var h = analisi.valori.map(function (v, i) {
      return '<div class="cella-barra" data-indice="' + i + '">' +
        '<div class="etichetta">' + etichetta(v) + '</div>' +
        '<div class="cornice">' + Logica.code128Svg(v.cifre, moduloBarre(v.cifre, largCella, 3), 72) + '</div>' +
        '<div class="valore">' + (v.cifre.charAt(0) === '-' ? '⚠ ' : '') + esc(v.display) + '</div>' +
        '<div class="cifre">cifre: ' + esc(v.cifre) + '</div></div>';
    }).join('');
    $('uscita-barre').innerHTML = '<div class="griglia-barre">' + h + '</div>';
  }

  function latoQR() {
    var larg = $('uscita-qr').clientWidth || $('sez-codici').clientWidth - 40 || 380;
    return Math.max(220, Math.min(380, larg - 12));
  }

  function mostraQR() {
    if (!analisi.valido) { $('uscita-qr').innerHTML = messaggioNonPronto(); return; }
    stato.blocco = Math.min(Math.max(0, stato.blocco), blocchi.length - 1);
    var b = blocchi[stato.blocco];
    var righe = [];
    for (var i = 0; i < b.valori.length; i += 2) {
      var a = b.valori[i], h2 = b.valori[i + 1];
      righe.push('<tr><td>' + a.coppia + '</td><td>' + esc(a.display) + '</td><td>' + (h2 ? esc(h2.display) : '') + '</td></tr>');
    }
    var grezzo = b.testo.split(Logica.CR).map(esc).join('<b>⏎</b>');
    $('uscita-qr').innerHTML =
      '<div class="navigazione">' +
      '<button type="button" id="qr-prec"' + (stato.blocco === 0 ? ' disabled' : '') + '>◀ Precedente</button>' +
      '<span class="stato" id="qr-stato">Blocco ' + (stato.blocco + 1) + ' di ' + blocchi.length + '</span>' +
      '<button type="button" id="qr-succ"' + (stato.blocco === blocchi.length - 1 ? ' disabled' : '') + '>Successivo ▶</button></div>' +
      '<div class="info-blocco">Prima di leggere, in macchina mettiti sul campo <b>' + esc(b.iniziaCon) + '</b>. ' +
      'Questo blocco contiene le coppie da <b>' + b.primaCoppia + '</b> a <b>' + b.ultimaCoppia + '</b>.</div>' +
      '<div class="area-qr"><div class="cornice" id="qr-codice">' + Logica.qrSvg(qrcode, b.testo, latoQR()) + '</div></div>' +
      '<div class="contenuto-qr"><table><thead><tr><th>Coppia</th><th>Angolo</th><th>Altezza</th></tr></thead><tbody>' + righe.join('') + '</tbody></table>' +
      '<div class="grezzo" title="Contenuto del QR: ⏎ = INVIO">' + grezzo + '</div></div>';
    $('qr-prec').onclick = function () { stato.blocco--; mostraQR(); salva(); };
    $('qr-succ').onclick = function () { stato.blocco++; mostraQR(); salva(); };
  }

  function mostraScheda() {
    ['barre', 'qr', 'chiavetta'].forEach(function (s) {
      $('tab-' + s).setAttribute('aria-selected', String(stato.scheda === s));
      $('pannello-' + s).hidden = stato.scheda !== s;
    });
    mostraQR(); // la larghezza del QR dipende dal pannello visibile
  }

  /* ---------- chiavetta ---------- */
  var chOccupata = false;
  var chEsitoFisso = false;   // l'ultimo esito resta finché non cambia qualcosa

  function impChiavetta() {
    return { ritardoCarattere: stato.chRitCar, ritardoInvio: stato.chRitInv, coppiePerPressione: stato.chCoppie,
      decAng: stato.decAng, decAlt: stato.decAlt };
  }

  /* Testo e byte da mandare, oppure { errore }. */
  function datiChiavetta() {
    if (!analisi.valido) return { errore: 'Correggi i valori nella sezione 1: si possono inviare solo quando tutti i valori sono corretti.' };
    var errore = Chiavetta.controlla(analisi.valori, impChiavetta());
    if (errore) return { errore: errore };
    var byte = Chiavetta.codifica(Chiavetta.testo(analisi.valori, impChiavetta()));
    if (byte.length > Chiavetta.MAX_TESTO) return { errore: 'Troppi dati per la chiavetta.' };
    return { byte: byte, crc: Chiavetta.esa(Chiavetta.crc32(byte)), n: analisi.valori.length };
  }

  function esitoChiavetta(classe, html) {
    $('esito-chiavetta').innerHTML = '<div class="messaggio ' + classe + '">' + html + '</div>';
  }

  function mostraChiavetta() {
    var bt = Chiavetta.bluetoothDisponibile(), usb = Chiavetta.usbDisponibile();
    $('btn-ch-bt').hidden = !bt;
    $('btn-ch-usb').hidden = !usb;
    $('btn-ch-codice').disabled = $('btn-ch-spegni').disabled = !usb || chOccupata;
    var nota = [];
    if (!bt) nota.push('Questo browser non può usare il Bluetooth dei siti: serve Chrome su Android, oppure Chrome o Edge sul PC.');
    if (!usb) nota.push('Questo browser non può usare il cavo (WebUSB): serve un browser basato su Chromium (Chrome, Edge, Vanadium).');
    $('ch-supporto').textContent = nota.join(' ');
    $('ch-supporto').hidden = !nota.length;
    var d = datiChiavetta();
    $('btn-ch-bt').disabled = $('btn-ch-usb').disabled = !!d.errore || chOccupata;
    if (chOccupata || chEsitoFisso) return;
    if (d.errore) esitoChiavetta('avviso', esc(d.errore));
    else {
      $('esito-chiavetta').innerHTML = '<p class="nota">Pronti da inviare: ' + d.n / 2 + (d.n === 2 ? ' coppia' : ' coppie') +
        ' (' + d.n + ' valori), codice di controllo <b class="vis">' + d.crc + '</b>.</p>';
    }
  }

  /* Collega, esegue "lavoro(collegamento)" e chiude. tipo: 'bluetooth' | 'cavo' */
  function conChiavetta(tipo, lavoro) {
    if (chOccupata) return;
    chOccupata = true;
    chEsitoFisso = true;
    mostraChiavetta();
    esitoChiavetta('avviso', tipo === 'cavo' ? 'Collegamento con il cavo…' : 'Collegamento Bluetooth…');
    var conn = null;
    (tipo === 'cavo' ? Chiavetta.collegaUsb() : Chiavetta.collegaBluetooth()).then(function (c) {
      conn = c;
      esitoChiavetta('avviso', 'Invio in corso…');
      return lavoro(c);
    }).catch(function (e) {
      var msg = Chiavetta.messaggioCollegamento(e, tipo);
      if (tipo === 'bluetooth' && e && e.name === 'NetworkError') {
        msg += ' Se è la prima volta con questo telefono: tieni premuto il pulsante della chiavetta per 5 secondi (doppio lampo) e riprova entro un minuto.';
      }
      esitoChiavetta('errore', esc(msg));
    }).then(function () {
      if (conn) conn.chiudi();
      chOccupata = false;
      mostraChiavetta();
    });
  }

  function inviaChiavetta(tipo) {
    var d = datiChiavetta();
    if (d.errore) { chEsitoFisso = true; esitoChiavetta('errore', esc(d.errore)); return; }
    conChiavetta(tipo, function (c) {
      return c.invia(Chiavetta.pacchetti(d.byte, tipo === 'cavo' ? 1024 : 180)).then(function (r) {
        if (r.tipo === 'ok' && r.crc === d.crc && r.n === d.n) {
          esitoChiavetta('ok', 'Chiavetta: ' + r.n + ' valori caricati, codice di controllo <span class="vis">' + esc(r.crc) +
            '</span> uguale a quello del sito.<br>In macchina: cursore su <b>Angolo 1</b>, poi premi il pulsante della chiavetta.' +
            (tipo === 'cavo' ? ' Prima scollegala e ricollegala <b>senza</b> premere il pulsante.' : ''));
        } else if (r.tipo === 'ok') {
          esitoChiavetta('errore', 'La chiavetta ha ricevuto dati diversi (' + r.n + ' valori, controllo ' + esc(r.crc) + ' invece di ' +
            d.n + ', ' + d.crc + '). Non usarla: rinvia i valori.');
        } else if (r.tipo === 'errore') {
          esitoChiavetta('errore', esc(r.messaggio));
        } else {
          esitoChiavetta('errore', 'Risposta inattesa dalla chiavetta: ' + esc(r.testo || r.tipo));
        }
      });
    });
  }

  function impostaCodice(spegni) {
    var valore = $('ch-codice').value.trim();
    if (!spegni && !/^\d{6}$/.test(valore)) {
      chEsitoFisso = true;
      esitoChiavetta('errore', 'Il codice deve avere 6 cifre.');
      return;
    }
    var domanda = spegni
      ? chiedi('Spegnere il Bluetooth della chiavetta?\nGli abbinamenti vengono cancellati. Si riaccende impostando un nuovo codice.', 'Spegni')
      : chiedi('Impostare il codice ' + valore + '?\nGli abbinamenti precedenti vengono cancellati. Annota il codice: il telefono lo chiede la prima volta.', 'Imposta');
    domanda.then(function (si) {
      if (!si) return;
      conChiavetta('cavo', function (c) {
        return c.invia([Chiavetta.pacchettoCodice(spegni ? null : parseInt(valore, 10))]).then(function (r) {
          if (r.tipo === 'codice') {
            esitoChiavetta('ok', r.attivo
              ? 'Codice impostato. Scollega la chiavetta e ricollegala senza premere il pulsante; poi tieni premuto il pulsante 5 secondi e invia dal telefono: ti chiederà il codice.'
              : 'Bluetooth spento.');
          } else {
            esitoChiavetta('errore', esc(r.messaggio || ('Risposta inattesa: ' + (r.testo || r.tipo))));
          }
        });
      });
    });
  }

  function generaCodice() {
    var n = new Uint32Array(1);
    var limite = Math.floor(0x100000000 / 1000000) * 1000000;   // niente sbilanciamenti
    do { crypto.getRandomValues(n); } while (n[0] >= limite);
    $('ch-codice').value = ('00000' + (n[0] % 1000000)).slice(-6);
  }

  /* ---------- lettura uno alla volta ---------- */
  var wakeLock = null;
  function tieniAcceso() {
    try {
      if (navigator.wakeLock && navigator.wakeLock.request) {
        navigator.wakeLock.request('screen').then(function (w) { wakeLock = w; }).catch(function () {});
      }
    } catch (e) {}
  }
  function apriLettura() {
    if (!analisi.valido) return;
    $('lettura').hidden = false;
    document.body.style.overflow = 'hidden';
    tieniAcceso();
    mostraLettura();
    $('lettura-succ').focus();
  }
  function chiudiLettura() {
    $('lettura').hidden = true;
    document.body.style.overflow = '';
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    $('btn-lettura').focus();
  }
  function mostraLettura() {
    var valori = analisi.valido ? analisi.valori : [];
    if (!valori.length) { chiudiLettura(); return; }
    stato.lettura = Math.min(Math.max(0, stato.lettura | 0), valori.length - 1);
    var v = valori[stato.lettura];
    var centro = $('lettura-centro');
    var larg = Math.min(centro.clientWidth || window.innerWidth - 32, 900) - 24;
    var alt = Math.max(90, Math.min(200, Math.round(window.innerHeight * 0.22)));
    centro.innerHTML =
      '<div class="etichetta" id="lettura-etichetta">' + etichetta(v) + '</div>' +
      '<div class="cornice" id="lettura-codice">' + Logica.code128Svg(v.cifre, moduloBarre(v.cifre, larg, 6), alt) + '</div>' +
      '<div class="valore">' + (v.cifre.charAt(0) === '-' ? '⚠ ' : '') + esc(v.display) + '</div>' +
      '<div class="cifre">cifre: ' + esc(v.cifre) + '</div>';
    $('lettura-avanzamento').textContent = (stato.lettura + 1) + ' di ' + valori.length;
    $('lettura-progresso').style.width = ((stato.lettura + 1) / valori.length * 100) + '%';
    $('lettura-prec').disabled = stato.lettura === 0;
    $('lettura-succ').disabled = stato.lettura === valori.length - 1;
  }
  function spostaLettura(d) {
    var n = analisi.valido ? analisi.valori.length : 0;
    var nuovo = Math.min(Math.max(0, stato.lettura + d), n - 1);
    if (nuovo === stato.lettura) return;
    stato.lettura = nuovo;
    mostraLettura();
    salva();
  }

  /* ---------- prova lettore ---------- */
  function aggiornaConfronto() {
    var sel = $('confronto'), opz = [];
    if (analisi.valido) {
      opz.push(['tutti', 'Tutti i valori in ordine (' + analisi.valori.length + ')']);
      blocchi.forEach(function (b, i) {
        opz.push(['b' + i, 'Blocco QR ' + (i + 1) + ' (coppie ' + b.primaCoppia + '–' + b.ultimaCoppia + ')']);
      });
    }
    if (!opz.some(function (o) { return o[0] === stato.confronto; })) stato.confronto = 'tutti';
    sel.innerHTML = opz.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === stato.confronto ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('');
    sel.disabled = !analisi.valido;
    valutaProva();
  }

  function attesiProva() {
    if (!analisi.valido) return [];
    var lista = stato.confronto === 'tutti' ? analisi.valori : blocchi[parseInt(stato.confronto.slice(1), 10)].valori;
    return lista.map(function (v) { return v.cifre; });
  }

  function visibile(s) {
    return esc(s).replace(/ /g, '␣');
  }

  function valutaProva() {
    var testo = $('prova').value, out = $('esito-prova');
    if (!analisi.valido) { out.innerHTML = '<div class="messaggio avviso">Prima completa e correggi i valori nella sezione 1.</div>'; return; }
    if (!testo) { out.innerHTML = ''; return; }
    var r = Logica.confronta(testo, attesiProva());
    var h = '';
    if (r.tuttoOk) {
      h += '<div class="messaggio ok">Tutto corretto: ' + r.corretti + ' valori su ' + r.attesi + ' arrivati esattamente come attesi.</div>';
    } else if (!r.problemi.length && !r.suggerimenti.length) {
      h += '<div class="messaggio ok">Finora corretti: ' + r.corretti + ' di ' + r.attesi + '. Continua a leggere (mancano ' + r.mancanti + ').</div>';
    } else {
      h += '<div class="messaggio errore"><b>Differenze trovate</b> (corretti ' + r.corretti + ' di ' + r.attesi + ')<ul>' +
        r.problemi.slice(0, 12).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
        (r.problemi.length > 12 ? '<li>… e altre ' + (r.problemi.length - 12) + '</li>' : '') + '</ul></div>';
    }
    if (r.suggerimenti.length) {
      h += '<div class="messaggio avviso"><b>Cosa controllare</b><ul>' +
        r.suggerimenti.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></div>';
    }
    if (r.esiti.length) {
      h += '<div class="contenitore-esiti"><table class="esiti"><thead><tr><th>N°</th><th>Atteso</th><th>Ricevuto</th><th>Esito</th></tr></thead><tbody>' +
        r.esiti.map(function (e) {
          return '<tr class="' + (e.esito === 'ok' ? 'ok' : 'ko') + '"><td>' + e.n + '</td><td class="vis">' + visibile(e.atteso) +
            '</td><td class="vis">' + visibile(e.ricevuto) + '</td><td>' + e.esito + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    out.innerHTML = h;
  }

  /* ---------- incolla da Excel ---------- */
  function incolla(r0, c0, testo) {
    var righe = testo.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n').map(function (l) { return l.split('\t'); });
    avvisoIncolla = '';
    if (r0 + righe.length > MAX_RIGHE) {
      avvisoIncolla = 'Incollate solo le prime ' + (MAX_RIGHE - r0) + ' righe su ' + righe.length + ': il massimo è ' + MAX_RIGHE + ' righe.';
      righe = righe.slice(0, MAX_RIGHE - r0);
    }
    while (stato.righe.length < r0 + righe.length) stato.righe.push(['', '']);
    righe.forEach(function (celle, k) {
      for (var j = 0; j < celle.length && c0 + j < 2; j++) stato.righe[r0 + k][c0 + j] = celle[j].trim();
    });
    costruisciTabella();
    aggiorna();
    vai(Math.min(r0 + righe.length, stato.righe.length - 1), 0);
  }

  /* ---------- barra in basso (telefono) ---------- */
  var cellaAttiva = null;
  function aggiornaBarraMobile() {
    $('barra-mobile').hidden = !((cellaAttiva || ascoltoContinuo) && schermoStretto());
  }

  /* ---------- dettatura (Vosk) ---------- */
  var motore = null, statoVoce = 'spento'; // spento | caricamento | pronto | ascolto
  var ascoltoContinuo = false, tastoPremuto = false, bufferAvanti = '', appenaScritto = false;
  var ultimaDettata = null, ultimiValori = [], timerSilenzio = null, avvisoLentezza = false;
  var SEPARATORI = ['avanti', 'poi', 'prossimo'];

  function mostraStatoVoce(html) { $('voce-stato').innerHTML = html; }
  function aggiornaPulsanteVoce() {
    var t = $('btn-voce-testo'), ascolto = statoVoce === 'ascolto';
    [$('btn-voce'), $('mob-voce')].forEach(function (x) {
      x.classList.toggle('ascolto', ascolto);
      x.classList.toggle('caricamento', statoVoce === 'caricamento');
    });
    if (statoVoce === 'caricamento') t.textContent = 'Preparazione…';
    else if (ascolto) t.textContent = stato.voceModo === 'continuo' ? 'Ascolto… tocca per fermare' : 'Ascolto… lascia per finire';
    else t.textContent = stato.voceModo === 'continuo' ? 'Tocca per dettare' : 'Tieni premuto e parla';
    $('campo-separatore').hidden = stato.voceModo !== 'continuo';
  }

  /* Casella dove va il prossimo valore: quella attiva, altrimenti la prima vuota. */
  function cellaDestinazione() {
    if (cellaAttiva) return cellaAttiva;
    for (var i = 0; i < stato.righe.length; i++) for (var c = 0; c < 2; c++) if (!stato.righe[i][c].trim()) return { r: i, c: c };
    return { r: stato.righe.length - 1, c: 1 };
  }
  function nomeCella(p) { return (p.c === 0 ? 'Angolo ' : 'Altezza ') + (p.r + 1); }
  function nascondiTastiera() {
    if (!tastieraNascosta) { tastieraNascosta = true; aggiornaModoInput(); }
  }

  function scriviValore(p, testo) {
    var el = cella(p.r, p.c);
    if (!el) return;
    el.value = testo;
    stato.righe[p.r][p.c] = testo;
    aggiorna();
    if (!testo) return;
    ultimaDettata = { r: p.r, c: p.c };
    var ant = analisi.celle[p.r] && analisi.celle[p.r][p.c];
    var esito = ant && ant.stato === 'ok' ? ' → in macchina ' + esc(ant.display)
      : (ant ? ' → <span class="non-capito">' + esc(ant.messaggio) + '</span>' : '');
    mostraStatoVoce('Capito: ' + esc(testo) + ' (' + nomeCella(p) + ')' + esito);
    ultimiValori.push('<b>' + esc(nomeCella(p)) + '</b>: ' + esc(testo));
    ultimiValori = ultimiValori.slice(-6);
    $('voce-ultimi').innerHTML = ultimiValori.join(' · ');
  }

  /* Passa alla casella successiva; in ascolto continuo si ferma dopo l'ultima casella della tabella. */
  function avantiDettato(p) {
    if (ascoltoContinuo && p.r === stato.righe.length - 1 && p.c === 1) {
      fermaContinuo('Ultima riga della tabella: dettatura finita.');
      return;
    }
    avanti(p.r, p.c);
  }

  /* Applica le azioni riconosciute.
     valoreAvanza: true = ogni valore passa da solo alla casella dopo (pausa, tieni premuto);
                   false = si passa solo con "avanti". */
  function applicaAzioni(azioni, valoreAvanza) {
    azioni.forEach(function (a) {
      var p = cellaDestinazione();
      if (a.tipo === 'valore') {
        vai(p.r, p.c);
        scriviValore(p, a.testo);
        if (valoreAvanza) avantiDettato(p);
        appenaScritto = valoreAvanza;
        return;
      }
      var dopoValore = appenaScritto;
      appenaScritto = false;
      if (a.tipo === 'ignoto') { mostraStatoVoce('<span class="non-capito">Non ho capito: «' + esc(a.parole) + '»</span>'); return; }
      if (a.tipo === 'riga') {
        if (a.n <= stato.righe.length) { vai(a.n - 1, 0); mostraStatoVoce('<span class="info">Riga ' + a.n + '</span>'); }
        else mostraStatoVoce('<span class="non-capito">La riga ' + a.n + ' non c\'è (righe: ' + stato.righe.length + ')</span>');
        return;
      }
      if (a.comando === 'avanti') {
        if (!dopoValore) { vai(p.r, p.c); avantiDettato(p); } // "avanti" subito dopo un valore che è già passato oltre: niente
      } else if (a.comando === 'indietro') {
        vai(p.r, p.c); indietro(p.r, p.c);
      } else if (a.comando === 'cancella') {
        vai(p.r, p.c); scriviValore(p, ''); mostraStatoVoce('<span class="info">' + nomeCella(p) + ' svuotata</span>');
      } else if (a.comando === 'correggi') {
        if (ultimaDettata) {
          var u = ultimaDettata;
          vai(u.r, u.c); scriviValore(u, '');
          mostraStatoVoce('<span class="info">' + nomeCella(u) + ' svuotata: ridetta il valore.</span>');
        }
      } else if (a.comando === 'stop') {
        fermaContinuo('Dettatura finita.');
      }
    });
  }

  /* Frase chiusa da Vosk (a ogni pausa) durante l'ascolto continuo. */
  function risultatoContinuo(testo) {
    riarmaSilenzio();
    if (stato.voceSeparatore !== 'avanti') { applicaAzioni(Dettato.interpreta(testo), true); return; }
    /* separatore "avanti": le parole si accumulano finché non si dice "avanti";
       i comandi (stop, correggi, indietro, cancella, riga) valgono subito. */
    var tok = (bufferAvanti + ' ' + testo).trim().split(/\s+/);
    var k = -1;
    tok.forEach(function (t, i) { if (SEPARATORI.indexOf(t) >= 0) k = i; });
    var pronte = k >= 0 ? tok.slice(0, k + 1) : [];
    var resto = tok.slice(k + 1);
    var azioniResto = Dettato.interpreta(resto.join(' '));
    var comandoSubito = azioniResto.some(function (a) { return a.tipo === 'riga' || a.tipo === 'comando'; });
    if (comandoSubito) { pronte = tok; resto = []; }
    bufferAvanti = resto.join(' ');
    if (pronte.length) applicaAzioni(Dettato.interpreta(pronte.join(' ')), false);
    if (bufferAvanti) {
      var v = azioniResto.filter(function (a) { return a.tipo === 'valore'; }).pop();
      mostraStatoVoce(v ? 'In attesa di «avanti»: ' + esc(v.testo) + ' (' + nomeCella(cellaDestinazione()) + ')'
        : '<span class="provvisorio">' + esc(bufferAvanti) + '…</span>');
    }
  }

  function riarmaSilenzio() {
    clearTimeout(timerSilenzio);
    if (ascoltoContinuo) timerSilenzio = setTimeout(function () { fermaContinuo('Fermata dopo 30 secondi senza parlare.'); }, 30000);
  }

  function parziale(testo) {
    riarmaSilenzio();
    mostraStatoVoce('<span class="provvisorio">' + esc((bufferAvanti ? bufferAvanti + ' ' : '') + testo) + '…</span>');
  }

  /* Prepara il motore; la prima volta chiede di scaricare il modello. Restituisce true se è pronto. */
  function preparaVoce() {
    if (statoVoce === 'pronto' || statoVoce === 'ascolto') return Promise.resolve(true);
    if (statoVoce === 'caricamento') return Promise.resolve(false);
    return Voce.modelloScaricato().then(function (gia) {
      return gia ? true : chiedi('Scaricare il riconoscimento vocale?\nCirca 50 MB, una volta sola: poi resta in questo dispositivo.', 'Scarica');
    }).then(function (si) {
      if (!si) return false;
      motore = motore || Voce.creaMotore();
      statoVoce = 'caricamento'; aggiornaPulsanteVoce();
      return motore.prepara(function (testo, frazione) {
        mostraStatoVoce('<span class="info">' + esc(testo) + '</span>' +
          (frazione !== undefined ? '<progress max="1" value="' + frazione + '"></progress>' : ''));
      }).then(function () {
        statoVoce = 'pronto'; aggiornaPulsanteVoce();
        mostraStatoVoce('<span class="info">Riconoscimento pronto.</span>');
        return true;
      }, function (e) {
        statoVoce = 'spento'; aggiornaPulsanteVoce();
        mostraStatoVoce('<span class="non-capito">Riconoscimento non disponibile: ' + esc(e && e.message || e) + '</span>');
        return false;
      });
    });
  }

  function erroreMicrofono(e) {
    statoVoce = 'pronto'; ascoltoContinuo = false; tastoPremuto = false; aggiornaPulsanteVoce();
    mostraStatoVoce('<span class="non-capito">' + (e && e.name === 'NotAllowedError'
      ? 'Microfono non permesso: consentilo nelle impostazioni del sito.'
      : 'Microfono non disponibile: ' + esc(e && e.message || e)) + '</span>');
  }

  /* Modo "tieni premuto". */
  function iniziaPremi() {
    if (tastoPremuto) return;
    tastoPremuto = true;
    nascondiTastiera();
    preparaVoce().then(function (pronto) {
      if (!pronto) { tastoPremuto = false; return; }
      if (!tastoPremuto) { mostraStatoVoce('<span class="info">Pronto: tieni premuto 🎤 e parla.</span>'); return; }
      return motore.avvia({ onParziale: parziale, onRisultato: function () {} }).then(function () {
        statoVoce = 'ascolto'; aggiornaPulsanteVoce();
        if (!tastoPremuto) { tastoPremuto = true; finisciPremi(); return; }
        mostraStatoVoce('<span class="provvisorio">Parla…</span>');
      }, erroreMicrofono);
    });
  }
  function finisciPremi() {
    if (!tastoPremuto) return;
    tastoPremuto = false;
    if (statoVoce !== 'ascolto') return;
    motore.ferma().then(function (r) {
      statoVoce = 'pronto'; aggiornaPulsanteVoce();
      if (!avvisoLentezza && r.audioMs > 0 && r.ms > Math.max(1500, r.audioMs)) {
        avvisoLentezza = true;
        $('voce-ultimi').innerHTML = 'Riconoscimento lento: su Vanadium attiva "JavaScript JIT" per questo sito, nelle impostazioni del sito.';
      }
      if (!r.testo) { mostraStatoVoce('<span class="non-capito">Non ho sentito niente.</span>'); return; }
      appenaScritto = false;
      applicaAzioni(Dettato.interpreta(r.testo), true);
    });
  }

  /* Modo "più valori". */
  function avviaContinuo() {
    nascondiTastiera();
    preparaVoce().then(function (pronto) {
      if (!pronto) return;
      bufferAvanti = ''; appenaScritto = false;
      var p = cellaDestinazione();
      return motore.avvia({ onParziale: parziale, onRisultato: risultatoContinuo }).then(function () {
        ascoltoContinuo = true; statoVoce = 'ascolto'; aggiornaPulsanteVoce();
        vai(p.r, p.c);
        mostraStatoVoce('<span class="info">Ascolto: detta i valori, a partire da ' + nomeCella(p) + '.</span>');
        riarmaSilenzio();
      }, erroreMicrofono);
    });
  }
  function fermaContinuo(messaggio) {
    if (!ascoltoContinuo) return;
    ascoltoContinuo = false;
    clearTimeout(timerSilenzio);
    motore.ferma().then(function (r) {
      statoVoce = 'pronto'; aggiornaPulsanteVoce();
      if (r.testo) risultatoContinuo(r.testo);
      clearTimeout(timerSilenzio);
      if (bufferAvanti) { applicaAzioni(Dettato.interpreta(bufferAvanti), false); bufferAvanti = ''; }
      if (messaggio) mostraStatoVoce('<span class="info">' + esc(messaggio) + '</span>');
      motore.chiudiMicrofono();
      aggiornaBarraMobile();
    });
  }

  function premiVoce() {
    if (stato.voceModo === 'continuo') {
      if (ascoltoContinuo) fermaContinuo('Dettatura finita.');
      else if (statoVoce !== 'caricamento') avviaContinuo();
    } else iniziaPremi();
  }

  function collegaVoce() {
    if (!Voce.disponibile()) return;
    $('voce').hidden = false;
    $('mob-voce').hidden = false;
    [$('btn-voce'), $('mob-voce')].forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); // il cursore resta nella casella
        if (e.button > 0) return;
        try { b.setPointerCapture(e.pointerId); } catch (x) {}
        premiVoce();
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        b.addEventListener(ev, function () { if (stato.voceModo === 'premi') finisciPremi(); });
      });
      b.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false }); // niente click fantasma
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      b.addEventListener('keydown', function (e) {
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); premiVoce(); }
      });
      b.addEventListener('keyup', function (e) {
        if ((e.key === ' ' || e.key === 'Enter') && stato.voceModo === 'premi') { e.preventDefault(); finisciPremi(); }
      });
    });
    $('voce-modo').addEventListener('change', function () {
      if (ascoltoContinuo) fermaContinuo('');
      stato.voceModo = this.value; aggiornaPulsanteVoce(); salva();
    });
    $('voce-separatore').addEventListener('change', function () { stato.voceSeparatore = this.value; salva(); });
    /* barra spaziatrice tenuta premuta nella tabella (modo "tieni premuto", sul PC) */
    $('corpo-tabella').addEventListener('keydown', function (e) {
      if (e.key === ' ' && stato.voceModo === 'premi') { e.preventDefault(); if (!e.repeat) iniziaPremi(); }
    });
    $('corpo-tabella').addEventListener('keyup', function (e) {
      if (e.key === ' ' && stato.voceModo === 'premi') { e.preventDefault(); finisciPremi(); }
    });
    /* toccando una casella si torna a scrivere a mano: la tastiera si riapre */
    $('corpo-tabella').addEventListener('pointerdown', function () {
      if (tastieraNascosta && !ascoltoContinuo) { tastieraNascosta = false; aggiornaModoInput(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden') return;
      if (ascoltoContinuo) fermaContinuo('Fermata: la pagina è andata in secondo piano.');
      else if (tastoPremuto) finisciPremi();
      else if (motore) motore.chiudiMicrofono();
    });
    $('voce-modo').value = stato.voceModo;
    $('voce-separatore').value = stato.voceSeparatore;
    aggiornaPulsanteVoce();
  }

  /* ---------- eventi ---------- */
  function collega() {
    var corpo = $('corpo-tabella');

    corpo.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.dataset || t.dataset.r === undefined) return;
      stato.righe[+t.dataset.r][+t.dataset.c] = t.value;
      aggiorna();
    });

    corpo.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t.dataset.r === undefined) return;
      var r = +t.dataset.r, c = +t.dataset.c;
      if (e.key === 'Enter') {
        e.preventDefault(); avanti(r, c);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault(); vai(Math.min(r + 1, stato.righe.length - 1), c);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); vai(Math.max(r - 1, 0), c);
      }
    });

    corpo.addEventListener('focusin', function (e) {
      if (e.target.dataset && e.target.dataset.r !== undefined) {
        cellaAttiva = { r: +e.target.dataset.r, c: +e.target.dataset.c };
        e.target.select();
        aggiornaBarraMobile();
      }
    });
    corpo.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!(a && a.dataset && a.dataset.r !== undefined && corpo.contains(a))) { cellaAttiva = null; aggiornaBarraMobile(); }
      }, 0);
    });

    corpo.addEventListener('paste', function (e) {
      var t = e.target;
      if (t.dataset.r === undefined) return;
      var testo = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n\r]/.test(testo)) return; // incolla normale
      e.preventDefault();
      incolla(+t.dataset.r, +t.dataset.c, testo);
    });

    /* I pulsanti della barra non devono togliere il fuoco alla casella (la tastiera resta aperta). */
    ['mob-indietro', 'mob-segno', 'mob-avanti'].forEach(function (id) {
      $(id).addEventListener('pointerdown', function (e) { e.preventDefault(); });
      $(id).addEventListener('mousedown', function (e) { e.preventDefault(); });
    });
    $('mob-avanti').addEventListener('click', function () { if (cellaAttiva) avanti(cellaAttiva.r, cellaAttiva.c); });
    $('mob-indietro').addEventListener('click', function () { if (cellaAttiva) indietro(cellaAttiva.r, cellaAttiva.c); });
    $('mob-segno').addEventListener('click', function () { if (cellaAttiva) cambiaSegno(cellaAttiva.r, cellaAttiva.c); });

    $('riepilogo').addEventListener('click', function (e) {
      var a = e.target.closest('[data-vai]');
      if (!a) return;
      e.preventDefault();
      var p = a.dataset.vai.split(',');
      vai(+p[0], +p[1]);
    });

    document.querySelectorAll('input[name=modo]').forEach(function (r) {
      r.addEventListener('change', function () { stato.modo = r.value; costruisciTabella(); aggiorna(); });
    });
    $('dec-ang').addEventListener('change', function () { stato.decAng = intero(this.value, 0, 6, 2); this.value = stato.decAng; aggiorna(); });
    $('dec-alt').addEventListener('change', function () { stato.decAlt = intero(this.value, 0, 6, 2); this.value = stato.decAlt; aggiorna(); });
    $('num-righe').addEventListener('change', function () { impostaRighe(this.value, true); });
    $('btn-aggiungi').addEventListener('click', function () {
      impostaRighe(stato.righe.length + 1, false).then(function () { vai(stato.righe.length - 1, 0); });
    });
    $('btn-togli').addEventListener('click', function () { impostaRighe(stato.righe.length - 1, true); });
    $('btn-svuota').addEventListener('click', function () {
      chiedi('Cancellare tutti i valori della tabella?\nLe impostazioni restano.', 'Svuota').then(function (si) {
        if (!si) return;
        stato.righe = stato.righe.map(function () { return ['', '']; });
        stato.blocco = 0;
        stato.lettura = 0;
        avvisoIncolla = '';
        $('prova').value = '';
        costruisciTabella();
        aggiorna();
      });
    });

    $('btn-tema').addEventListener('click', function () {
      stato.tema = stato.tema === 'chiaro' ? 'scuro' : 'chiaro';
      applicaTema();
      salva();
    });

    document.querySelectorAll('.schede button').forEach(function (b) {
      b.addEventListener('click', function () { stato.scheda = b.dataset.scheda; mostraScheda(); salva(); });
    });
    /* La stampa funziona solo aprendo il file dal PC (nella pagina pubblicata è bloccata). */
    if (location.protocol === 'file:') $('btn-stampa').hidden = false;
    $('btn-stampa').addEventListener('click', function () { window.print(); });

    [['ch-rit-car', 'chRitCar', 1, 1000, 30], ['ch-rit-inv', 'chRitInv', 0, 5000, 200], ['ch-coppie', 'chCoppie', 0, 500, 0]].forEach(function (x) {
      $(x[0]).addEventListener('change', function () {
        stato[x[1]] = intero(this.value, x[2], x[3], x[4]);
        this.value = stato[x[1]];
        chEsitoFisso = false;
        mostraChiavetta();
        salva();
      });
    });
    $('btn-ch-bt').addEventListener('click', function () { inviaChiavetta('bluetooth'); });
    $('btn-ch-usb').addEventListener('click', function () { inviaChiavetta('cavo'); });
    $('btn-ch-genera').addEventListener('click', generaCodice);
    $('btn-ch-codice').addEventListener('click', function () { impostaCodice(false); });
    $('btn-ch-spegni').addEventListener('click', function () { impostaCodice(true); });
    $('ch-codice').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); });

    $('coppie-blocco').addEventListener('change', function () {
      var primaCoppia = blocchi[stato.blocco] ? blocchi[stato.blocco].primaCoppia : 1;
      stato.coppieBlocco = intero(this.value, 1, 100, 10);
      stato.blocco = Math.floor((primaCoppia - 1) / stato.coppieBlocco);
      aggiorna();
    });
    $('invio-finale').addEventListener('change', function () { stato.invioFinale = this.checked; aggiorna(); });

    /* lettura uno alla volta */
    $('btn-lettura').addEventListener('click', apriLettura);
    $('lettura-chiudi').addEventListener('click', chiudiLettura);
    $('lettura-prec').addEventListener('click', function () { spostaLettura(-1); });
    $('lettura-succ').addEventListener('click', function () { spostaLettura(1); });
    $('lettura').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); spostaLettura(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); spostaLettura(-1); }
      else if (e.key === 'Escape') chiudiLettura();
    });
    var inizioTocco = null;
    $('lettura').addEventListener('touchstart', function (e) {
      inizioTocco = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    }, { passive: true });
    $('lettura').addEventListener('touchend', function (e) {
      if (!inizioTocco) return;
      var t = e.changedTouches[0], dx = t.clientX - inizioTocco.x, dy = t.clientY - inizioTocco.y;
      inizioTocco = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) spostaLettura(dx < 0 ? 1 : -1);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && !$('lettura').hidden) tieniAcceso();
    });

    var timerRidim = null;
    window.addEventListener('resize', function () {
      clearTimeout(timerRidim);
      timerRidim = setTimeout(function () {
        mostraBarre(); mostraQR(); aggiornaBarraMobile();
        if (!$('lettura').hidden) mostraLettura();
      }, 150);
    });

    $('confronto').addEventListener('change', function () { stato.confronto = this.value; valutaProva(); salva(); });
    var prova = $('prova');
    prova.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') { // il lettore potrebbe inviare TAB: lo teniamo nella casella per segnalarlo
        e.preventDefault();
        var s = prova.selectionStart;
        prova.value = prova.value.slice(0, s) + '\t' + prova.value.slice(prova.selectionEnd);
        prova.selectionStart = prova.selectionEnd = s + 1;
        valutaProva();
      }
    });
    prova.addEventListener('input', valutaProva);
    $('btn-svuota-prova').addEventListener('click', function () { prova.value = ''; valutaProva(); prova.focus(); });
  }

  function applicaImpostazioni() {
    document.querySelectorAll('input[name=modo]').forEach(function (r) { r.checked = r.value === stato.modo; });
    $('dec-ang').value = stato.decAng;
    $('dec-alt').value = stato.decAlt;
    var sel = $('coppie-blocco');
    if (!Array.prototype.some.call(sel.options, function (o) { return +o.value === stato.coppieBlocco; })) {
      var o = document.createElement('option'); o.value = o.textContent = stato.coppieBlocco; sel.appendChild(o);
    }
    sel.value = String(stato.coppieBlocco);
    $('invio-finale').checked = !!stato.invioFinale;
    $('ch-rit-car').value = stato.chRitCar;
    $('ch-rit-inv').value = stato.chRitInv;
    $('ch-coppie').value = stato.chCoppie;
    applicaTema();
  }

  carica();
  applicaImpostazioni();
  costruisciTabella();
  collega();
  collegaVoce();
  aggiorna();
  mostraScheda();
})();
