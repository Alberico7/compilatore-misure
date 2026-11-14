'use strict';
// Semplicità d'uso (docs/2026-11-12-semplicita-uso.md): tabella subito visibile, poche righe vuote,
// indice e schede su una riga, scelta del metodo, scheda Chiavetta con prima l'azione.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const PAGINA = pathToFileURL(path.join(__dirname, '..', 'compilatore-misure.html')).href;
const CARTELLA_SCREENSHOT = path.join(__dirname, 'screenshot');
const CHIAVE = 'compilatore-misure-v1';

let browser;
test.before(async () => {
  browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  fs.mkdirSync(CARTELLA_SCREENSHOT, { recursive: true });
});
test.after(async () => { await browser.close(); });

/* salvato: oggetto da mettere nel localStorage prima di aprire (utente che torna), oppure null (prima volta). */
async function apri(larghezza, { telefono = true, salvato = null, altezza = 844 } = {}) {
  const ctx = await browser.newContext(telefono
    ? { viewport: { width: larghezza, height: altezza }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: larghezza, height: 900 }, reducedMotion: 'reduce' });
  if (salvato) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [CHIAVE, JSON.stringify(salvato)]);
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(PAGINA);
  page.erroriJs = erroriJs;
  return page;
}

const UTENTE_CHE_TORNA = { righe: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']], modo: 'separatore', decAng: 2, decAlt: 2 };

test('prima volta: 5 righe e impostazioni aperte, con riepilogo che segue le scelte e si ricorda', async () => {
  const page = await apri(390);
  assert.equal(await page.locator('#corpo-tabella tr').count(), 5);
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), true, 'aperte al primo uso');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Con separatore · decimali 2 / 2 · 5 righe');
  await page.tap('#modo-macchina');
  await page.fill('#dec-alt', '3');
  await page.dispatchEvent('#dec-alt', 'change');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Come in macchina · decimali 2 / 3 · 5 righe');
  await page.tap('#imp-valori summary');
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), false);
  await page.reload();
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), false, 'chiuse dopo la ricarica');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Come in macchina · decimali 2 / 3 · 5 righe');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('chi torna: impostazioni chiuse e Angolo 1 visibile senza scorrere, anche su un telefono piccolo', async () => {
  for (const [l, a] of [[390, 844], [360, 740]]) {
    const page = await apri(l, { salvato: UTENTE_CHE_TORNA, altezza: a });
    assert.equal(await page.$eval('#imp-valori', (d) => d.open), false);
    const box = await page.locator('#cella-0-0').boundingBox();
    assert.ok(box.y + box.height <= a, `Angolo 1 visibile a ${l}×${a} (fondo a ${Math.round(box.y + box.height)})`);
    if (l === 390) await page.screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'semplicita-apertura-telefono.png') });
    await page.context().close();
  }
});

test('righe: INVIO e Avanti sull\'ultima Altezza aggiungono una riga; pagina molto più corta', async () => {
  const page = await apri(390, { salvato: UTENTE_CHE_TORNA });
  await page.tap('#cella-4-1');
  await page.keyboard.type('1');
  await page.tap('#mob-avanti');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 6);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cella-5-0');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 7, 'anche con INVIO');
  // due coppie scritte: con 5 righe la pagina è molto più corta che con le 20 di prima
  // (confronto nello stesso browser: le misure assolute cambiano con i caratteri installati)
  const due = [['214,94', '26,94'], ['313,16', '82,38']];
  const lunghezza = async (n) => {
    const righe = due.concat(Array.from({ length: n - 2 }, () => ['', '']));
    const p = await apri(390, { salvato: { righe, modo: 'separatore', decAng: 2, decAlt: 2 } });
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.context().close();
    return h;
  };
  const con5 = await lunghezza(5), con20 = await lunghezza(20);
  assert.ok(con5 < con20 * 0.8, `pagina con 5 righe ${con5} px, con 20 righe ${con20} px`);
  await page.context().close();
});

