'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/dettato.js');

/* Scrive un numero da 0 a 9999 in lettere, come lo scrive Vosk (indipendente dal codice testato). */
function inLettere(n) {
  const u = ['zero', 'uno', 'due', 'tre', 'quattro', 'cinque', 'sei', 'sette', 'otto', 'nove', 'dieci', 'undici', 'dodici', 'tredici',
    'quattordici', 'quindici', 'sedici', 'diciassette', 'diciotto', 'diciannove'];
  const dec = ['', '', 'venti', 'trenta', 'quaranta', 'cinquanta', 'sessanta', 'settanta', 'ottanta', 'novanta'];
  const f99 = (x) => {
    if (x < 20) return u[x];
    const d = dec[Math.floor(x / 10)], r = x % 10;
    if (r === 0) return d;
    return (r === 1 || r === 8 ? d.slice(0, -1) : d) + u[r];
  };
  const f999 = (x) => {
    if (x < 100) return f99(x);
    const c = Math.floor(x / 100), r = x % 100;
    const testa = c === 1 ? 'cento' : u[c] + 'cento';
    if (r === 0) return testa;
    return (r === 8 ? testa.slice(0, -1) : testa) + f99(r);
  };
  if (n < 1000) return f999(n);
  const m = Math.floor(n / 1000), r = n % 1000;
  return (m === 1 ? 'mille' : u[m] + 'mila') + (r ? f999(r) : '');
}

test('ogni numero da 0 a 9999 detto come lo scrive Vosk', () => {
  for (let n = 0; n <= 9999; n++) assert.equal(D.numeroItaliano(inLettere(n)), n, inLettere(n));
});

test('valori con decimali, segno e separatore detto', () => {
  const casi = [
    ['duecentoquattordici virgola nove quattro', '214,94'],
    ['duecentoquattordici virgola novantaquattro', '214,94'],
    ['venti virgola cinque', '20,5'],
    ['zero virgola zero cinque', '0,05'],
    ['venti punto cinque', '20.5'],
    ['meno uno virgola cinque', '-1,5'],
    ['venti', '20'],
    ['duemila', '2000'],
    ['mille e cento', '1100'],
    ['cento venticinque virgola cinquanta', '125,50'],
    ['venti virgola', '20,'],
    ['trecentotredici virgola uno sei', '313,16'],
  ];
  for (const [frase, atteso] of casi) {
    assert.deepEqual(D.interpreta(frase), [{ tipo: 'valore', testo: atteso }], frase);
  }
});

test('più valori nella stessa frase, separati o no da "avanti"', () => {
  assert.deepEqual(D.interpreta('venti virgola cinque avanti trenta'), [
    { tipo: 'valore', testo: '20,5' }, { tipo: 'comando', comando: 'avanti' }, { tipo: 'valore', testo: '30' },
  ]);
  assert.deepEqual(D.interpreta('ventisei virgola nove quattro trecento'), [
    { tipo: 'valore', testo: '26,94300' },
  ], 'dopo la virgola ogni numero detto è un decimale (come nelle etichette)');
});

test('comandi', () => {
  assert.deepEqual(D.interpreta('indietro'), [{ tipo: 'comando', comando: 'indietro' }]);
  assert.deepEqual(D.interpreta('cancella'), [{ tipo: 'comando', comando: 'cancella' }]);
  assert.deepEqual(D.interpreta('correggi'), [{ tipo: 'comando', comando: 'correggi' }]);
  assert.deepEqual(D.interpreta('stop'), [{ tipo: 'comando', comando: 'stop' }]);
  assert.deepEqual(D.interpreta('riga dodici'), [{ tipo: 'riga', n: 12 }]);
  assert.deepEqual(D.interpreta('poi'), [{ tipo: 'comando', comando: 'avanti' }]);
});

test('parole non capite: nessun valore', () => {
  assert.deepEqual(D.interpreta('buongiorno a tutti'), [{ tipo: 'ignoto', parole: 'buongiorno a tutti' }]);
  assert.deepEqual(D.interpreta(''), []);
  assert.deepEqual(D.interpreta('un'), [{ tipo: 'ignoto', parole: 'un' }]);
  assert.deepEqual(D.interpreta('riga'), [{ tipo: 'ignoto', parole: 'riga' }]);
  assert.deepEqual(D.interpreta('meno'), [{ tipo: 'ignoto', parole: 'meno' }]);
  assert.deepEqual(D.interpreta('ehm venti'), [{ tipo: 'ignoto', parole: 'ehm' }, { tipo: 'valore', testo: '20' }]);
});
