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

test('cambio dei decimali: stesso valore, cifre in più cancellate senza arrotondare', () => {
  const casi = [
    // [testo, modo, prima, dopo, atteso]
    ['20,55', 'separatore', 2, 1, '20,5'],
    ['20,59', 'separatore', 2, 1, '20,5'],
    ['20.55', 'separatore', 2, 1, '20.5'],
    ['-20,55', 'separatore', 2, 1, '-20,5'],
    ['20,5', 'separatore', 2, 1, '20,5'],
    ['20', 'separatore', 2, 1, '20'],
    ['20,55', 'separatore', 2, 0, '20'],
    [',55', 'separatore', 2, 1, '0,5'],
    ['-0,05', 'separatore', 2, 1, '0,0'],
    ['20,5', 'separatore', 1, 2, '20,5'],
    ['2055', 'macchina', 2, 1, '205'],
    ['-2055', 'macchina', 2, 1, '-205'],
    ['2055', 'macchina', 2, 0, '20'],
    ['5', 'macchina', 2, 1, '0'],
    ['-5', 'macchina', 2, 1, '0'],
    ['205', 'macchina', 1, 2, '2050'],
    ['-205', 'macchina', 1, 3, '-20500'],
    ['0', 'macchina', 1, 2, '0'],
    ['', 'separatore', 2, 1, ''],
    ['abc', 'separatore', 2, 1, 'abc'],
    ['20,555', 'separatore', 2, 1, '20,555'],   // era già un errore: non si tocca
    ['20,00', 'macchina', 2, 1, '20,00'],
    ['20,55', 'separatore', 2, 2, '20,55'],
  ];
  for (const [testo, modo, prima, dopo, atteso] of casi) {
    assert.equal(L.cambiaDecimali(testo, modo, prima, dopo), atteso, testo + ' ' + modo + ' ' + prima + '→' + dopo);
  }
  // il valore digitato in macchina resta lo stesso, a parte le cifre tolte
  assert.equal(L.converti(L.cambiaDecimali('205', 'macchina', 1, 2), 'macchina', 2).display, '20.50');
  assert.equal(L.converti(L.cambiaDecimali('2055', 'macchina', 2, 1), 'macchina', 1).display, '20.5');
});

test('analisi tabella: ordine, errori, avvisi', () => {
  const a = L.analizza([['20,00', '15,50'], ['-1', '3']], { modo: 'separatore', decGra: 2, decDat: 2 });
  assert.equal(a.valido, true);
  assert.deepEqual(a.valori.map((v) => v.cifre), ['2000', '1550', '-100', '300']);
  assert.deepEqual(a.valori.map((v) => v.etichetta), ['Grado 1', 'Dato 1', 'Grado 2', 'Dato 2']);
  assert.equal(a.avvisi.length, 1);
  const b = L.analizza([['20,00', ''], ['x', '1,234']], { modo: 'separatore', decGra: 2, decDat: 2 });
  assert.equal(b.valido, false);
  assert.equal(b.errori.length, 3);
  assert.deepEqual(b.valori, []);
});

/* docs/2026-11-18-offline-liste-avvisi.md: grado oltre 360, dato molto diverso dai vicini, coppia uguale */
test('avvisi sui valori sospetti', () => {
  const IMP = { modo: 'separatore', decGra: 2, decDat: 2 };
  const tipi = (righe, imp = IMP) => L.analizza(righe, imp).avvisi.filter((a) => a.tipo !== 'negativo').map((a) => a.tipo + ' ' + (a.riga + 1));

  // grado: 360 no, 360.01 sì; anche con altri decimali e nel modo "come in macchina"
  assert.deepEqual(tipi([['360', '1'], ['360.01', '2']]), ['grado360 2']);
  assert.deepEqual(tipi([['361', '1']], { modo: 'separatore', decGra: 0, decDat: 2 }), ['grado360 1']);
  assert.deepEqual(tipi([['36000', '1'], ['36001', '2']], { modo: 'macchina', decGra: 2, decDat: 2 }), ['grado360 2']);
  const a = L.analizza([['1', '1'], ['370', '2']], IMP).avvisi[0];
  assert.equal(a.col, 0);
  assert.equal(a.testo, 'Grado 2: 370.00 è oltre 360');
  // l'avviso non blocca niente
  assert.equal(L.analizza([['370', '1']], IMP).valido, true);

  // dato isolato 5 volte più grande o più piccolo di tutti e due i vicini, che sono simili tra loro
  assert.deepEqual(tipi([['1', '200'], ['2', '2000'], ['3', '205']]), ['dato 2']);
  assert.deepEqual(tipi([['1', '200'], ['2', '20'], ['3', '205']]), ['dato 2']);
  assert.deepEqual(tipi([['1', '200'], ['2', '999'], ['3', '205']]), [], 'meno di 5 volte');
  assert.deepEqual(tipi([['1', '20'], ['2', '200'], ['3', '2000']]), [], 'vicini diversi tra loro: salto vero');
  assert.deepEqual(tipi([['1', '200'], ['2', '2000']]), [], 'servono almeno 3 dati');
  // prima e ultima riga: i due più vicini
  assert.deepEqual(tipi([['1', '2000'], ['2', '200'], ['3', '205'], ['4', '210']]), ['dato 1']);
  assert.deepEqual(tipi([['1', '200'], ['2', '205'], ['3', '210'], ['4', '21']]), ['dato 4']);
  // zeri: niente confronto; negativi: conta la grandezza
  assert.deepEqual(tipi([['1', '0'], ['2', '2000'], ['3', '200'], ['4', '205']]), []);
  assert.deepEqual(tipi([['1', '200'], ['2', '0'], ['3', '205']]), []);
  assert.deepEqual(tipi([['1', '-200'], ['2', '-2000'], ['3', '-205']]), ['dato 2']);
  // le righe con errori si saltano: i vicini sono i dati validi più vicini
  assert.deepEqual(tipi([['1', '200'], ['2', 'x'], ['3', '2000'], ['4', '205']]), ['dato 3']);
  const h = L.analizza([['1', '200'], ['2', '2000'], ['3', '205']], IMP).avvisi[0];
  assert.equal(h.col, 1);
  assert.equal(h.testo, 'Dato 2: 2000.00 è molto diverso dai vicini (200.00 e 205.00): controlla la virgola');

  // coppia uguale: solo con grado E dato uguali alla coppia sopra (confronto sulle cifre: 20 = 20,00)
  assert.deepEqual(tipi([['20', '15'], ['20,00', '15.0']]), ['uguale 2']);
  assert.deepEqual(tipi([['20', '15'], ['20', '16']]), [], 'solo grado uguale');
  assert.deepEqual(tipi([['20', '15'], ['21', '15']]), [], 'solo dato uguale');
  assert.deepEqual(tipi([['20', '15'], ['21', '16'], ['20', '15']]), [], 'uguale ma non di seguito');
  assert.equal(L.analizza([['20', '15'], ['20', '15']], IMP).avvisi[0].testo, 'Coppia 2 uguale alla 1');

  // i negativi restano, con il loro tipo; tutti in ordine di riga
  const tutti = L.analizza([['-1', '200'], ['400', '210'], ['400', '210'], ['5', '205']], IMP).avvisi.map((x) => x.tipo + ' ' + (x.riga + 1));
  assert.deepEqual(tutti, ['negativo 1', 'grado360 2', 'grado360 3', 'uguale 3']);
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
    valori.push({ cifre: 'A' + i, coppia: i, etichetta: 'Grado ' + i });
    valori.push({ cifre: 'H' + i, coppia: i, etichetta: 'Dato ' + i });
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
