'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../src/logica.js');

test('conversione con separatore', () => {
  const casi = [
    ['20.00', 2, '2000', '20.00'], ['20,00', 2, '2000', '20.00'], ['20.5', 2, '2050', '20.50'],
    ['20', 2, '2000', '20.00'], ['0,05', 2, '5', '0.05'], ['.5', 2, '50', '0.50'], ['20.', 2, '2000', '20.00'],
    ['0', 2, '0', '0.00'], ['007,10', 2, '710', '7.10'], [' 12,3 ', 2, '1230', '12.30'],
    ['45.125', 3, '45125', '45.125'], ['45', 0, '45', '45'], ['1.2', 4, '12000', '1.2000'],
    ['-3,5', 2, '-350', '-3.50'], ['-0,00', 2, '0', '0.00'],
  ];
  for (const [testo, dec, cifre, display] of casi) {
    const r = L.converti(testo, 'separatore', dec);
    assert.equal(r.stato, 'ok', testo);
    assert.equal(r.cifre, cifre, testo);
    assert.equal(r.display, display, testo);
  }
  assert.equal(L.converti('-3,5', 'separatore', 2).negativo, true);
});

test('conversione come in macchina', () => {
  const casi = [['2000', 2, '2000', '20.00'], ['5', 2, '5', '0.05'], ['0050', 2, '50', '0.50'], ['-150', 2, '-150', '-1.50'], ['12345', 3, '12345', '12.345']];
  for (const [testo, dec, cifre, display] of casi) {
    const r = L.converti(testo, 'macchina', dec);
    assert.equal(r.stato, 'ok', testo);
    assert.equal(r.cifre, cifre);
    assert.equal(r.display, display);
  }
});

test('errori', () => {
  assert.equal(L.converti('', 'separatore', 2).stato, 'vuoto');
  assert.equal(L.converti('   ', 'macchina', 2).stato, 'vuoto');
  for (const t of ['abc', '1.2.3', '1,000.5', '12a', '-', '.', '1e3', '+5', '20 5']) {
    assert.equal(L.converti(t, 'separatore', 2).stato, 'errore', t);
  }
  assert.match(L.converti('20.123', 'separatore', 2).messaggio, /Troppi decimali/);
  assert.match(L.converti('20,5', 'separatore', 0).messaggio, /Troppi decimali/);
  assert.match(L.converti('20.00', 'macchina', 2).messaggio, /separatore/);
  assert.match(L.converti('20x', 'macchina', 2).messaggio, /non numerico/);
});

test('analisi tabella: ordine, errori, avvisi', () => {
  const a = L.analizza([['20,00', '15,50'], ['-1', '3']], { modo: 'separatore', decAng: 2, decAlt: 2 });
  assert.equal(a.valido, true);
  assert.deepEqual(a.valori.map((v) => v.cifre), ['2000', '1550', '-100', '300']);
  assert.deepEqual(a.valori.map((v) => v.etichetta), ['Angolo 1', 'Altezza 1', 'Angolo 2', 'Altezza 2']);
  assert.equal(a.avvisi.length, 1);
  const b = L.analizza([['20,00', ''], ['x', '1,234']], { modo: 'separatore', decAng: 2, decAlt: 2 });
  assert.equal(b.valido, false);
  assert.equal(b.errori.length, 3);
  assert.deepEqual(b.valori, []);
});

test('Code 128: checksum e struttura', () => {
  // "2000" in set C: start C(105), 20, 00 -> checksum (105 + 1*20 + 2*0) % 103 = 22
  assert.deepEqual(L.code128Simboli('2000'), [105, 20, 0, 22, 106]);
  // cifre dispari: set C poi Code B per l'ultima
  assert.deepEqual(L.code128Simboli('123').slice(0, 4), [105, 12, 100, 19]);
  // segno meno: set B
  assert.equal(L.code128Simboli('-100')[0], 104);
  // ogni simbolo è largo 11 moduli, stop 13
  const larg = L.code128Larghezze('2000');
  assert.equal(larg.reduce((s, x) => s + x, 0), 11 * 4 + 13);
});

test('blocchi QR', () => {
  const valori = [];
  for (let i = 1; i <= 23; i++) {
    valori.push({ cifre: 'A' + i, coppia: i, etichetta: 'Angolo ' + i });
    valori.push({ cifre: 'H' + i, coppia: i, etichetta: 'Altezza ' + i });
  }
  const b = L.blocchiQR(valori, 10, false);
  assert.equal(b.length, 3);
  assert.equal(b[1].primaCoppia, 11);
  assert.equal(b[2].ultimaCoppia, 23);
  assert.equal(b[0].testo.split('\r').length, 20);
  assert.ok(!b[0].testo.endsWith('\r'));
  assert.ok(!b[0].testo.includes('\n'));
  assert.ok(L.blocchiQR(valori, 10, true)[0].testo.endsWith('H10\r'));
});

test('confronto prova lettore', () => {
  const att = ['2000', '1550', '2100', '1600'];
  assert.equal(L.confronta('2000\n1550\n2100\n1600\n', att).tuttoOk, true);
  const parziale = L.confronta('2000\n1550\n', att);
  assert.equal(parziale.tuttoOk, false);
  assert.equal(parziale.problemi.length, 0);
  assert.equal(parziale.mancanti, 2);

  const doppio = L.confronta('2000\n\n1550\n2100\n1600\n', att);
  assert.match(doppio.problemi[0], /INVIO doppio dopo il valore n\. 1/);
  assert.equal(doppio.corretti, 4);

  const attaccati = L.confronta('2000155021001600\n', att);
  assert.equal(attaccati.esiti[0].esito, 'attaccati');
  assert.ok(attaccati.suggerimenti.some((s) => /Function key emulation/.test(s)));

  const layout = L.confronta('ß100\n', ['-100']);
  assert.ok(layout.suggerimenti.some((s) => /layout/.test(s)));

  const tab = L.confronta('2000\t1550\t', ['2000', '1550']);
  assert.ok(tab.suggerimenti.some((s) => /TAB/.test(s)));
  assert.equal(tab.tuttoOk, false);

  const persi = L.confronta('200\n', ['2000']);
  assert.ok(persi.suggerimenti.some((s) => /ritardo/.test(s)));
});
