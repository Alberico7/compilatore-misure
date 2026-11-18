'use strict';
// docs/2026-11-18-offline-liste-avvisi.md: avvisi sui valori sospetti, confronto con la macchina,
// liste salvate (con esporta e importa) e sito che funziona senza rete (service worker).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const PAGINA = pathToFileURL(path.join(__dirname, '..', 'compilatore-misure.html')).href;
const SITO = path.join(__dirname, '..', 'sito');

let browser;
test.before(async () => { browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' }); });
test.after(async () => { await browser.close(); });

async function apri(url = PAGINA, { telefono = false, ctx = null } = {}) {
  ctx = ctx || await browser.newContext(telefono
    ? { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(url);
  page.erroriJs = erroriJs;
  return page;
}

/* Incolla come da Excel (colonne separate da TAB) a partire da Angolo 1. */
async function incolla(page, coppie) {
  const testo = coppie.map((c) => c.join('\t')).join('\r\n') + '\r\n';
  await page.evaluate((testo) => {
    const el = document.querySelector('#corpo-tabella input[data-r="0"][data-c="0"]');
    el.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', testo);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, testo);
}
const cella = (r, c) => `#corpo-tabella input[data-r="${r}"][data-c="${c}"]`;
const valoriTabella = (page) => page.$$eval('#corpo-tabella tr', (tr) => tr.map((r) => [...r.querySelectorAll('input')].map((i) => i.value)).filter((r) => r[0] || r[1]));

/* ---------------- avvisi ---------------- */

test('avvisi: caselle colorate, riquadro "Da controllare" con link, codici generati lo stesso', async () => {
  const page = await apri();
  await incolla(page, [['10', '200'], ['370', '2000'], ['20', '205'], ['20', '205'], ['-5', '210']]);
  const classi = async (r, c) => (await page.getAttribute(cella(r, c), 'class')) || '';
  assert.match(await classi(1, 0), /avviso/, 'angolo oltre 360');
  assert.match(await page.innerText('#ant-1-0'), /oltre 360!/);
  assert.match(await classi(1, 1), /avviso/, 'altezza sospetta');
  assert.match(await page.innerText('#ant-1-1'), /molto diversa dalle vicine!/);
  assert.match(await classi(3, 0), /avviso/, 'coppia uguale: angolo');
  assert.match(await classi(3, 1), /avviso/, 'coppia uguale: altezza');
  assert.match(await page.innerText('#ant-3-1'), /uguale alla coppia sopra!/);
  assert.doesNotMatch(await classi(0, 0), /avviso/);
  assert.doesNotMatch(await classi(2, 1), /avviso/, 'la prima delle due coppie uguali non è segnata');
  // riquadri: "Da controllare" (3 voci) e il solito dei negativi
  const voci = await page.$$eval('#da-controllare li', (li) => li.map((x) => x.textContent));
  assert.deepEqual(voci, [
    'Angolo 2: 370.00 è oltre 360',
    'Altezza 2: 2000.00 è molto diversa dalle vicine (200.00 e 205.00): controlla la virgola',
    'Coppia 4 uguale alla 3',
  ]);
  assert.match(await page.innerText('#riepilogo'), /Valori negativi:[\s\S]*Angolo 5/);
  // il link porta alla casella
  await page.click('#da-controllare li:nth-child(2) a');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cella-1-1');
  // sono avvisi: i codici ci sono
  await page.click('#tab-barre');
  assert.equal(await page.locator('#uscita-barre .cella-barra').count(), 10);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* ---------------- confronta con la macchina ---------------- */

test('confronto: lista grande come in macchina, spunte che restano finché i valori non cambiano', async () => {
  const page = await apri(PAGINA, { telefono: true });
  assert.equal(await page.locator('#btn-verifica').count(), 0, 'senza valori niente pulsante');
  await incolla(page, [['20', '150,5'], ['x', '1']]);
  assert.equal(await page.locator('#btn-verifica').count(), 0, 'con errori niente pulsante');
  await page.fill(cella(1, 0), '45');
  await page.fill(cella(2, 0), '45'); await page.fill(cella(2, 1), '1');   // coppia uguale alla 2
  await page.click('#btn-verifica');
  assert.equal(await page.locator('#verifica').isVisible(), true);
  const righe = () => page.$$eval('#verifica-elenco .riga-verifica', (b) => b.map((x) => [...x.querySelectorAll('.n, .val')].map((s) => s.textContent)));
  assert.deepEqual(await righe(), [['1', '20.00', '150.50'], ['2', '45.00', '1.00'], ['3', '45.00', '1.00']]);
  assert.equal(await page.innerText('#verifica-conto'), '0 di 3 controllate');
  assert.match(await page.getAttribute('#verifica-elenco [data-i="2"]', 'class'), /avviso/);
  assert.match(await page.innerText('#verifica-elenco [data-i="2"]'), /uguale alla coppia sopra/);
  // niente scorrimento orizzontale su un telefono da 360 px
  assert.ok(await page.evaluate(() => document.querySelector('.verifica-lista').scrollWidth <= document.querySelector('.verifica-lista').clientWidth + 1));
  // spunta, togli, rimetti
  await page.click('#verifica-elenco [data-i="0"]');
  await page.click('#verifica-elenco [data-i="1"]');
  await page.click('#verifica-elenco [data-i="1"]');
  await page.click('#verifica-elenco [data-i="2"]');
  assert.equal(await page.innerText('#verifica-conto'), '2 di 3 controllate');
  assert.equal(await page.getAttribute('#verifica-elenco [data-i="0"]', 'aria-pressed'), 'true');
  assert.equal(await page.getAttribute('#verifica-elenco [data-i="1"]', 'aria-pressed'), 'false');
  // chiudo e riapro: restano
  await page.click('#verifica-chiudi');
  assert.equal(await page.locator('#verifica').isVisible(), false);
  await page.click('#btn-verifica');
  assert.equal(await page.innerText('#verifica-conto'), '2 di 3 controllate');
  await page.click('#verifica-azzera');
  assert.equal(await page.innerText('#verifica-conto'), '0 di 3 controllate');
  await page.click('#verifica-elenco [data-i="0"]');
  await page.keyboard.press('Escape');
  // cambio un valore: le spunte si azzerano
  await page.fill(cella(0, 1), '150,6');
  await page.click('#btn-verifica');
  assert.equal(await page.innerText('#verifica-conto'), '0 di 3 controllate');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* ---------------- liste salvate ---------------- */

async function salvaCome(page, nome) {
  await page.click('#lista-salva-come');
  await page.fill('#nome-lista-campo', nome);
  await page.click('#nome-lista-form button[type=submit]');
}

test('liste: salva, modifiche non salvate, salva come con nome già usato, apri, svuota, elimina', async () => {
  const page = await apri();
  await page.click('#btn-liste');
  assert.match(await page.innerText('#elenco-liste'), /Nessuna lista salvata/);
  // tabella vuota: niente da salvare
  await salvaCome(page, 'Vuota');
  assert.match(await page.innerText('#esito-liste'), /tabella è vuota/);

  await incolla(page, [['20', '150'], ['45', '151']]);
  await salvaCome(page, 'Flangia 1234');
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Flangia 1234');
  assert.match(await page.innerText('#elenco-liste'), /Flangia 1234 · aperta\s+2 coppie/);
  // modifica: compare "modifiche non salvate", Salva lo toglie senza chiedere il nome
  await page.fill(cella(1, 1), '152');
  assert.match(await page.innerText('#lista-attuale'), /modifiche non salvate/);
  await page.click('#lista-salva');
  assert.equal(await page.locator('#nome-lista').isVisible(), false);
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Flangia 1234');

  // seconda lista, in "come in macchina" con 3 decimali sull'altezza
  await page.click('#btn-svuota'); await page.click('#conferma-si');
  assert.equal(await page.locator('#lista-attuale').isVisible(), false, 'Svuota tutto chiude la lista');
  assert.match(await page.innerText('#elenco-liste'), /Flangia 1234/, '...ma non la cancella');
  await page.check('#modo-macchina');
  await page.fill('#dec-alt', '3'); await page.dispatchEvent('#dec-alt', 'change');
  await incolla(page, [['9000', '1500']]);
  await salvaCome(page, 'Albero');
  // "Salva come" con un nome già usato (maiuscole diverse): chiede se sostituire
  await salvaCome(page, 'flangia 1234');
  assert.match(await page.innerText('#conferma-testo'), /Esiste già una lista "Flangia 1234"/);
  await page.click('#conferma-no');
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Albero');

  // valori non salvati, poi Apri: chiede conferma
  await page.fill(cella(0, 0), '9001');
  await page.click('#elenco-liste button[data-apri="Flangia 1234"]');
  assert.match(await page.innerText('#conferma-testo'), /Sostituire i valori attuali/);
  await page.click('#conferma-si');
  assert.deepEqual(await valoriTabella(page), [['20', '150'], ['45', '152']]);
  assert.equal(await page.isChecked('#modo-separatore'), true, 'il modo torna quello della lista');
  assert.equal(await page.inputValue('#dec-alt'), '2');
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Flangia 1234');
  // valori già salvati in una lista: Apri non chiede niente
  await page.click('#elenco-liste button[data-apri="Albero"]');
  assert.equal(await page.locator('#conferma').isVisible(), false);
  assert.deepEqual(await valoriTabella(page), [['9000', '1500']]);
  assert.equal(await page.isChecked('#modo-macchina'), true);
  assert.equal(await page.inputValue('#dec-alt'), '3');
  // la più recente in alto
  assert.deepEqual(await page.$$eval('#elenco-liste .nome', (n) => n.map((x) => x.firstChild.textContent.trim())), ['Albero', 'Flangia 1234']);

  // dopo un riavvio tutto è ancora lì
  await page.reload();
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Albero');
  await page.click('#btn-liste');
  // elimina: chiede conferma, la tabella resta
  await page.click('#elenco-liste button[data-elimina="Albero"]');
  await page.click('#conferma-si');
  assert.equal(await page.locator('#lista-attuale').isVisible(), false);
  assert.deepEqual(await valoriTabella(page), [['9000', '1500']]);
  assert.deepEqual(await page.$$eval('#elenco-liste .nome', (n) => n.map((x) => x.firstChild.textContent.trim())), ['Flangia 1234']);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('liste: la ricerca compare oltre 8 liste e filtra per nome', async () => {
  const page = await apri();
  await page.click('#btn-liste');
  for (let i = 1; i <= 9; i++) {
    await page.fill(cella(0, 0), String(i)); await page.fill(cella(0, 1), '1');
    await salvaCome(page, 'Pezzo ' + i);
    if (i === 8) assert.equal(await page.locator('#lista-cerca').isVisible(), false);
  }
  assert.equal(await page.locator('#lista-cerca').isVisible(), true);
  await page.fill('#lista-cerca', 'zzo 3');
  assert.deepEqual(await page.$$eval('#elenco-liste .nome', (n) => n.map((x) => x.firstChild.textContent.trim())), ['Pezzo 3']);
  await page.fill('#lista-cerca', 'niente');
  assert.match(await page.innerText('#elenco-liste'), /Nessuna lista con questo nome/);
  await page.context().close();
});

test('liste: esporta e importa su un altro dispositivo, senza cancellare niente', async () => {
  const a = await apri();
  await a.click('#btn-liste');
  await incolla(a, [['20', '150'], ['45', '151']]);
  await salvaCome(a, 'Flangia');
  await incolla(a, [['1', '2']]);
  await a.fill(cella(1, 0), ''); await a.fill(cella(1, 1), '');
  await salvaCome(a, 'Piccola');
  // Il file esportato si prende dal link prima che diventi uno scaricamento del browser: con un vero
  // scaricamento, Playwright 1.49 lascia un errore interno non gestito alla chiusura della pagina
  // (riprodotto anche con una pagina vuota, senza il sito).
  await a.evaluate(() => {
    HTMLAnchorElement.prototype.click = function () {
      const link = this;
      window.__esportato = fetch(link.href).then((r) => r.text()).then((testo) => ({ nome: link.download, testo }));
    };
  });
  await a.click('#lista-esporta');
  const esportato = await a.evaluate(() => window.__esportato);
  assert.match(esportato.nome, /^liste-misure-\d{4}-\d\d-\d\d\.json$/);
  assert.match(await a.innerText('#esito-liste'), /Esportate 2 liste nel file liste-misure-/);
  const file = path.join(os.tmpdir(), 'liste-prova-' + process.pid + '.json');
  fs.writeFileSync(file, esportato.testo);
  const dati = JSON.parse(esportato.testo);
  assert.equal(dati.formato, 'compilatore-misure-liste');
  assert.deepEqual(dati.liste.map((l) => l.nome).sort(), ['Flangia', 'Piccola']);
  await a.context().close();

  // altro dispositivo: ha già "Flangia" con coppie diverse
  const b = await apri();
  await b.click('#btn-liste');
  await incolla(b, [['99', '99']]);
  await salvaCome(b, 'Flangia');
  // come fa il pulsante "Importa": si azzera la scelta precedente, poi si sceglie il file
  // (senza aspettare la finestra di scelta: Playwright la lascerebbe in sospeso alla chiusura della pagina)
  const importa = async (f) => {
    await b.evaluate(() => { document.getElementById('lista-file').value = ''; });
    await b.setInputFiles('#lista-file', f);
    await b.waitForFunction(() => document.getElementById('esito-liste').textContent !== '');
  };
  await b.evaluate(() => { document.getElementById('esito-liste').textContent = ''; });
  await importa(file);
  assert.match(await b.innerText('#esito-liste'), /Importate 2 liste\./);
  assert.deepEqual(await b.$$eval('#elenco-liste .nome', (n) => n.map((x) => x.firstChild.textContent.trim())).then((x) => x.sort()),
    ['Flangia', 'Flangia (2)', 'Piccola']);
  // reimportando lo stesso file: tutto già presente, anche la "Flangia" diventata "Flangia (2)"
  await b.evaluate(() => { document.getElementById('esito-liste').textContent = ''; });
  await importa(file);
  assert.match(await b.innerText('#esito-liste'), /Importate 0 liste, 2 saltate perché già presenti\./);
  // i valori della tabella (la "Flangia" di questo dispositivo) sono salvati: Apri non chiede niente
  await b.click('#elenco-liste button[data-apri="Flangia (2)"]');
  assert.equal(await b.locator('#conferma').isVisible(), false);
  assert.deepEqual(await valoriTabella(b), [['20', '150'], ['45', '151']]);
  // file sbagliato
  const sbagliato = path.join(os.tmpdir(), 'liste-sbagliate-' + process.pid + '.json');
  fs.writeFileSync(sbagliato, '{"ciao": 1}');
  await b.evaluate(() => { document.getElementById('esito-liste').textContent = ''; });
  await importa(sbagliato);
  assert.match(await b.innerText('#esito-liste'), /non contiene liste/);
  fs.rmSync(file); fs.rmSync(sbagliato);
  assert.deepEqual(b.erroriJs, []);
  await b.context().close();
});

/* ---------------- senza rete ---------------- */

/* Server statico con un interruttore: "spento" chiude la connessione (come senza rete), "lento" non risponde. */
function serverConInterruttore(cartella) {
  const stato = { spento: false, lento: false, appese: [] };
  const server = http.createServer((req, res) => {
    if (stato.spento) { req.socket.destroy(); return; }
    if (stato.lento) { stato.appese.push(res); return; }
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(cartella, url.endsWith('/') ? url + 'index.html' : url);
    if (!file.startsWith(cartella) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    const tipi = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
    res.writeHead(200, { 'Content-Type': tipi[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({
    url: `http://localhost:${server.address().port}/`, stato,
    chiudi: () => { stato.appese.forEach((r) => r.destroy()); server.closeAllConnections(); return new Promise((c) => server.close(c)); },
  })));
}

test('senza rete: la pagina si apre dalla copia salvata, anche con la rete lenta; si aggiorna quando cambia', async () => {
  // copia del sito, per poterla cambiare (senza firmware: non serve)
  const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'sito-senza-rete-'));
  fs.cpSync(SITO, cartella, { recursive: true, filter: (f) => !f.endsWith('.uf2') });
  const srv = await serverConInterruttore(cartella);
  const page = await apri(srv.url);
  await page.waitForFunction(() => document.getElementById('stato-offline').textContent === 'La pagina funziona anche senza rete.', null, { timeout: 15000 });
  await page.evaluate(async () => { const c = await caches.open('compilatore-misure-voce'); await c.put('/finto-modello', new Response('x')); });
  const cacheSito = async () => (await page.evaluate(() => caches.keys())).filter((k) => k.startsWith('compilatore-sito-'));
  const prima = await cacheSito();
  assert.equal(prima.length, 1);

  // senza rete: la pagina si apre e funziona
  srv.stato.spento = true;
  await page.reload();
  await incolla(page, [['20', '150']]);
  assert.match(await page.innerText('#ant-0-0'), /In macchina: 20\.00/);
  await page.click('#tab-barre');
  assert.equal(await page.locator('#uscita-barre .cella-barra').count(), 2);
  assert.equal(await page.locator('link[rel=manifest]').count(), 1);

  // rete lenta: dopo 3 secondi usa la copia
  srv.stato.spento = false; srv.stato.lento = true;
  const t0 = Date.now();
  await page.reload();
  assert.ok(Date.now() - t0 < 8000, 'pagina aperta dalla copia');
  assert.equal(await page.locator('#sez-dati').count(), 1);
  srv.stato.lento = false;
  srv.stato.appese.splice(0).forEach((r) => r.destroy());   // le richieste rimaste appese

  // nuova versione pubblicata: con la rete si vede subito, e la copia si aggiorna
  const indice = path.join(cartella, 'index.html');
  fs.writeFileSync(indice, fs.readFileSync(indice, 'utf8').replace('<title>Compilatore misure</title>', '<title>Compilatore misure nuovo</title>'));
  const sw = path.join(cartella, 'sw.js');
  fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/var VERSIONE = '[0-9a-f]+'/, "var VERSIONE = 'prova2'"));
  await page.reload();
  assert.equal(await page.title(), 'Compilatore misure nuovo');
  await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await page.waitForFunction(async () => (await caches.keys()).includes('compilatore-sito-prova2') &&
    (await caches.keys()).filter((k) => k.startsWith('compilatore-sito-')).length === 1, null, { timeout: 15000 });
  srv.stato.spento = true;
  await page.reload();
  assert.equal(await page.title(), 'Compilatore misure nuovo', 'la copia è quella nuova');
  // il modello della dettatura non è stato toccato
  assert.equal(await page.evaluate(async () => !!(await (await caches.open('compilatore-misure-voce')).match('/finto-modello'))), true);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
  await srv.chiudi();
  fs.rmSync(cartella, { recursive: true, force: true });
});

test('file aperto dal PC: nessun service worker, le liste funzionano', async () => {
  const page = await apri();
  assert.equal(await page.innerText('#stato-offline'), '');
  assert.equal(await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), false);
  await page.click('#btn-liste');
  await incolla(page, [['1', '2']]);
  await salvaCome(page, 'Dal PC');
  await page.reload();
  assert.equal(await page.innerText('#lista-attuale'), 'Lista: Dal PC');
  await page.context().close();
});
