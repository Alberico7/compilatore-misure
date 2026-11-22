/* Scheda "Chiavetta" della pagina: impostazioni, collegamento (Bluetooth o cavo), invio dei valori,
   controllo della chiavetta e codice Bluetooth. Il protocollo è in chiavetta.js.
   app.js la crea con AppChiavetta.crea(ctx) e le passa quello che serve:
   ctx = { stato(), analisi(), salva(), chiedi(testo, etichettaSi), $, esc, intero } */
var AppChiavetta = (function () {
  'use strict';

  function crea(ctx) {
    var $ = ctx.$, esc = ctx.esc;
    var occupata = false;
    var esitoFisso = false;   // l'ultimo esito resta finché non cambia qualcosa

    function stato() { return ctx.stato(); }

    function imp() {
      var s = stato();
      return { ritardoCarattere: s.chRitCar, ritardoInvio: s.chRitInv, coppiePerPressione: s.chCoppie, decAng: s.decAng, decAlt: s.decAlt };
    }

    /* Testo e byte da mandare, oppure { errore }. */
    function dati() {
      var a = ctx.analisi();
      if (!a.valido) return { errore: 'Correggi i valori nella sezione 1: si possono inviare solo quando tutti i valori sono corretti.' };
      var errore = Chiavetta.controlla(a.valori, imp());
      if (errore) return { errore: errore };
      var byte = Chiavetta.codifica(Chiavetta.testo(a.valori, imp()));
      if (byte.length > Chiavetta.MAX_TESTO) return { errore: 'Troppi dati per la chiavetta.' };
      return { byte: byte, crc: Chiavetta.esa(Chiavetta.crc32(byte)), n: a.valori.length };
    }

    function disponibili() {
      var d = [];
      if (Chiavetta.bluetoothDisponibile()) d.push('bluetooth');
      if (Chiavetta.usbDisponibile()) d.push('cavo');
      return d;
    }

    /* Collegamento scelto, tra quelli che questo browser ha. null se nessuno. */
    function mezzo() {
      var d = disponibili();
      return d.indexOf(stato().chMezzo) >= 0 ? stato().chMezzo : (d[0] || null);
    }

    function esito(classe, html) {
      $('esito-chiavetta').innerHTML = '<div class="messaggio ' + classe + '">' + html + '</div>';
    }

    function mostra() {
      var d = disponibili(), m = mezzo();
      $('ch-mezzo').hidden = !d.length;
      $('lbl-ch-bt').hidden = d.indexOf('bluetooth') < 0;
      $('lbl-ch-cavo').hidden = d.indexOf('cavo') < 0;
      document.querySelectorAll('input[name=ch-mezzo]').forEach(function (r) { r.checked = r.value === m; r.disabled = occupata; });
      $('btn-ch-invia').hidden = $('btn-ch-controlla').hidden = !m;
      $('btn-ch-codice').disabled = $('btn-ch-spegni').disabled = d.indexOf('cavo') < 0 || occupata;

      var nota = [];
      if (d.indexOf('bluetooth') < 0) nota.push('Questo browser non può usare il Bluetooth dei siti: serve Chrome su Android, oppure Chrome o Edge sul PC.');
      if (d.indexOf('cavo') < 0) nota.push('Questo browser non può usare il cavo (WebUSB): serve un browser basato su Chromium (Chrome, Edge, Vanadium).');
      $('ch-supporto').textContent = nota.join(' ');
      $('ch-supporto').hidden = !nota.length;
      $('ch-versione').textContent = Chiavetta.versionePubblicata() || 'non disponibile';
      var s = stato();
      $('ch-imp-riepilogo').textContent = 'pause ' + s.chRitCar + ' / ' + s.chRitInv + ' ms · ' +
        (s.chCoppie ? s.chCoppie + (s.chCoppie === 1 ? ' coppia' : ' coppie') + ' per pressione' : 'tutte le coppie');

      var x = dati();
      $('btn-ch-invia').disabled = !!x.errore || occupata;
      $('btn-ch-controlla').disabled = occupata;
      if (occupata || esitoFisso) return;
      if (x.errore) esito('avviso', esc(x.errore));
      else {
        $('esito-chiavetta').innerHTML = '<p class="nota">Pronti da inviare: ' + x.n / 2 + (x.n === 2 ? ' coppia' : ' coppie') +
          ' (' + x.n + ' valori), codice di controllo <b class="vis">' + x.crc + '</b>.</p>';
      }
    }

    /* Collega, esegue "lavoro(collegamento)" e chiude. tipo: 'bluetooth' | 'cavo' */
    function conChiavetta(tipo, cosa, lavoro) {
      if (occupata) return;
      occupata = true;
      esitoFisso = true;
      mostra();
      esito('avviso', tipo === 'cavo' ? 'Collegamento con il cavo…' : 'Collegamento Bluetooth…');
      var conn = null;
      (tipo === 'cavo' ? Chiavetta.collegaUsb() : Chiavetta.collegaBluetooth()).then(function (c) {
        conn = c;
        esito('avviso', cosa + '…');
        return lavoro(c);
      }).catch(function (e) {
        var msg = Chiavetta.messaggioCollegamento(e, tipo);
        if (tipo === 'bluetooth' && e && e.name === 'NetworkError') {
          msg += ' Se è la prima volta con questo telefono: tieni premuto il pulsante della chiavetta per 5 secondi (doppio lampo) e riprova entro un minuto.';
        }
        esito('errore', esc(msg));
      }).then(function () {
        if (conn) conn.chiudi();
        occupata = false;
        mostra();
      });
    }

    /* " <b>3F2A</b>": il codice della chiavetta collegata, dal suo nome; vuoto con un firmware vecchio */
    function codice(c) { return c && c.codice ? ' <b>' + esc(c.codice) + '</b>' : ''; }

    function rispostaInattesa(r) {
      esito('errore', r.tipo === 'errore' ? esc(r.messaggio) : 'Risposta inattesa dalla chiavetta: ' + esc(r.testo || r.tipo));
    }

    function invia() {
      var tipo = mezzo(), x = dati();
      if (!tipo) return;
      if (x.errore) { esitoFisso = true; esito('errore', esc(x.errore)); return; }
      conChiavetta(tipo, 'Invio in corso', function (c) {
        return c.invia(Chiavetta.pacchetti(x.byte, tipo === 'cavo' ? 1024 : 180)).then(function (r) {
          if (r.tipo === 'ok' && r.crc === x.crc && r.n === x.n) {
            esito('ok', 'Chiavetta' + codice(c) + ': ' + r.n + ' valori caricati, codice di controllo <span class="vis">' + esc(r.crc) +
              '</span> uguale a quello del sito.<br>In macchina: cursore su <b>Angolo 1</b>, poi premi il pulsante della chiavetta.' +
              (tipo === 'cavo' ? ' Prima scollegala e ricollegala <b>senza</b> premere il pulsante.' : ''));
          } else if (r.tipo === 'ok') {
            esito('errore', 'La chiavetta' + codice(c) + ' ha ricevuto dati diversi (' + r.n + ' valori, controllo ' + esc(r.crc) + ' invece di ' +
              x.n + ', ' + x.crc + '). Non usarla: rinvia i valori.');
          } else rispostaInattesa(r);
        });
      });
    }

    /* Testo (HTML) e classe per la risposta di stato, confrontata con la tabella e con il firmware pubblicato. */
    function descriviStato(r, x) {
      var righe = [], classe = 'ok';
      var avanzamento = {
        VUOTO: 'Nessun valore caricato.',
        PRONTO: r.n + ' valori, pronta a scrivere dall\'inizio.',
        ATTESA: 'Sta per scrivere: valore ' + (r.pos + 1) + ' di ' + r.n + '.',
        SCRIVE: 'Sta scrivendo: valore ' + (r.pos + 1) + ' di ' + r.n + '.',
        FERMATO: 'Fermata dopo il valore ' + r.pos + ' di ' + r.n + ': una pressione breve riprende.',
        FINITO: 'Ha finito di scrivere i ' + r.n + ' valori.',
        CARICAMENTO: r.n + ' valori caricati (modo caricamento con il cavo).'
      }[r.stato] || esc(r.descrizione);
      righe.push(avanzamento);
      if (r.n > 0) {
        if (x.errore) { righe.push('La tabella ha errori: non posso confrontare.'); classe = 'avviso'; }
        else if (r.crc === x.crc && r.n === x.n) righe.push('<b>Uguali ai valori e alle impostazioni della tabella.</b>');
        else { righe.push('<b>Diversi dalla tabella</b> (valori o impostazioni): reinvia i valori.'); classe = 'avviso'; }
      } else classe = 'avviso';
      var pubblicata = Chiavetta.versionePubblicata();
      if (!r.versione) {
        righe.push('Firmware di una versione precedente: aggiornalo (vedi "Codice Bluetooth e firmware").');
        classe = 'avviso';
      } else if (pubblicata && Chiavetta.confrontaVersioni(r.versione, pubblicata) < 0) {
        righe.push('Firmware ' + esc(r.versione) + ': è disponibile la ' + esc(pubblicata) + ', aggiornalo (vedi "Codice Bluetooth e firmware").');
        classe = 'avviso';
      } else righe.push('Firmware ' + esc(r.versione) + '.');
      righe.push(r.bluetooth ? 'Bluetooth attivo.' : 'Bluetooth spento (codice non impostato).');
      return { classe: classe, html: righe.join('<br>') };
    }

    function controlla() {
      var tipo = mezzo();
      if (!tipo) return;
      conChiavetta(tipo, 'Lettura dello stato', function (c) {
        return c.invia([Chiavetta.pacchettoStato()]).then(function (r) {
          if (r.tipo !== 'stato') { rispostaInattesa(r); return; }
          var s = descriviStato(r, dati());
          esito(s.classe, (c.codice ? 'Chiavetta' + codice(c) + '<br>' : '') + s.html);
        });
      });
    }

    function impostaCodice(spegni) {
      var valore = $('ch-codice').value.trim();
      if (!spegni && !/^\d{6}$/.test(valore)) {
        esitoFisso = true;
        esito('errore', 'Il codice deve avere 6 cifre.');
        return;
      }
      var domanda = spegni
        ? ctx.chiedi('Spegnere il Bluetooth della chiavetta?\nGli abbinamenti vengono cancellati. Si riaccende impostando un nuovo codice.', 'Spegni')
        : ctx.chiedi('Impostare il codice ' + valore + '?\nGli abbinamenti precedenti vengono cancellati. Annota il codice: il telefono lo chiede la prima volta.', 'Imposta');
      domanda.then(function (si) {
        if (!si) return;
        conChiavetta('cavo', 'Invio del codice', function (c) {
          return c.invia([Chiavetta.pacchettoCodice(spegni ? null : parseInt(valore, 10))]).then(function (r) {
            if (r.tipo !== 'codice') { rispostaInattesa(r); return; }
            esito('ok', r.attivo
              ? 'Codice impostato. Scollega la chiavetta e ricollegala senza premere il pulsante; poi tieni premuto il pulsante 5 secondi e invia dal telefono: ti chiederà il codice.'
              : 'Bluetooth spento.');
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

    function collega() {
      [['ch-rit-car', 'chRitCar', 1, 1000, 30], ['ch-rit-inv', 'chRitInv', 0, 5000, 30], ['ch-coppie', 'chCoppie', 0, 500, 0]].forEach(function (x) {
        $(x[0]).addEventListener('change', function () {
          stato()[x[1]] = ctx.intero(this.value, x[2], x[3], x[4]);
          this.value = stato()[x[1]];
          esitoFisso = false;
          mostra();
          ctx.salva();
        });
      });
      document.querySelectorAll('input[name=ch-mezzo]').forEach(function (r) {
        r.addEventListener('change', function () { stato().chMezzo = this.value; mostra(); ctx.salva(); });
      });
      $('btn-ch-invia').addEventListener('click', invia);
      $('btn-ch-controlla').addEventListener('click', controlla);
      $('btn-ch-genera').addEventListener('click', generaCodice);
      $('btn-ch-codice').addEventListener('click', function () { impostaCodice(false); });
      $('btn-ch-spegni').addEventListener('click', function () { impostaCodice(true); });
      $('ch-codice').addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(0, 6); });
    }

    function applicaImpostazioni() {
      $('ch-rit-car').value = stato().chRitCar;
      $('ch-rit-inv').value = stato().chRitInv;
      $('ch-coppie').value = stato().chCoppie;
    }

    return {
      collega: collega,
      applicaImpostazioni: applicaImpostazioni,
      /* I valori della tabella sono cambiati: l'esito vecchio non vale più. */
      aggiorna: function () { esitoFisso = false; mostra(); }
    };
  }

  return { crea: crea };
})();
