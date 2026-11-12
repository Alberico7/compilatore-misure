'use strict';
// Piccolo server statico per i test: serve sito/ da http://localhost (contesto sicuro, come GitHub Pages).
const http = require('http');
const fs = require('fs');
const path = require('path');

const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm' };

/* porta 0 = una libera qualsiasi; una porta fissa tiene lo stesso "sito" (e la stessa memoria del browser) fra una prova e l'altra. */
function avviaServer(cartella, porta = 0) {
  const richieste = [];
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    richieste.push(url);
    const file = path.join(cartella, url.endsWith('/') ? url + 'index.html' : url);
    if (!file.startsWith(cartella) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('non trovato'); return;
    }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(porta, '127.0.0.1', () => {
    ok({ url: `http://localhost:${server.address().port}/`, richieste, chiudi: () => new Promise((c) => server.close(c)) });
  }));
}

module.exports = { avviaServer };
