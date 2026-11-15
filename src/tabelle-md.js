'use strict';
// Legge le tabelle Markdown del LEGGIMI della chiavetta (fonte unica di "Pulsante", "Tasti" e "LED")
// e le trasforma in HTML per la guida del sito. Usato da build.js e dai test.

/* Righe della tabella che ha come prima intestazione "titolo": [[cella, ...], ...] (intestazione compresa). */
function righeTabella(md, titolo) {
  const righe = md.replace(/\r/g, '').split('\n');
  const inizio = righe.findIndex((r) => new RegExp('^\\|\\s*' + titolo + '\\s*\\|').test(r));
  if (inizio < 0) throw new Error('Tabella "' + titolo + '" non trovata nel LEGGIMI');
  const tabella = [];
  for (let i = inizio; i < righe.length && righe[i].trim().startsWith('|'); i++) {
    if (/^\|[\s:|-]+\|$/.test(righe[i].trim())) continue;   // riga |---|---|
    tabella.push(righe[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  }
  return tabella;
}

function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* Solo quello che usa il LEGGIMI nelle tabelle: **grassetto**. */
function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }

function tabellaHtml(md, titolo) {
  const [intestazione, ...corpo] = righeTabella(md, titolo);
  return '<table><thead><tr>' + intestazione.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
    corpo.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
}

/* Testo semplice di una cella (senza **), per confrontare guida e LEGGIMI. */
function testoCella(s) { return s.replace(/\*\*/g, ''); }

module.exports = { righeTabella, tabellaHtml, testoCella, TABELLE: ['Pulsante', 'Tasti', 'LED'] };