test('indice e schede su una riga, senza scorrimento orizzontale della pagina', async () => {
  for (const l of [320, 360, 390, 1200]) {
    const page = await apri(l, { telefono: l < 1000, salvato: UTENTE_CHE_TORNA });
    const righeIndice = await page.$$eval('nav.indice a', (as) => new Set(as.map((a) => Math.round(a.getBoundingClientRect().top))).size);
    assert.equal(righeIndice, 1, 'indice su una riga a ' + l + ' px');
    if (l >= 360) {
      const righeSchede = await page.$$eval('.schede button', (bs) => new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))).size);
      assert.equal(righeSchede, 1, 'schede su una riga a ' + l + ' px');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'nessuno scorrimento orizzontale a ' + l);
    if (l < 1000) {
      assert.deepEqual(await page.$$eval('nav.indice a', (as) => as.map((a) => a.innerText.trim())), ['1 Valori', '2 Macchina', '3 Prova', '4 Guida']);
    }
    await page.context().close();
  }
});

test('"quale metodo": ogni nome apre la sua scheda; tema solo icona', async () => {
  const page = await apri(1200, { telefono: false, salvato: UTENTE_CHE_TORNA });
  assert.match(await page.locator('.metodi').innerText(), /Chiavetta \(consigliata\) · Lettore 1D → Codici a barre · Lettore 2D → QR/);
  for (const [scheda, pannello] of [['chiavetta', 'pannello-chiavetta'], ['qr', 'pannello-qr'], ['barre', 'pannello-barre']]) {
    await page.click(`.metodi a[data-apri-scheda="${scheda}"]`);
    assert.equal(await page.locator('#' + pannello).isVisible(), true, scheda);
    assert.equal(await page.getAttribute('#tab-' + scheda, 'aria-selected'), 'true');
  }
  assert.deepEqual(await page.$$eval('.schede button', (bs) => bs.map((b) => b.innerText.trim())), ['Chiavetta', 'Codici a barre', 'QR']);
  assert.equal(await page.locator('#btn-tema').innerText(), '☀');
  assert.equal(await page.getAttribute('#btn-tema', 'title'), 'Passa al tema chiaro');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* docs/2026-11-14-chiavetta-predefinita.md */
test('Chiavetta predefinita: per i nuovi, una volta sola per chi tornava, codici senza Bluetooth né cavo', async () => {
  const scheda = (p) => p.evaluate(() => document.querySelector('.schede [aria-selected="true"]').dataset.scheda);
  // prima volta (Edge e Chromium hanno navigator.bluetooth / navigator.usb)
  let page = await apri(390);
  assert.equal(await scheda(page), 'chiavetta');
  assert.equal(await page.locator('#pannello-chiavetta').isVisible(), true);
  await page.context().close();
  // chi aveva "barre" salvato (era la predefinita): passa alla Chiavetta, poi la scelta resta
  page = await apri(390, { salvato: Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'barre' }) });
  assert.equal(await scheda(page), 'chiavetta', 'spostamento una tantum');
  await page.tap('#tab-qr');
  const salvatoOra = await page.evaluate((k) => localStorage.getItem(k), CHIAVE);
  await page.context().close();
  page = await apri(390, { salvato: JSON.parse(salvatoOra) });
  assert.equal(await scheda(page), 'qr', 'dopo lo spostamento si ricorda la scelta');
  await page.context().close();
  // browser senza Bluetooth né cavo (Firefox, iPhone): si parte dai codici
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    for (const k of ['bluetooth', 'usb']) Object.defineProperty(Navigator.prototype, k, { get: () => undefined, configurable: true });
  });
  page = await ctx.newPage();
  await page.goto(PAGINA);
  assert.equal(await scheda(page), 'barre');
  await ctx.close();
});

test('scheda Chiavetta: prima collegamento e pulsanti, impostazioni di scrittura chiuse con riepilogo', async () => {
  const page = await apri(390, { salvato: Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'chiavetta', righe: [['1', '2']] }) });
  const ordine = await page.evaluate(() => ['ch-mezzo', 'btn-ch-invia', 'esito-chiavetta', 'ch-scrittura']
    .map((id) => document.getElementById(id).getBoundingClientRect().top));
  assert.deepEqual([...ordine].sort((a, b) => a - b), ordine, 'collegamento, pulsanti, esito, impostazioni');
  assert.equal(await page.$eval('#ch-scrittura', (d) => d.open), false);
  assert.equal(await page.locator('#ch-imp-riepilogo').innerText(), 'pause 30 / 200 ms · tutte le coppie');
  await page.tap('#ch-scrittura summary');
  await page.fill('#ch-coppie', '10');
  await page.dispatchEvent('#ch-coppie', 'change');
  assert.equal(await page.locator('#ch-imp-riepilogo').innerText(), 'pause 30 / 200 ms · 10 coppie per pressione');
  await page.locator('#sez-codici').screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'semplicita-chiavetta-telefono.png') });
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});
