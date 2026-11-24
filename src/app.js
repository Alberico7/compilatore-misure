(function () {
  'use strict';

  var CHIAVE = 'compilatore-misure-v1';
  var CHIAVE_LISTE = 'compilatore-misure-liste-v1';   // liste salvate con un nome
  var MAX_RIGHE = 500;
  var MAX_AGGIUNTA = 10;    // caratteri dell'aggiunta per l'affilatura in testa (uguale al maxlength della casella)
  var RIGHE_INIZIALI = 5;   // le altre si aggiungono da sole: rigaVuotaInFondo(), e INVIO / Avanti sull'ultima casella

  /* La chiavetta si carica via Bluetooth o cavo: senza nessuno dei due (Firefox, iPhone) si parte dai codici */
  function schedaPredefinita() {
    return (navigator.bluetooth || navigator.usb) ? 'chiavetta' : 'barre';
  }

  function statoIniziale() {
    var righe = [];
    for (var i = 0; i < RIGHE_INIZIALI; i++) righe.push(['', '']);
    return {
      modo: 'separatore', decGra: 0, decDat: 1, righe: righe,
      coppieBlocco: 10, invioFinale: false, scheda: schedaPredefinita(), blocco: 0, confronto: 'tutti',
      tema: 'scuro', lettura: 0, voceModo: 'premi', voceSeparatore: 'pausa', vocePrepara: false,
      chRitCar: 30, chRitInv: 30, chCoppie: 0, chMezzo: 'bluetooth',
      listaNome: '',     // lista salvata aperta nella tabella ('' = nessuna)
      programma: '',     // nome del programma scritto sopra la tabella (docs/2026-11-23-casella-nome-programma.md)
      aggiuntaTesta: '.t',  // aggiunta al nome per l'affilatura in testa, '' = niente secondo codice (docs/2026-11-24-aggiunta-affilatura-impostabile.md)
      impAperte: false,  // riquadro delle impostazioni chiuso, anche al primo uso (docs/2026-11-23-righe-automatiche.md)
      schedaChiavetta: true,  // segno: lo spostamento una tantum sulla Chiavetta è già fatto
      pausaInvio30: true,     // segno: il passaggio una tantum da 200 a 30 ms dopo INVIO è già fatto
      decimali01: true,       // segno: il passaggio una tantum ai decimali 0 / 1 è già fatto
      preparaSpenta: true     // segno: la preparazione della dettatura all'apertura è già stata spenta una volta
    };
  }

  /* docs/2026-11-23-gradi-e-dati.md: impostazioni, liste e file salvati prima hanno i nomi vecchi
     (decAng, decAlt). Si leggono e si passano ai nomi nuovi. */
  function nomiNuovi(o) {
    if (!o || typeof o !== 'object') return o;
    if (o.decGra === undefined && o.decAng !== undefined) o.decGra = o.decAng;
    if (o.decDat === undefined && o.decAlt !== undefined) o.decDat = o.decAlt;
    delete o.decAng; delete o.decAlt;
    return o;
  }

  var stato = statoIniziale();
  var salvataggioOk = true;
  var analisi = null, blocchi = [];
  var avvisoTabella = '';
  /* scheda Chiavetta (app-chiavetta.js) */
  var chiavetta = AppChiavetta.crea({
    stato: function () { return stato; }, analisi: function () { return analisi; },
    salva: salva, chiedi: chiedi, $: $, esc: esc, intero: intero
  });

  /* ---------- salvataggio ---------- */
  function carica() {
    try {
      var s = nomiNuovi(JSON.parse(localStorage.getItem(CHIAVE) || 'null'));
      if (s && Array.isArray(s.righe)) {
        var base = statoIniziale();
        Object.keys(base).forEach(function (k) { if (s[k] !== undefined) base[k] = s[k]; });
        base.righe = s.righe.slice(0, MAX_RIGHE).map(function (r) { return [String(r[0] || ''), String(r[1] || '')]; });
        if (!base.righe.length) base.righe.push(['', '']);
        /* docs/2026-11-14-chiavetta-predefinita.md: una volta sola tutti passano alla scheda predefinita
           (prima era "Codici a barre"); poi si ricorda la scelta */
        if (s.schedaChiavetta === undefined) base.scheda = schedaPredefinita();
        /* docs/2026-11-22-pausa-invio-30ms.md: una volta sola, chi ha ancora i 200 ms di prima passa a 30 */
        if (s.pausaInvio30 === undefined && s.chRitInv === 200) base.chRitInv = 30;
        /* docs/2026-11-23-dettatura-non-preparata.md: il modello vocale all'apertura occupa troppa memoria sul
           telefono; una volta sola si spegne per tutti, poi si ricorda la scelta */
        if (s.preparaSpenta === undefined) base.vocePrepara = false;
        /* docs/2026-11-23-casella-nome-programma.md: chi aveva una lista aperta trova il suo nome nella casella */
        if (s.programma === undefined) base.programma = s.listaNome;
        base.programma = typeof base.programma === 'string' ? base.programma : '';
        base.aggiuntaTesta = typeof base.aggiuntaTesta === 'string' ? base.aggiuntaTesta.slice(0, MAX_AGGIUNTA) : '.t';
        /* docs/2026-11-23-gradi-e-dati.md: una volta sola, con i 2 / 2 di prima e la tabella vuota, si passa
           a 0 / 1 come in macchina. Con dei valori scritti restano: cambiarli cambierebbe quello che si scrive. */
        var vuota = base.righe.every(function (r) { return !r[0].trim() && !r[1].trim(); });
        if (s.decimali01 === undefined && base.decGra === 2 && base.decDat === 2 && vuota) { base.decGra = 0; base.decDat = 1; }
        stato = base;
      }
    } catch (e) { salvataggioOk = false; }
  }
  function salva() {
    clearTimeout(timerSalva); timerSalva = null;
    try { localStorage.setItem(CHIAVE, JSON.stringify(stato)); salvataggioOk = true; }
    catch (e) { salvataggioOk = false; }
    $('stato-salvataggio').textContent = salvataggioOk ? 'Salvataggio automatico.' : 'Attenzione: salvataggio automatico non disponibile in questo browser.';
  }
  /* docs/2026-11-23-dettatura-non-preparata.md: mentre si scrive si salva al massimo ogni mezzo secondo;
     quando la pagina si nasconde o si chiude si salva subito (salvaSeInAttesa). */
  var timerSalva = null;
  function salvaPresto() { if (!timerSalva) timerSalva = setTimeout(salva, 500); }
  function salvaSeInAttesa() { if (timerSalva) salva(); }

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
  function cella(r, c) { return document.getElementById('cella-' + r + '-' + c); }
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
    var b = $('btn-tema'), etichetta = 'Passa al ' + (stato.tema === 'chiaro' ? 'tema scuro' : 'tema chiaro');
    b.textContent = stato.tema === 'chiaro' ? '☾' : '☀';
    b.setAttribute('aria-pressed', String(stato.tema === 'chiaro'));
    b.setAttribute('aria-label', etichetta);
    b.title = etichetta;
  }

  /* ---------- tabella ---------- */
  /* Tastiera del telefono (docs/2026-11-22-barra-telefono-e-tastiera.md): con inputmode "none" non si apre.
     Sul telefono si parte così: un tocco sceglie la casella, un secondo tocco sulla stessa apre la tastiera.
     Mentre si detta resta chiusa. */
  var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  var tastieraNascosta = touch;
  function modoInput() { return tastieraNascosta ? 'none' : (stato.modo === 'macchina' ? 'numeric' : 'decimal'); }
  function aggiornaModoInput() {
    document.querySelectorAll('#corpo-tabella input').forEach(function (el) { el.setAttribute('inputmode', modoInput()); });
  }

  function htmlRiga(i, tipoInput) {
    return '<tr><td class="n">' + (i + 1) + '</td>' +
      [0, 1].map(function (c) {
        var nome = (c === 0 ? 'Grado ' : 'Dato ') + (i + 1);
        return '<td><input type="text" inputmode="' + tipoInput + '" enterkeyhint="next" autocomplete="off" spellcheck="false" data-r="' + i + '" data-c="' + c +
          '" id="cella-' + i + '-' + c + '" aria-label="' + nome + '" value="' + esc(stato.righe[i][c]) + '"><div class="anteprima" id="ant-' + i + '-' + c + '"></div></td>';
      }).join('') + '</tr>';
  }
  function costruisciTabella() {
    var tipoInput = modoInput();
    var html = [];
    for (var i = 0; i < stato.righe.length; i++) html.push(htmlRiga(i, tipoInput));
    $('corpo-tabella').innerHTML = html.join('');
    riepilogoImpostazioni();
  }

  /* docs/2026-11-23-righe-automatiche.md: quando l'ultima riga ha grado e dato, sotto ne compare una vuota.
     Si aggiunge in fondo alla tabella senza ridisegnarla: chi sta scrivendo non perde il cursore. */
  function rigaVuotaInFondo() {
    var n = stato.righe.length, ultima = stato.righe[n - 1];
    if (n >= MAX_RIGHE || !ultima || !ultima[0].trim() || !ultima[1].trim()) return;
    stato.righe.push(['', '']);
    var corpo = $('corpo-tabella');
    if (corpo.rows.length === n) corpo.insertAdjacentHTML('beforeend', htmlRiga(n, modoInput()));
    else costruisciTabella();
  }

  /* Riga sempre visibile del riquadro delle impostazioni. */
  function riepilogoImpostazioni() {
    $('imp-riepilogo').textContent = (stato.modo === 'macchina' ? 'Come in macchina' : 'Con separatore') +
      ' · decimali ' + stato.decGra + ' / ' + stato.decDat;
  }

  /* Decimali dei gradi (col 0) o dei dati (col 1) cambiati: le caselle di quella colonna tengono
     lo stesso valore, accorciato se servono meno decimali (docs/2026-11-22-cambio-decimali.md). */
  function cambiaDecimali(col, campo) {
    var chiave = col === 0 ? 'decGra' : 'decDat';
    var prima = stato[chiave], dopo = intero(campo.value, 0, 6, 2);
    campo.value = dopo;
    if (dopo === prima) return;
    stato[chiave] = dopo;
    var n = 0;
    stato.righe.forEach(function (r) {
      var t = Logica.cambiaDecimali(r[col], stato.modo, prima, dopo);
      if (t !== r[col]) { r[col] = t; n++; }
    });
    avvisoTabella = '';
    if (n) {
      avvisoTabella = 'Decimali ' + (col === 0 ? 'gradi' : 'dati') + ': ' + dopo + '. ' +
        (dopo < prima ? (n === 1 ? 'Accorciato 1 valore.' : 'Accorciati ' + n + ' valori.')
          : (n === 1 ? 'Aggiunto lo zero in fondo a 1 valore.' : 'Aggiunti gli zeri in fondo a ' + n + ' valori.'));
      costruisciTabella();
    }
    aggiorna();
  }

  /* Come INVIO in macchina: grado -> dato -> grado della riga dopo (aggiunge una riga all'ultima). */
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
  /* Dopo ogni modifica dei valori. inScrittura: un tasto in una casella. Allora la sezione 2 si ridisegna
     dopo una pausa e il salvataggio si raggruppa (docs/2026-11-23-dettatura-non-preparata.md); tabella,
     anteprime, errori e riepilogo restano immediati. */
  function aggiorna(inScrittura) {
    rigaVuotaInFondo();
    var usate = righeUsate();
    var imp = { modo: stato.modo, decGra: stato.decGra, decDat: stato.decDat };
    analisi = Logica.analizza(usate, imp);
    blocchi = analisi.valido ? Logica.blocchiQR(analisi.valori, stato.coppieBlocco, stato.invioFinale) : [];
    var segni = segniAvvisi();

    for (var i = 0; i < stato.righe.length; i++) {
      for (var c = 0; c < 2; c++) {
        var inp = cella(i, c), ant = $('ant-' + i + '-' + c);
        if (!inp) continue;
        var r = i < usate.length ? analisi.celle[i][c] : null;
        var tipo = '', html = '';
        if (r && r.stato !== 'ok') { tipo = 'errore'; html = esc(r.messaggio); }
        else if (r) {
          var note = segni[i + ',' + c];
          if (note) tipo = 'avviso';
          html = 'In macchina: <b>' + esc(r.display) + '</b>' + (note ? ' · ' + esc(note.join(' · ')) : '');
        }
        // si tocca la pagina solo se l'anteprima è cambiata: con 500 righe, a ogni tasto cambia quasi solo una casella
        var chiave = tipo + '|' + html;
        if (ant.dataset.k === chiave) continue;
        ant.dataset.k = chiave;
        inp.classList.toggle('errore', tipo === 'errore');
        inp.classList.toggle('avviso', tipo === 'avviso');
        ant.className = tipo ? 'anteprima ' + tipo : 'anteprima';
        ant.innerHTML = html;
      }
    }
    aggiornaProgramma();
    if (!$('verifica').hidden) mostraVerifica();
    mostraRiepilogo(usate.length);
    riepilogoImpostazioni();
    sezione2(!inScrittura);
    aggiornaConfronto();
    if (!$('lettura').hidden) mostraLettura();
    if (inScrittura) salvaPresto(); else salva();
  }

  /* Sezione 2: si disegna solo la scheda aperta; le altre si segnano da ridisegnare e si disegnano
     quando si aprono. Mentre si scrive, la scheda aperta si ridisegna un terzo di secondo dopo l'ultimo tasto.
     Invia, Controlla e Leggi uno alla volta leggono i valori dalla tabella (analisi), sempre aggiornata. */
  var daDisegnare = { barre: true, qr: true, chiavetta: true }, timerSezione2 = null;
  function sezione2(subito) {
    daDisegnare.barre = daDisegnare.qr = daDisegnare.chiavetta = true;
    clearTimeout(timerSezione2);
    if (subito) disegnaSchedaAperta();
    else timerSezione2 = setTimeout(disegnaSchedaAperta, 333);
  }
  function disegnaSchedaAperta() {
    clearTimeout(timerSezione2); timerSezione2 = null;
    var s = stato.scheda;
    if (!daDisegnare[s]) return;
    daDisegnare[s] = false;
    if (s === 'barre') mostraBarre();
    else if (s === 'qr') mostraQR();
    else chiavetta.aggiorna();
  }

  /* Note brevi degli avvisi per casella: { "riga,col": ["oltre 360!", ...] }. La coppia uguale segna tutte e due le caselle. */
  var NOTE_AVVISI = { negativo: 'negativo!', grado360: 'oltre 360!', dato: 'molto diverso dai vicini!', uguale: 'uguale alla coppia sopra!' };
  function segniAvvisi() {
    var segni = {};
    analisi.avvisi.forEach(function (a) {
      (a.tipo === 'uguale' ? [0, 1] : [a.col]).forEach(function (c) {
        var k = a.riga + ',' + c;
        (segni[k] = segni[k] || []).push(NOTE_AVVISI[a.tipo] || a.testo);
      });
    });
    return segni;
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
    if (avvisoTabella) h += '<div class="messaggio avviso">' + esc(avvisoTabella) + '</div>';
    if (nUsate === 0) {
      h += '<div class="messaggio avviso">Inserisci almeno una coppia Grado/Dato.</div>';
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
    var negativi = analisi.avvisi.filter(function (a) { return a.tipo === 'negativo'; });
    var sospetti = analisi.avvisi.filter(function (a) { return a.tipo !== 'negativo'; });
    if (nUsate > 0 && sospetti.length) {
      h += '<div class="messaggio avviso" id="da-controllare"><b>Da controllare:</b> potrebbero essere errori di battitura. I codici si generano lo stesso.' +
        listaMessaggi(sospetti, 8) + '</div>';
    }
    if (nUsate > 0 && negativi.length) {
      h += '<div class="messaggio avviso"><b>Valori negativi:</b> non sappiamo ancora se la maschera accetta il segno meno. Verificalo in macchina.' +
        listaMessaggi(negativi, 8) + '</div>';
    }
    if (analisi.valido) {
      h += '<div class="pulsanti azioni-riepilogo"><button type="button" id="btn-verifica">Confronta con la macchina</button></div>';
    }
    $('riepilogo').innerHTML = h;
  }

  /* ---------- uscite ---------- */
  function messaggioNonPronto() {
    return '<div class="vuoto-codici">Correggi i valori nella sezione 1: i codici compaiono quando tutti i valori sono corretti.</div>';
  }

  function etichetta(v) {
    return '<span class="' + (v.tipo === 'Grado' ? 'tipo-gra' : 'tipo-dat') + '">' + v.tipo + '</span> ' + v.coppia;
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
    var uscita = $('uscita-qr');
    if (!analisi.valido) { uscita.innerHTML = messaggioNonPronto(); uscita.dataset.html = ''; return; }
    stato.blocco = Math.min(Math.max(0, stato.blocco), blocchi.length - 1);
    var b = blocchi[stato.blocco];
    var righe = [];
    for (var i = 0; i < b.valori.length; i += 2) {
      var a = b.valori[i], h2 = b.valori[i + 1];
      righe.push('<tr><td>' + a.coppia + '</td><td>' + esc(a.display) + '</td><td>' + (h2 ? esc(h2.display) : '') + '</td></tr>');
    }
    var grezzo = b.testo.split(Logica.CR).map(esc).join('<b>⏎</b>');
    var html =
      '<div class="navigazione">' +
      '<button type="button" id="qr-prec"' + (stato.blocco === 0 ? ' disabled' : '') + '>◀ Precedente</button>' +
      '<span class="stato" id="qr-stato">Blocco ' + (stato.blocco + 1) + ' di ' + blocchi.length + '</span>' +
      '<button type="button" id="qr-succ"' + (stato.blocco === blocchi.length - 1 ? ' disabled' : '') + '>Successivo ▶</button></div>' +
      '<div class="info-blocco">Prima di leggere, in macchina mettiti sul campo <b>' + esc(b.iniziaCon) + '</b>. ' +
      'Questo blocco contiene le coppie da <b>' + b.primaCoppia + '</b> a <b>' + b.ultimaCoppia + '</b>.</div>' +
      '<div class="area-qr"><div class="cornice" id="qr-codice">' + Logica.qrSvg(qrcode, b.testo, latoQR()) + '</div></div>' +
      '<div class="contenuto-qr"><table><thead><tr><th>Coppia</th><th>Grado</th><th>Dato</th></tr></thead><tbody>' + righe.join('') + '</tbody></table>' +
      '<div class="grezzo" title="Contenuto del QR: ⏎ = INVIO">' + grezzo + '</div></div>';
    /* ridisegna solo se cambia (il ridimensionamento della finestra lo richiama anche senza modifiche) */
    if (uscita.dataset.html === html) return;
    uscita.innerHTML = html;
    uscita.dataset.html = html;
    $('qr-prec').onclick = function () { stato.blocco--; mostraQR(); salva(); };
    $('qr-succ').onclick = function () { stato.blocco++; mostraQR(); salva(); };
  }

  function mostraScheda() {
    ['barre', 'qr', 'chiavetta'].forEach(function (s) {
      $('tab-' + s).setAttribute('aria-selected', String(stato.scheda === s));
      $('pannello-' + s).hidden = stato.scheda !== s;
    });
    // i codici a barre possono essere un migliaio: chiusa la scheda si tolgono, e si ridisegnano quando si riapre
    if (stato.scheda !== 'barre' && $('uscita-barre').firstChild) { $('uscita-barre').innerHTML = ''; daDisegnare.barre = true; }
    disegnaSchedaAperta();   // la scheda appena aperta, se è rimasta indietro
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
    var html =
      '<div class="etichetta" id="lettura-etichetta">' + etichetta(v) + '</div>' +
      '<div class="cornice" id="lettura-codice">' + Logica.code128Svg(v.cifre, moduloBarre(v.cifre, larg, 6), alt) + '</div>' +
      '<div class="valore">' + (v.cifre.charAt(0) === '-' ? '⚠ ' : '') + esc(v.display) + '</div>' +
      '<div class="cifre">cifre: ' + esc(v.cifre) + '</div>';
    // solo se cambia: ridisegnare lo stesso codice mentre il lettore lo inquadra lo fa sfarfallare
    if (centro.dataset.html !== html) { centro.innerHTML = html; centro.dataset.html = html; }
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

  /* ---------- confronta con la macchina (docs/2026-11-18-offline-liste-avvisi.md) ---------- */
  /* Spunte delle coppie controllate: restano finché i valori non cambiano ("firma" = cifre di tutti i valori). */
  var spunte = { firma: '', fatte: {} };
  function firmaValori() { return analisi.valido ? analisi.valori.map(function (v) { return v.cifre; }).join(' ') : ''; }
  function apriVerifica() {
    if (!analisi.valido) return;
    $('verifica').hidden = false;
    document.body.style.overflow = 'hidden';
    tieniAcceso();
    mostraVerifica();
    $('verifica-chiudi').focus();
  }
  function chiudiVerifica() {
    $('verifica').hidden = true;
    document.body.style.overflow = '';
    if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
    var b = $('btn-verifica');
    if (b) b.focus();
  }
  function mostraVerifica() {
    if (!analisi.valido) { chiudiVerifica(); return; }
    var firma = firmaValori();
    if (firma !== spunte.firma) spunte = { firma: firma, fatte: {} };
    var segni = segniAvvisi(), n = analisi.celle.length, fatte = 0, h = [];
    for (var i = 0; i < n; i++) {
      var note = (segni[i + ',0'] || []).concat(segni[i + ',1'] || []).filter(function (x, k, a) { return a.indexOf(x) === k; });
      var si = !!spunte.fatte[i];
      if (si) fatte++;
      h.push('<li><button type="button" class="riga-verifica' + (note.length ? ' avviso' : '') + '" data-i="' + i + '" aria-pressed="' + si + '"' +
        ' aria-label="Coppia ' + (i + 1) + ': grado ' + esc(analisi.celle[i][0].display) + ', dato ' + esc(analisi.celle[i][1].display) + (note.length ? ', da controllare' : '') + '">' +
        '<span class="n">' + (i + 1) + '</span><span class="val">' + esc(analisi.celle[i][0].display) + '</span><span class="val">' + esc(analisi.celle[i][1].display) + '</span>' +
        '<span class="spunta" aria-hidden="true">' + (si ? '✓' : '') + '</span>' +
        (note.length ? '<span class="nota-avviso">⚠ ' + esc(note.join(' · ')) + '</span>' : '') + '</button></li>');
    }
    var elenco = $('verifica-elenco'), html = h.join('');
    if (elenco.dataset.html !== html) { elenco.innerHTML = html; elenco.dataset.html = html; }
    $('verifica-conto').textContent = fatte + ' di ' + n + (n === 1 ? ' controllata' : ' controllate');
  }

  /* ---------- liste salvate (docs/2026-11-18-offline-liste-avvisi.md) ---------- */
  /* In memoria, così "modifiche non salvate" non rilegge tutto a ogni tasto; un'altra scheda che salva la svuota. */
  var listeLette = null;
  /* Un'altra scheda ha cambiato le liste: se ha eliminato quella aperta, qui si chiude. */
  window.addEventListener('storage', function (e) {
    if (e.key !== CHIAVE_LISTE && e.key !== null) return;
    listeLette = null;
    if (stato.listaNome && trovaLista(leggiListe(), stato.listaNome) < 0) stato.listaNome = '';
    aggiornaProgramma();
  });
  function leggiListe() {
    if (!listeLette) {
      try {
        var l = JSON.parse(localStorage.getItem(CHIAVE_LISTE) || '[]');
        listeLette = Array.isArray(l) ? l.map(nomiNuovi).filter(listaValida) : [];
      } catch (e) { listeLette = []; }
    }
    return listeLette.slice();
  }
  function scriviListe(l) {
    try { localStorage.setItem(CHIAVE_LISTE, JSON.stringify(l)); listeLette = l.slice(); return true; }
    catch (e) { listeLette = null; esitoListe('errore', 'Non riesco a salvare le liste in questo browser (memoria piena o non disponibile).'); return false; }
  }
  function listaValida(l) {
    return l && typeof l.nome === 'string' && l.nome.trim() && Array.isArray(l.righe) && l.righe.length <= MAX_RIGHE &&
      l.righe.every(function (r) { return Array.isArray(r) && r.length === 2 && typeof r[0] === 'string' && typeof r[1] === 'string'; }) &&
      (l.modo === 'separatore' || l.modo === 'macchina') &&
      [l.decGra, l.decDat].every(function (d) { return d === (d | 0) && d >= 0 && d <= 6; });
  }
  /* Quello che si salva di una lista: coppie (senza righe vuote in fondo, senza spazi), modo e decimali. */
  function contenutoAttuale() {
    return {
      righe: righeUsate().map(function (r) { return [r[0].trim(), r[1].trim()]; }),
      modo: stato.modo, decGra: stato.decGra, decDat: stato.decDat
    };
  }
  function stessoContenuto(a, b) {
    return a.modo === b.modo && a.decGra === b.decGra && a.decDat === b.decDat && JSON.stringify(a.righe) === JSON.stringify(b.righe);
  }
  function trovaLista(liste, nome) {
    var k = nome.trim().toLowerCase();
    for (var i = 0; i < liste.length; i++) if (liste[i].nome.trim().toLowerCase() === k) return i;
    return -1;
  }
  function htmlMessaggio(tipo, testo) { return testo ? '<div class="messaggio ' + tipo + '">' + esc(testo) + '</div>' : ''; }
  function esitoListe(tipo, testo) { $('esito-liste').innerHTML = htmlMessaggio(tipo, testo); }
  function plurale(n, uno, tanti) { return n + ' ' + (n === 1 ? uno : tanti); }
  function dataBreve(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return '';
    function due(x) { return (x < 10 ? '0' : '') + x; }
    return due(d.getDate()) + '/' + due(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + due(d.getHours()) + ':' + due(d.getMinutes());
  }

  /* docs/2026-11-23-casella-nome-programma.md: dopo ogni modifica dei valori o del nome.
     Il pulsante Salva accanto al nome dice se la tabella è salvata con quel nome (✓ Salvata) o no (Salva);
     sotto il nome, il carattere che non va nel codice a barre; in cima alla sezione 2, i codici del nome. */
  var ICONA_SALVA = $('btn-salva').querySelector('svg').outerHTML;   // il disegno sta solo nel template
  var avvisoNome = '';
  function aggiornaProgramma() {
    var nome = stato.programma.trim(), c = contenutoAttuale();
    var liste = nome ? leggiListe() : [], i = nome ? trovaLista(liste, nome) : -1;
    var salvata = i >= 0 && c.righe.length > 0 && stessoContenuto(liste[i], c);
    var b = $('btn-salva'), etichetta = salvata ? 'Salvata' : 'Salva';
    if (b.getAttribute('aria-label') !== etichetta) {
      b.innerHTML = (salvata ? '<span aria-hidden="true">✓</span>' : ICONA_SALVA) + ' <span class="testo">' + etichetta + '</span>';
      b.setAttribute('aria-label', etichetta);
      b.title = etichetta;
    }
    b.disabled = salvata || !c.righe.length;
    b.classList.toggle('primario', !b.disabled);
    var v = nome ? Logica.testoPerCodice(nome) : { ok: true };
    var avviso = v.ok ? '' : htmlMessaggio('avviso', v.messaggio);
    if (avviso !== avvisoNome) $('avviso-programma').innerHTML = avvisoNome = avviso;   // aggiorna() gira a ogni tasto
    mostraNomeProgramma(nome, v);
  }
  function scriviProgramma(nome) {
    stato.programma = nome;
    $('programma').value = nome;
  }
  /* Esito di Salva: sotto il nome, o nel riquadro Liste se è aperto. */
  var tempoEsito = null;
  function esitoSalva(tipo, testo) {
    if ($('liste').hidden) {
      $('esito-programma').innerHTML = htmlMessaggio(tipo, testo);
      clearTimeout(tempoEsito);
      tempoEsito = setTimeout(function () { $('esito-programma').innerHTML = ''; }, 4000);
    } else esitoListe(tipo, testo);
  }

  /* docs/2026-11-23-codice-da-testo.md: in cima alla sezione 2, il codice a barre del nome della lista aperta
     (il nome del programma), da leggere in macchina nella pagina del caricatore. */
  /* aggiorna() gira a ogni tasto: i codici si ridisegnano solo se cambiano il nome o la larghezza.
     La larghezza si misura una volta e di nuovo quando cambia la finestra (misurarla a ogni tasto
     costringe il browser a ricalcolare l'impaginazione di tutta la tabella). */
  var nomeMostrato = null, largNome = 0;
  /* docs/2026-11-24-aggiunta-affilatura-impostabile.md: l'aggiunta per l'affilatura in testa */
  function aggiuntaValida(a) { return !!a && Logica.testoPerCodice(a).ok; }
  function aggiornaAggiunta() {
    var a = stato.aggiuntaTesta, v = a ? Logica.testoPerCodice(a) : { ok: true };
    $('aggiunta-riepilogo').innerHTML = 'Aggiunta per l\'affilatura in testa: ' + (a ? '<b>' + esc(a) + '</b>' : 'nessuna');
    $('avviso-aggiunta').innerHTML = v.ok ? '' : htmlMessaggio('avviso', v.messaggio + ' Finché non la correggi, il secondo codice non c\'è.');
  }
  function mostraNomeProgramma(nome, controllo) {
    var box = $('nome-programma');
    if (!largNome) largNome = Math.min(($('sez-codici').clientWidth || 600) - 40, 700);
    var agg = stato.aggiuntaTesta, larg = largNome, chiave = nome + '|' + agg + '|' + larg;
    if (chiave === nomeMostrato) return;
    nomeMostrato = chiave;
    if (!nome) {
      box.innerHTML = '<p class="nota">Scrivi il <b>nome del programma</b> sopra la tabella per avere il suo codice a barre.</p>';
      return;
    }
    function codice(titolo, testo, id) {
      return '<div class="codice-nome"><div class="titolo-nome">' + titolo + '</div>' +
        '<div class="cornice" id="' + id + '">' + Logica.code128Svg(testo, moduloBarre(testo, larg, 4), 70) + '</div>' +
        '<div class="valore-nome">' + esc(testo) + '</div></div>';
    }
    var c = controllo || Logica.testoPerCodice(nome);
    if (!c.ok) {
      box.innerHTML = '<div class="titolo-nome">Programma</div><div class="valore-nome">' + esc(nome) + '</div>' +
        '<div class="messaggio avviso">' + esc(c.messaggio) + ' Cambia il nome sopra la tabella.</div>';
      return;
    }
    /* docs/2026-11-23-secondo-codice-punto-t.md e docs/2026-11-24-aggiunta-affilatura-impostabile.md: anche il
       programma per l'affilatura in testa, nome + aggiunta (di solito ".t"). Niente secondo codice se l'aggiunta
       è vuota o non va bene (l'avviso è sotto la sua casella), o se il nome finisce già con l'aggiunta. */
    var h = codice('Programma', nome, 'codice-nome');
    var conT = aggiuntaValida(agg) && nome.slice(-agg.length).toLowerCase() !== agg.toLowerCase() ? nome + agg : '';
    if (conT) {
      // nome e aggiunta vanno bene, quindi insieme possono essere solo troppo lunghi
      h += conT.length <= Logica.MAX_TESTO_CODICE ? codice('Affilatura in testa', conT, 'codice-nome-t')
        : '<div class="codice-nome"><div class="titolo-nome">Affilatura in testa</div>' +
          htmlMessaggio('avviso', 'Con "' + agg + '" il nome ha ' + conT.length + ' caratteri: nel codice a barre ne stanno al massimo ' + Logica.MAX_TESTO_CODICE + '.') + '</div>';
    }
    h += '<p class="nota">In macchina, nella pagina del caricatore: ' +
      (conT ? 'cursore sul campo del programma o dell\'affilatura in testa, poi leggi il codice giusto.' : 'cursore sul campo del programma, poi leggi il codice.') +
      (Logica.segniDaProvare(conT || nome) ? ' Prova una volta che i segni escano giusti.' : '') + '</p>';
    box.innerHTML = h;
  }

  function mostraListe() {
    var liste = leggiListe(), cerca = $('lista-cerca');
    cerca.hidden = liste.length <= 8;
    var filtro = cerca.hidden ? '' : cerca.value.trim().toLowerCase();
    var visibili = liste.filter(function (l) { return !filtro || l.nome.toLowerCase().indexOf(filtro) >= 0; });
    var h = visibili.map(function (l) {
      var n = l.righe.length;
      var aperta = stato.listaNome && l.nome.toLowerCase() === stato.listaNome.toLowerCase();
      // un tocco sul nome apre la lista (docs/2026-11-23-apri-accanto-al-nome.md)
      return '<li><button type="button" class="info" data-apri="' + esc(l.nome) + '"><span class="nome">' + esc(l.nome) + (aperta ? ' <span class="aperta">· aperta</span>' : '') + '</span>' +
        '<span class="dettagli">' + plurale(n, 'coppia', 'coppie') + ' · ' + esc(dataBreve(l.salvata)) + '</span></button>' +
        '<button type="button" class="pericolo" data-elimina="' + esc(l.nome) + '">Elimina</button></li>';
    }).join('');
    if (!liste.length) h = '<li class="vuoto">Nessuna lista salvata. Scrivi il nome del programma e i valori, poi tocca Salva.</li>';
    else if (!visibili.length) h = '<li class="vuoto">Nessuna lista con questo nome.</li>';
    $('elenco-liste').innerHTML = h;
  }

  /* Riquadro per scrivere il nome. Ritorna una Promise<string|null>. */
  function chiediNome(testo, iniziale) {
    return new Promise(function (risolvi) {
      var velo = $('nome-lista'), campo = $('nome-lista-campo'), form = $('nome-lista-form');
      var prima = document.activeElement;
      $('nome-lista-testo').textContent = testo;
      campo.value = iniziale || '';
      velo.hidden = false;
      campo.focus(); campo.select();
      function fine(v) {
        velo.hidden = true;
        form.onsubmit = $('nome-lista-no').onclick = velo.onkeydown = null;
        if (prima && prima.focus) prima.focus();
        risolvi(v);
      }
      form.onsubmit = function (e) {
        e.preventDefault();
        var v = campo.value.trim();
        if (!v) { campo.focus(); return; }
        fine(v.slice(0, 60));
      };
      $('nome-lista-no').onclick = function () { fine(null); };
      velo.onkeydown = function (e) { if (e.key === 'Escape') fine(null); };
    });
  }

  function salvaCon(nome, chiediSeEsiste) {
    var c = contenutoAttuale();
    if (!c.righe.length) { esitoSalva('avviso', 'La tabella è vuota: non c\'è niente da salvare.'); return Promise.resolve(); }
    var liste = leggiListe(), i = trovaLista(liste, nome);
    var ok = i >= 0 && chiediSeEsiste
      ? chiedi('Esiste già una lista "' + liste[i].nome + '".\nSostituirla con i valori attuali?', 'Sostituisci')
      : Promise.resolve(true);
    return ok.then(function (si) {
      if (!si) return;
      liste = leggiListe(); i = trovaLista(liste, nome);
      if (i >= 0) { nome = liste[i].nome; liste.splice(i, 1); }
      liste.unshift({ nome: nome, righe: c.righe, modo: c.modo, decGra: c.decGra, decDat: c.decDat, salvata: new Date().toISOString() });
      if (!scriviListe(liste)) return;
      stato.listaNome = nome;
      scriviProgramma(nome);
      salva();
      esitoSalva('ok', 'Salvata "' + nome + '": ' + plurale(c.righe.length, 'coppia', 'coppie') + '.');
      mostraListe(); aggiornaProgramma();
    });
  }
  function chiudiListe() {
    $('liste').hidden = true;
    $('btn-apri').setAttribute('aria-expanded', 'false');
  }
  function salvaComeLista() {
    return chiediNome('Nome del programma (come in macchina)', stato.programma.trim() || stato.listaNome).then(function (nome) {
      if (nome) return salvaCon(nome, true);
    });
  }
  /* Salva con il nome scritto sopra la tabella, senza domande; chiede solo se il nome è vuoto
     o se c'è già un'altra lista con quel nome. */
  function salvaLista() {
    var nome = stato.programma.trim();
    if (!nome) return salvaComeLista();
    var aperta = stato.listaNome && stato.listaNome.toLowerCase() === nome.toLowerCase();
    return salvaCon(nome, !aperta);
  }

  function apriLista(nome) {
    var liste = leggiListe(), i = trovaLista(liste, nome);
    if (i < 0) { mostraListe(); return Promise.resolve(); }
    var l = liste[i], c = contenutoAttuale();
    var salvati = !c.righe.length || liste.some(function (x) { return stessoContenuto(x, c); });
    var ok = salvati ? Promise.resolve(true)
      : chiedi('Sostituire i valori attuali con la lista "' + l.nome + '"?\nI valori attuali non sono salvati in nessuna lista.', 'Sostituisci');
    return ok.then(function (si) {
      if (!si) return;
      stato.righe = l.righe.map(function (r) { return [r[0], r[1]]; });
      if (!stato.righe.length) stato.righe.push(['', '']);
      stato.modo = l.modo; stato.decGra = l.decGra; stato.decDat = l.decDat;
      stato.listaNome = l.nome;
      scriviProgramma(l.nome);
      stato.blocco = 0; stato.lettura = 0;
      avvisoTabella = '';
      applicaImpostazioni();
      costruisciTabella();
      aggiorna();
      chiudiListe();
      esitoSalva('ok', 'Aperta "' + l.nome + '": ' + plurale(l.righe.length, 'coppia', 'coppie') + '.');
      mostraListe();
    });
  }

  function eliminaLista(nome) {
    var liste = leggiListe(), i = trovaLista(liste, nome);
    if (i < 0) { mostraListe(); return Promise.resolve(); }
    return chiedi('Eliminare la lista "' + liste[i].nome + '"?\nI valori nella tabella restano.', 'Elimina').then(function (si) {
      if (!si) return;
      liste = leggiListe(); i = trovaLista(liste, nome);
      if (i < 0) return;
      var tolta = liste.splice(i, 1)[0];
      if (!scriviListe(liste)) return;
      if (stato.listaNome && stato.listaNome.toLowerCase() === tolta.nome.toLowerCase()) { stato.listaNome = ''; salva(); }
      esitoListe('ok', 'Eliminata "' + tolta.nome + '".');
      mostraListe(); aggiornaProgramma();
    });
  }

  function esportaListe() {
    var liste = leggiListe();
    if (!liste.length) { esitoListe('avviso', 'Non ci sono liste da esportare.'); return; }
    var dati = JSON.stringify({ formato: 'compilatore-misure-liste', versione: 1, liste: liste }, null, 1);
    var d = new Date(), due = function (x) { return (x < 10 ? '0' : '') + x; };
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dati], { type: 'application/json' }));
    a.download = 'liste-misure-' + d.getFullYear() + '-' + due(d.getMonth() + 1) + '-' + due(d.getDate()) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    esitoListe('ok', 'Esportate ' + plurale(liste.length, 'lista', 'liste') + ' nel file ' + a.download + '.');
  }

  /* Aggiunge le liste del file senza cancellare niente: le uguali si saltano, quelle con lo stesso nome
     ma coppie diverse prendono " (2)", " (3)"... */
  function importaListe(testo) {
    var dati;
    try { dati = JSON.parse(testo); } catch (e) { dati = null; }
    var nuove = dati && dati.formato === 'compilatore-misure-liste' && Array.isArray(dati.liste) ? dati.liste : null;
    if (!nuove) { esitoListe('errore', 'Questo file non contiene liste del Compilatore misure.'); return; }
    var liste = leggiListe(), aggiunte = 0, saltate = 0, scartate = 0;
    nuove.forEach(function (l) {
      if (!listaValida(nomiNuovi(l))) { scartate++; return; }
      var pulita = { nome: l.nome.trim().slice(0, 60), righe: l.righe, modo: l.modo, decGra: l.decGra, decDat: l.decDat,
        salvata: isNaN(new Date(l.salvata)) ? new Date().toISOString() : l.salvata };
      var i = trovaLista(liste, pulita.nome);
      // già presente: stesse coppie con lo stesso nome, o con il nome già cambiato da un'importazione ("Fresa (2)")
      var stessoNome = function (n) {
        n = n.toLowerCase(); var b = pulita.nome.toLowerCase();
        return n === b || (n.indexOf(b + ' (') === 0 && /^\d+\)$/.test(n.slice(b.length + 2)));
      };
      if (liste.some(function (x) { return stessoNome(x.nome) && stessoContenuto(x, pulita); })) { saltate++; return; }
      if (i >= 0) {
        var base = pulita.nome, k = 2;
        while (trovaLista(liste, base + ' (' + k + ')') >= 0) k++;
        pulita.nome = base + ' (' + k + ')';
      }
      liste.push(pulita);
      aggiunte++;
    });
    liste.sort(function (a, b) { return String(b.salvata).localeCompare(String(a.salvata)); });
    if (aggiunte && !scriviListe(liste)) return;
    esitoListe(aggiunte ? 'ok' : 'avviso', 'Importate ' + plurale(aggiunte, 'lista', 'liste') +
      (saltate ? ', ' + plurale(saltate, 'saltata perché già presente', 'saltate perché già presenti') : '') +
      (scartate ? ', ' + plurale(scartate, 'scartata perché non valida', 'scartate perché non valide') : '') + '.');
    mostraListe(); aggiornaProgramma();
  }

  /* ---------- senza rete (service worker, solo dal sito) ---------- */
  function registraSenzaRete() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
    function registra() { navigator.serviceWorker.register('sw.js').catch(function () {}); }
    if (document.readyState === 'complete') registra(); else window.addEventListener('load', registra);
    navigator.serviceWorker.ready.then(function () {
      $('stato-offline').textContent = 'Funziona anche senza rete.';
    }).catch(function () {});
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
    $('prova-scelte').hidden = !analisi.valido; // senza valori corretti la tendina sarebbe vuota
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
    avvisoTabella = '';
    if (r0 + righe.length > MAX_RIGHE) {
      avvisoTabella = 'Incollate solo le prime ' + (MAX_RIGHE - r0) + ' righe su ' + righe.length + ': il massimo è ' + MAX_RIGHE + ' righe.';
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
    posizionaBarra();
  }

  /* La tastiera del telefono copre il fondo della pagina senza farle spazio: la barra sale sopra la
     tastiera, cioè al fondo della parte visibile (visualViewport). Senza visualViewport resta in fondo. */
  function spazioSotto() {
    var vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height));
  }
  function posizionaBarra() {
    var b = $('barra-mobile');
    var s = b.hidden ? 0 : spazioSotto();
    b.style.bottom = s ? s + 'px' : '';
  }

  /* La tastiera è aperta? Si confronta l'altezza visibile con la più grande vista con questa larghezza
     (così funziona sia se la tastiera copre la pagina sia se la accorcia). Senza visualViewport: come oggi. */
  var schermoPieno = { w: 0, h: 0 };
  function tastieraAperta() {
    if (tastieraNascosta) return false;
    var vv = window.visualViewport;
    if (!vv) return true;
    var h = vv.height * (vv.scale || 1);
    if (window.innerWidth !== schermoPieno.w) schermoPieno = { w: window.innerWidth, h: 0 };
    schermoPieno.h = Math.max(schermoPieno.h, window.innerHeight, h);
    return schermoPieno.h - h > 120;
  }
  /* Avanti / Indietro della barra e tocco su un'altra casella: la tastiera resta com'era. */
  function mantieniTastiera() {
    if (touch && !tastieraAperta()) nascondiTastiera();
  }

  /* ---------- dettatura (Vosk) ---------- */
  var motore = null, statoVoce = 'spento'; // spento | caricamento | pronto | ascolto
  var ascoltoContinuo = false, tastoPremuto = false, bufferAvanti = '', appenaScritto = false;
  var ultimaDettata = null, ultimiValori = [], timerSilenzio = null, avvisoLentezza = false;
  var preparazione = null;   // preparazione del motore in corso (Promise<boolean>)
  var attesaTocco = false;   // un tocco del microfono aspetta la fine della preparazione
  // il microfono piccolo dentro il testo dei messaggi: lo stesso disegno della guida, preso dal template
  var ICONA_MICROFONO = (document.querySelector('#sez-guida .icona-testo') || { outerHTML: '' }).outerHTML;
  var MSG_PREPARA = 'Preparazione della dettatura…';
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
  function nomeCella(p) { return (p.c === 0 ? 'Grado ' : 'Dato ') + (p.r + 1); }
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
  /* Come Avanti; all'ultima casella aggiunge una riga, fino al massimo di righe. */
  function avantiDettato(p) {
    if (ascoltoContinuo && p.r >= MAX_RIGHE - 1 && p.c === 1) {
      fermaContinuo('Raggiunte ' + MAX_RIGHE + ' righe: dettatura finita.');
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

  /* Prepara il motore; la prima volta chiede di scaricare il modello. Restituisce true se è pronto.
     silenzioso: preparazione all'apertura (docs/2026-11-19-dettatura-pronta.md): solo con il modello già
     nel dispositivo, senza domande né errori a schermo. Un tocco durante la preparazione aspetta la stessa;
     se quella silenziosa non riesce, il tocco riprova mostrando l'errore. */
  function preparaVoce(silenzioso) {
    if (statoVoce === 'pronto' || statoVoce === 'ascolto') return Promise.resolve(true);
    if (preparazione) {
      var eraSilenziosa = preparazione.silenziosa;
      return preparazione.then(function (ok) { return ok || silenzioso || !eraSilenziosa ? ok : preparaVoce(false); });
    }
    var mio = function () { return !$('voce-stato').textContent || $('voce-stato').textContent === MSG_PREPARA; };
    var p = Voce.modelloScaricato().then(function (gia) {
      if (gia) return true;
      return silenzioso ? false : chiedi('Scaricare il riconoscimento vocale?\nCirca 50 MB, una volta sola: poi resta in questo dispositivo.', 'Scarica');
    }).then(function (si) {
      if (!si) return false;
      motore = motore || Voce.creaMotore();
      statoVoce = 'caricamento'; aggiornaPulsanteVoce();
      if (silenzioso && mio()) mostraStatoVoce('<span class="info">' + MSG_PREPARA + '</span>');
      return motore.prepara(function (testo, frazione) {
        if (silenzioso) return;
        mostraStatoVoce('<span class="info">' + esc(testo) + '</span>' +
          (frazione !== undefined ? '<progress max="1" value="' + frazione + '"></progress>' : ''));
      }).then(function () {
        statoVoce = 'pronto'; aggiornaPulsanteVoce();
        if (!silenzioso) mostraStatoVoce('<span class="info">Riconoscimento pronto.</span>');
        else if (mio()) mostraStatoVoce('<span class="info">Dettatura pronta.</span>');
        return true;
      }, function (e) {
        statoVoce = 'spento'; aggiornaPulsanteVoce();
        if (!silenzioso) mostraStatoVoce('<span class="non-capito">Riconoscimento non disponibile: ' + esc(e && e.message || e) + '</span>');
        else if (mio()) mostraStatoVoce('');
        return false;
      });
    }).catch(function () { return false; });
    p.silenziosa = !!silenzioso;
    preparazione = p;
    p.then(function () { preparazione = null; }); // prima delle attese dei tocchi: chi riprova non la ritrova
    return p;
  }

  /* All'apertura della pagina, se il modello è già nel dispositivo e la pagina è in primo piano. */
  var preparazioneRimandata = false;
  function preparaInAnticipo() {
    if (!stato.vocePrepara || statoVoce !== 'spento' || preparazione) return;
    if (document.visibilityState === 'hidden') { preparazioneRimandata = true; return; }
    preparazioneRimandata = false;
    preparaVoce(true);
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
    if (attesaTocco) return; // la preparazione in corso vedrà il tasto premuto
    attesaTocco = true;
    preparaVoce().then(function (pronto) {
      attesaTocco = false;
      if (!pronto) { tastoPremuto = false; return; }
      if (!tastoPremuto) { mostraStatoVoce('<span class="info">Pronto: tieni premuto ' + ICONA_MICROFONO + ' e parla.</span>'); return; }
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
      /* un valore solo per pressione: se se ne sentono di più non si scrive niente
         (docs/2026-11-22-un-valore-per-pressione.md) */
      var azioni = Dettato.interpreta(r.testo, { unValore: true });
      var valori = azioni.filter(function (a) { return a.tipo === 'valore'; });
      if (valori.length > 1) {
        mostraStatoVoce('<span class="non-capito">Ho sentito più numeri: ' +
          valori.map(function (a) { return esc(a.testo); }).join(' · ') + '. Ridetta il valore.</span>');
        return;
      }
      applicaAzioni(azioni, true);
    });
  }

  /* Modo "più valori". */
  function avviaContinuo() {
    nascondiTastiera();
    if (attesaTocco) return;
    attesaTocco = true;
    preparaVoce().then(function (pronto) {
      attesaTocco = false;
      if (!pronto || ascoltoContinuo || stato.voceModo !== 'continuo') return;
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
      else avviaContinuo();
    } else iniziaPremi();
  }

  function collegaVoce() {
    if (!Voce.disponibile()) return;
    $('voce').hidden = false;
    $('voce-impostazioni').hidden = false;
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
    $('voce-prepara').addEventListener('change', function () { stato.vocePrepara = this.checked; salva(); preparaInAnticipo(); });
    /* barra spaziatrice tenuta premuta nella tabella (modo "tieni premuto", sul PC) */
    $('corpo-tabella').addEventListener('keydown', function (e) {
      if (e.key === ' ' && stato.voceModo === 'premi') { e.preventDefault(); if (!e.repeat) iniziaPremi(); }
    });
    $('corpo-tabella').addEventListener('keyup', function (e) {
      if (e.key === ' ' && stato.voceModo === 'premi') { e.preventDefault(); finisciPremi(); }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState !== 'hidden') { if (preparazioneRimandata) preparaInAnticipo(); return; }
      if (ascoltoContinuo) fermaContinuo('Fermata: la pagina è andata in secondo piano.');
      else if (tastoPremuto) finisciPremi();
      else if (motore) motore.chiudiMicrofono();
    });
    $('voce-modo').value = stato.voceModo;
    $('voce-separatore').value = stato.voceSeparatore;
    $('voce-prepara').checked = stato.vocePrepara;
    aggiornaPulsanteVoce();
    /* un paio di secondi dopo l'apertura, così prima si disegna la pagina */
    var dopoApertura = function () { setTimeout(preparaInAnticipo, 2000); };
    if (document.readyState === 'complete') dopoApertura(); else window.addEventListener('load', dopoApertura);
  }

  /* ---------- eventi ---------- */
  function collega() {
    var corpo = $('corpo-tabella');

    corpo.addEventListener('input', function (e) {
      var t = e.target;
      if (!t.dataset || t.dataset.r === undefined) return;
      stato.righe[+t.dataset.r][+t.dataset.c] = t.value;
      aggiorna(true);
    });
    // il salvataggio raggruppato si fa subito quando la pagina si nasconde (altra app, altra scheda) o si chiude
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') salvaSeInAttesa(); });
    window.addEventListener('pagehide', salvaSeInAttesa);

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

    /* Tocco su una casella (docs/2026-11-22-barra-telefono-e-tastiera.md): sulla casella già scelta apre la
       tastiera per scrivere a mano; su un'altra la sceglie e lascia la tastiera com'era. Durante l'ascolto
       continuo resta chiusa. Con il mouse non cambia niente. */
    var apriAlClic = null;
    corpo.addEventListener('pointerdown', function (e) {
      var t = e.target;
      if (e.pointerType === 'mouse' || !t.dataset || t.dataset.r === undefined) return;
      if (document.activeElement === t) {
        if (tastieraNascosta && !ascoltoContinuo) { tastieraNascosta = false; aggiornaModoInput(); apriAlClic = t; }
      } else {
        mantieniTastiera();
      }
    });
    /* La tastiera si apre quando una casella riceve il fuoco: si ridà il fuoco alla casella già scelta. */
    corpo.addEventListener('click', function (e) {
      if (apriAlClic && e.target === apriAlClic) { var t = apriAlClic; t.blur(); t.focus(); }
      apriAlClic = null;
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', posizionaBarra);
      window.visualViewport.addEventListener('scroll', posizionaBarra);
    }

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
    $('mob-avanti').addEventListener('click', function () { if (cellaAttiva) { mantieniTastiera(); avanti(cellaAttiva.r, cellaAttiva.c); } });
    $('mob-indietro').addEventListener('click', function () { if (cellaAttiva) { mantieniTastiera(); indietro(cellaAttiva.r, cellaAttiva.c); } });
    $('mob-segno').addEventListener('click', function () { if (cellaAttiva) cambiaSegno(cellaAttiva.r, cellaAttiva.c); });

    $('riepilogo').addEventListener('click', function (e) {
      if (e.target.closest('#btn-verifica')) { apriVerifica(); return; }
      var a = e.target.closest('[data-vai]');
      if (!a) return;
      e.preventDefault();
      var p = a.dataset.vai.split(',');
      vai(+p[0], +p[1]);
    });

    document.querySelectorAll('input[name=modo]').forEach(function (r) {
      r.addEventListener('change', function () { stato.modo = r.value; costruisciTabella(); aggiorna(); });
    });
    $('dec-gra').addEventListener('change', function () { cambiaDecimali(0, this); });
    $('dec-dat').addEventListener('change', function () { cambiaDecimali(1, this); });
    $('btn-svuota').addEventListener('click', function () {
      chiedi('Cancellare tutti i valori della tabella?\nLe impostazioni restano.', 'Svuota').then(function (si) {
        if (!si) return;
        stato.righe = statoIniziale().righe;   // di nuovo le righe vuote iniziali
        stato.listaNome = '';   // la lista resta salvata: si chiude soltanto
        scriviProgramma('');
        stato.blocco = 0;
        stato.lettura = 0;
        avvisoTabella = '';
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
    /* link che aprono una scheda (il link porta già alla sezione) */
    document.querySelectorAll('[data-apri-scheda]').forEach(function (a) {
      a.addEventListener('click', function () { stato.scheda = a.dataset.apriScheda; mostraScheda(); salva(); });
    });
    $('imp-valori').addEventListener('toggle', function () { stato.impAperte = this.open; salva(); });
    /* La stampa funziona solo aprendo il file dal PC (nella pagina pubblicata è bloccata). */
    if (location.protocol === 'file:') $('btn-stampa').hidden = false;
    $('btn-stampa').addEventListener('click', function () { window.print(); });

    chiavetta.collega();

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
      if (document.visibilityState === 'visible' && (!$('lettura').hidden || !$('verifica').hidden)) tieniAcceso();
    });

    /* confronta con la macchina */
    $('verifica-chiudi').addEventListener('click', chiudiVerifica);
    $('verifica-azzera').addEventListener('click', function () { spunte.fatte = {}; mostraVerifica(); });
    $('verifica-elenco').addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      var i = +b.dataset.i;
      if (spunte.fatte[i]) delete spunte.fatte[i]; else spunte.fatte[i] = true;
      mostraVerifica();
      var dopo = $('verifica-elenco').querySelector('[data-i="' + i + '"]');
      if (dopo) dopo.focus();
    });
    $('verifica').addEventListener('keydown', function (e) { if (e.key === 'Escape') chiudiVerifica(); });

    /* liste salvate */
    $('btn-apri').addEventListener('click', function () {
      if (!$('liste').hidden) { chiudiListe(); return; }
      $('liste').hidden = false;
      this.setAttribute('aria-expanded', 'true');
      esitoListe('', ''); mostraListe();
    });
    $('btn-salva').addEventListener('click', salvaLista);
    $('programma').addEventListener('input', function () {
      stato.programma = this.value;
      $('esito-programma').innerHTML = '';
      salva();
      aggiornaProgramma();
    });
    $('programma').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
    });
    $('aggiunta-testa').addEventListener('input', function () {
      stato.aggiuntaTesta = this.value.slice(0, MAX_AGGIUNTA);
      salva();
      aggiornaAggiunta();
      mostraNomeProgramma(stato.programma.trim());
    });
    $('aggiunta-testa').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); this.blur(); }
    });
    $('lista-salva-come').addEventListener('click', salvaComeLista);
    $('lista-cerca').addEventListener('input', mostraListe);
    $('elenco-liste').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.apri !== undefined) apriLista(b.dataset.apri);
      else if (b.dataset.elimina !== undefined) eliminaLista(b.dataset.elimina);
    });
    $('lista-esporta').addEventListener('click', esportaListe);
    $('lista-importa').addEventListener('click', function () { $('lista-file').value = ''; $('lista-file').click(); });
    $('lista-file').addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      if (f.size > 5 * 1024 * 1024) { esitoListe('errore', 'Il file è troppo grande per essere un file di liste.'); return; }
      var r = new FileReader();
      r.onload = function () { importaListe(String(r.result)); };
      r.onerror = function () { esitoListe('errore', 'Non riesco a leggere il file.'); };
      r.readAsText(f);
    });

    var timerRidim = null;
    window.addEventListener('resize', function () {
      clearTimeout(timerRidim);
      timerRidim = setTimeout(function () {
        daDisegnare.barre = daDisegnare.qr = true;   // la larghezza dei codici dipende dalla finestra
        disegnaSchedaAperta(); aggiornaBarraMobile();
        largNome = 0; mostraNomeProgramma(stato.programma.trim());
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
    $('dec-gra').value = stato.decGra;
    $('dec-dat').value = stato.decDat;
    var sel = $('coppie-blocco');
    if (!Array.prototype.some.call(sel.options, function (o) { return +o.value === stato.coppieBlocco; })) {
      var o = document.createElement('option'); o.value = o.textContent = stato.coppieBlocco; sel.appendChild(o);
    }
    sel.value = String(stato.coppieBlocco);
    $('invio-finale').checked = !!stato.invioFinale;
    $('imp-valori').open = !!stato.impAperte;
    $('programma').value = stato.programma;
    $('aggiunta-testa').value = stato.aggiuntaTesta;
    aggiornaAggiunta();
    chiavetta.applicaImpostazioni();
    applicaTema();
  }

  carica();
  applicaImpostazioni();
  costruisciTabella();
  collega();
  collegaVoce();
  aggiorna();
  mostraScheda();
  registraSenzaRete();
})();
