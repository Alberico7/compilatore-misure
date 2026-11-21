'use strict';
// Colori dei temi (docs/2026-11-22-colori-alto-contrasto.md): contrasto calcolato come nelle WCAG.
// Ogni testo almeno 7:1 sul fondo su cui sta, bordi di campi e pulsanti almeno 3:1,
// niente bianco o nero puro come fondo della pagina.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const pagina = fs.readFileSync(path.join(__dirname, '..', 'src', 'template.html'), 'utf8');

function variabili(selettore) {
  const i = pagina.indexOf(selettore + ' {');
  assert.ok(i >= 0, 'manca ' + selettore);
  const blocco = pagina.slice(i, pagina.indexOf('}', i));
  const v = {};
  for (const m of blocco.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) v[m[1]] = m[2].toLowerCase();
  return v;
}
const scuro = variabili(':root');
const TEMI = { scuro, chiaro: Object.assign({}, scuro, variabili(':root[data-tema="chiaro"]')) };

function luminanza(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrasto(a, b) {
  const x = luminanza(a), y = luminanza(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// [testo, fondo]: le coppie usate nella pagina
const TESTI = [
  ['testo', 'sfondo'], ['testo', 'carta'], ['testo', 'campo'], ['testo', 'accento-chiaro'],
  ['tenue', 'sfondo'], ['tenue', 'carta'], ['tenue', 'campo'],
  ['accento', 'sfondo'], ['accento', 'carta'], ['accento', 'campo'], ['accento', 'accento-chiaro'],
  ['su-accento', 'accento'], ['su-accento', 'errore'],
  ['altezza', 'carta'], ['altezza', 'campo'],
  ['errore', 'carta'], ['errore', 'errore-chiaro'],
  ['avviso', 'carta'], ['avviso', 'avviso-chiaro'],
  ['ok', 'carta'], ['ok', 'ok-chiaro'],
];
const BORDI_CAMPI = [['bordo-campo', 'campo'], ['bordo-campo', 'carta']];

for (const [nome, t] of Object.entries(TEMI)) {
  test('tema ' + nome + ': ogni testo almeno 7:1, bordi dei campi almeno 3:1', () => {
    const sotto = [];
    for (const [a, b] of TESTI) {
      assert.ok(t[a] && t[b], 'manca --' + a + ' o --' + b);
      const r = contrasto(t[a], t[b]);
      if (r < 7) sotto.push(a + ' su ' + b + ': ' + r.toFixed(2));
    }
    for (const [a, b] of BORDI_CAMPI) {
      const r = contrasto(t[a], t[b]);
      if (r < 3) sotto.push(a + ' su ' + b + ': ' + r.toFixed(2));
    }
    assert.deepEqual(sotto, []);
  });

  test('tema ' + nome + ': fondo della pagina né bianco né nero puro', () => {
    for (const f of ['sfondo', 'carta']) assert.ok(!['#ffffff', '#000000'].includes(t[f]), '--' + f + ' = ' + t[f]);
  });
}

test('i bordi di caselle, menu, pulsanti e scelte usano --bordo-campo', () => {
  for (const sel of ['.radio label {', 'input[type=number], input[type=text], select {', 'button { padding:', 'table.misure input {', 'textarea#prova {', '.liste input[type=search] {']) {
    const i = pagina.indexOf(sel);
    assert.ok(i >= 0, 'manca ' + sel);
    const regola = pagina.slice(i, pagina.indexOf('}', i));
    assert.match(regola, /border: \dpx solid var\(--bordo-campo\)/, sel);
  }
});
