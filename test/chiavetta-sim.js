'use strict';
// Compila e avvia il Pico simulato (chiavetta/test/simulatore.c) con un compilatore C del PC.
// Compilatore: variabile CC_CHIAVETTA (es. "python -m ziglang cc"), altrimenti gcc, cc o clang.
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const CHIAVETTA = path.join(__dirname, '..', 'chiavetta');
const SORGENTI = ['src/dati.c', 'src/motore.c', 'src/protocollo.c'].map((f) => path.join(CHIAVETTA, f));

function trovaCompilatore() {
  const candidati = [];
  if (process.env.CC_CHIAVETTA) candidati.push(process.env.CC_CHIAVETTA.split(' '));
  candidati.push(['gcc'], ['cc'], ['clang']);
  for (const c of candidati) {
    const r = spawnSync(c[0], c.slice(1).concat(['--version']), { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'chiavetta-'));
const estensione = process.platform === 'win32' ? '.exe' : '';

/* Compila; restituisce il percorso dell'eseguibile, oppure lancia un errore con l'output del compilatore. */
function compila(cc, nome, principale) {
  const uscita = path.join(cartella, nome + estensione);
  const argomenti = cc.slice(1).concat(['-std=c11', '-O1', '-Wall', '-Wextra', '-Werror',
    '-I' + path.join(CHIAVETTA, 'src'), principale].concat(SORGENTI, ['-o', uscita]));
  const r = spawnSync(cc[0], argomenti, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error('Compilazione di ' + nome + ' non riuscita:\n' + r.stdout + r.stderr);
  return uscita;
}

/* Avvia il simulatore: { comando(riga) -> Promise<righe di risposta>, chiudi() } */
function avviaSimulatore(eseguibile) {
  const p = spawn(eseguibile, [], { stdio: ['pipe', 'pipe', 'inherit'] });
  const righe = [], attese = [];
  readline.createInterface({ input: p.stdout }).on('line', (l) => {
    righe.push(l);
    sveglia();
  });
  function sveglia() {
    while (attese.length) {
      const a = attese[0];
      const fine = a.multiple ? righe.indexOf('.') : (righe.length ? 0 : -1);
      if (fine < 0) return;
      attese.shift();
      a.ok(righe.splice(0, fine + 1).filter((l) => l !== '.'));
    }
  }
  return {
    comando(riga) {
      return new Promise((ok) => {
        attese.push({ ok, multiple: riga.startsWith('CAVO ') });
        p.stdin.write(riga + '\n');
      });
    },
    chiudi() { p.stdin.end(); p.kill(); },
  };
}

const esa = (byte) => Buffer.from(byte).toString('hex');

module.exports = { trovaCompilatore, compila, avviaSimulatore, esa, CHIAVETTA };
