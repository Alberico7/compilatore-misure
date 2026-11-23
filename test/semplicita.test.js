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
const { CHIAVE } = require('./aiuti-pagina');

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
  // Chromium headless su Linux (CI) può non avere Web Bluetooth / WebUSB: qui si simula un browser che li ha
  // (la pagina li usa solo quando si preme un pulsante della Chiavetta)
  await ctx.addInitScript(() => {
    if (!navigator.usb && !navigator.bluetooth) {
      Object.defineProperty(Navigator.prototype, 'usb', { get: () => ({ requestDevice: () => Promise.reject(new Error('finto')) }), configurable: true });
    }
  });
  if (salvato) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [CHIAVE, JSON.stringify(salvato)]);
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(PAGINA);
  page.erroriJs = erroriJs;
  return page;
}

const UTENTE_CHE_TORNA = { righe: [['', ''], ['', ''], ['', ''], ['', ''], ['', '']], modo: 'separatore', decGra: 2, decDat: 2 };

test('prima volta: 5 righe e impostazioni chiuse, con riepilogo che segue le scelte e si ricorda', async () => {
  // docs/2026-11-23-righe-automatiche.md: il riquadro Cambia parte chiuso, niente casella Righe
  const page = await apri(390);
  assert.equal(await page.locator('#corpo-tabella tr').count(), 5);
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), false, 'chiuse anche al primo uso');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Con separatore · decimali 0 / 1');
  assert.equal(await page.locator('#num-righe').count(), 0);
  await page.tap('#imp-valori summary');
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), true);
  await page.tap('#modo-macchina');
  await page.fill('#dec-dat', '3');
  await page.dispatchEvent('#dec-dat', 'change');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Come in macchina · decimali 0 / 3');
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).impAperte === true, CHIAVE);
  await page.reload();
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), true, 'lasciato aperto: resta aperto');
  await page.tap('#imp-valori summary');
  // l'evento "toggle" arriva dopo il tocco: si aspetta che la scelta sia salvata
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k)).impAperte === false, CHIAVE);
  await page.reload();
  assert.equal(await page.$eval('#imp-valori', (d) => d.open), false, 'chiuso dopo la ricarica');
  assert.equal(await page.locator('#imp-riepilogo').innerText(), 'Come in macchina · decimali 0 / 3');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('chi torna: impostazioni chiuse e Grado 1 visibile senza scorrere, anche su un telefono piccolo', async () => {
  for (const [l, a] of [[390, 844], [360, 740]]) {
    const page = await apri(l, { salvato: UTENTE_CHE_TORNA, altezza: a });
    assert.equal(await page.$eval('#imp-valori', (d) => d.open), false);
    const box = await page.locator('#cella-0-0').boundingBox();
    assert.ok(box.y + box.height <= a, `Grado 1 visibile a ${l}×${a} (fondo a ${Math.round(box.y + box.height)})`);
    if (l === 390) await page.screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'semplicita-apertura-telefono.png') });
    await page.context().close();
  }
});

test('righe: INVIO e Avanti sull\'ultimo Dato aggiungono una riga; pagina molto più corta', async () => {
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
    const p = await apri(390, { salvato: { righe, modo: 'separatore', decGra: 2, decDat: 2 } });
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
    const righeIndice = await page.$$eval('nav.indice a', (as) => new Set(as.filter((a) => a.offsetParent).map((a) => Math.round(a.getBoundingClientRect().top))).size);
    assert.equal(righeIndice, 1, 'indice su una riga a ' + l + ' px');
    if (l >= 360) {
      const righeSchede = await page.$$eval('.schede button', (bs) => new Set(bs.map((b) => Math.round(b.getBoundingClientRect().top))).size);
      assert.equal(righeSchede, 1, 'schede su una riga a ' + l + ' px');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, 'nessuno scorrimento orizzontale a ' + l);
    if (l < 1000) {
      assert.deepEqual(await page.$$eval('nav.indice a', (as) => as.filter((a) => a.offsetParent).map((a) => a.innerText.trim())), ['1 Valori', '2 Macchina', '3 Guida'], 'sul telefono niente Prova del lettore');
    }
    await page.context().close();
  }
});

test('schede della sezione 2: ognuna dice per cosa serve; tema solo icona', async () => {
  const page = await apri(1200, { telefono: false, salvato: UTENTE_CHE_TORNA });
  assert.equal(await page.locator('.metodi').count(), 0, 'niente riga che ripete le schede');
  for (const [scheda, pannello, frase] of [['chiavetta', 'pannello-chiavetta', /La chiavetta \(consigliata\) scrive/], ['qr', 'pannello-qr', /^Per il lettore 2D: più coppie in ogni codice\./], ['barre', 'pannello-barre', /^Per il lettore 1D: un codice per ogni valore\./]]) {
    await page.click('#tab-' + scheda);
    assert.equal(await page.locator('#' + pannello).isVisible(), true, scheda);
    assert.equal(await page.getAttribute('#tab-' + scheda, 'aria-selected'), 'true');
    assert.match(await page.locator('#' + pannello + ' .nota').first().innerText(), frase);
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

test('pausa dopo INVIO: 30 ms predefiniti, i 200 ms di prima passano a 30 una volta sola', async () => {
  const page = await apri(390);
  const pausa = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)).chRitInv, CHIAVE);
  const salvaCon = (v) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [CHIAVE, v]);
  await page.click('#tab-chiavetta');
  assert.equal(await page.inputValue('#ch-rit-car'), '30');
  assert.equal(await page.inputValue('#ch-rit-inv'), '30');
  // chi aveva i 200 ms di prima passa a 30; chi aveva un altro valore lo tiene
  await salvaCon(Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'chiavetta', chRitInv: 200 }));
  await page.reload();
  assert.equal(await page.inputValue('#ch-rit-inv'), '30');
  await salvaCon(Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'chiavetta', chRitInv: 400 }));
  await page.reload();
  assert.equal(await page.inputValue('#ch-rit-inv'), '400');
  // dopo il passaggio, 200 rimesso a mano resta
  await salvaCon(Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'chiavetta', chRitInv: 200 }));
  await page.reload();
  await page.evaluate(() => { document.getElementById('ch-scrittura').open = true; });
  await page.fill('#ch-rit-inv', '200');
  await page.dispatchEvent('#ch-rit-inv', 'change');
  assert.equal(await pausa(), 200);
  await page.reload();
  assert.equal(await page.inputValue('#ch-rit-inv'), '200');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('decimali: 0 per i gradi e 1 per i dati; i 2 / 2 di prima passano a 0 / 1 solo con la tabella vuota', async () => {
  // docs/2026-11-23-gradi-e-dati.md
  const page = await apri(390);
  const dec = async () => [await page.inputValue('#dec-gra'), await page.inputValue('#dec-dat')];
  const salvaCon = (v) => page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [CHIAVE, v]);
  assert.deepEqual(await dec(), ['0', '1'], 'prima volta');
  const vuota = UTENTE_CHE_TORNA.righe;
  const piena = [['20.00', '15.50'], ['', '']];
  // impostazioni salvate con i nomi vecchi (decAng / decAlt)
  await salvaCon({ righe: vuota, modo: 'separatore', decAng: 2, decAlt: 2 });
  await page.reload();
  assert.deepEqual(await dec(), ['0', '1'], '2 / 2 con la tabella vuota: si passa a 0 / 1');
  await salvaCon({ righe: piena, modo: 'separatore', decAng: 2, decAlt: 2 });
  await page.reload();
  assert.deepEqual(await dec(), ['2', '2'], 'con dei valori restano 2 / 2');
  assert.equal(await page.inputValue('#cella-0-0'), '20.00');
  await salvaCon({ righe: vuota, modo: 'separatore', decAng: 1, decAlt: 3 });
  await page.reload();
  assert.deepEqual(await dec(), ['1', '3'], 'altri decimali scelti: restano');
  // al primo salvataggio si scrivono i nomi nuovi
  await page.evaluate(() => { document.getElementById('imp-valori').open = true; });
  await page.check('#modo-macchina');
  const salvato = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), CHIAVE);
  assert.equal(salvato.decGra, 1); assert.equal(salvato.decDat, 3);
  assert.equal(salvato.decAng, undefined); assert.equal(salvato.decAlt, undefined);
  assert.equal(salvato.decimali01, true);
  // dopo il passaggio, 2 / 2 rimessi a mano restano anche con la tabella vuota
  await salvaCon(Object.assign({}, salvato, { righe: vuota, decGra: 2, decDat: 2 }));
  await page.reload();
  assert.deepEqual(await dec(), ['2', '2']);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('scheda Chiavetta: prima collegamento e pulsanti, impostazioni di scrittura chiuse con riepilogo', async () => {
  const page = await apri(390, { salvato: Object.assign({}, UTENTE_CHE_TORNA, { scheda: 'chiavetta', righe: [['1', '2']] }) });
  const ordine = await page.evaluate(() => ['ch-mezzo', 'btn-ch-invia', 'esito-chiavetta', 'ch-scrittura']
    .map((id) => document.getElementById(id).getBoundingClientRect().top));
  assert.deepEqual([...ordine].sort((a, b) => a - b), ordine, 'collegamento, pulsanti, esito, impostazioni');
  assert.equal(await page.$eval('#ch-scrittura', (d) => d.open), false);
  assert.equal(await page.locator('#ch-imp-riepilogo').innerText(), 'pause 30 / 30 ms · tutte le coppie');
  await page.tap('#ch-scrittura summary');
  await page.fill('#ch-coppie', '10');
  await page.dispatchEvent('#ch-coppie', 'change');
  assert.equal(await page.locator('#ch-imp-riepilogo').innerText(), 'pause 30 / 30 ms · 10 coppie per pressione');
  await page.locator('#sez-codici').screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'semplicita-chiavetta-telefono.png') });
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* docs/2026-11-14-logo-pettirosso.md */
test('logo: accanto al titolo, icona del browser e icone per la schermata Home sul sito', async () => {
  const page = await apri(320, { salvato: UTENTE_CHE_TORNA });
  const logo = page.locator('h1 .logo');
  assert.equal(await logo.isVisible(), true);
  assert.ok(await logo.evaluate((i) => i.complete && i.naturalWidth > 0), 'il logo si carica');
  const box = await logo.boundingBox(), tema = await page.locator('#btn-tema').boundingBox();
  assert.ok(box.x + box.width < tema.x, 'il logo non tocca il pulsante del tema');
  assert.match(await page.getAttribute('link[rel="icon"]', 'href'), /^data:image\/svg\+xml;base64,/);
  assert.equal(await page.locator('link[rel="apple-touch-icon"]').count(), 0, 'nel file per il PC niente PNG esterne');
  await page.context().close();
  const sito = fs.readFileSync(path.join(__dirname, '..', 'sito', 'index.html'), 'utf8');
  for (const f of ['icona-180.png', 'icona-192.png']) {
    assert.ok(sito.includes(`href="${f}"`), f + ' collegata nel sito');
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'sito', f)), f + ' presente nel sito');
  }
});

/* Android: senza icona "maskable" nel manifest aggiunge un bordo bianco (come risolto nell'Etichettatrice) */
test('manifest con icone ritagliabili; il pettirosso sta nella zona sicura', async () => {
  const sito = path.join(__dirname, '..', 'sito');
  assert.match(fs.readFileSync(path.join(sito, 'index.html'), 'utf8'), /<link rel="manifest" href="manifest.webmanifest">/);
  const m = JSON.parse(fs.readFileSync(path.join(sito, 'manifest.webmanifest'), 'utf8'));
  assert.equal(m.display, 'browser', 'la pagina si apre come prima, nel browser');
  assert.ok(m.icons.some((i) => i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
  const page = await browser.newPage();
  for (const i of m.icons) {
    const file = path.join(sito, i.src);
    assert.ok(fs.existsSync(file), i.src);
    const [l] = i.sizes.split('x').map(Number);
    const misura = await page.evaluate(async (u) => { const im = new Image(); im.src = u; await im.decode(); return [im.naturalWidth, im.naturalHeight]; },
      'data:image/png;base64,' + fs.readFileSync(file).toString('base64'));
    assert.deepEqual(misura, [l, l], i.src + ' ' + i.sizes);
  }
  // fuori dal cerchio di raggio 40 % (zona sicura) c'è solo il blu dello sfondo
  const fuori = await page.evaluate(async (u) => {
    const im = new Image(); im.src = u; await im.decode();
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, 512, 512).data;
    let n = 0;
    for (let y = 0; y < 512; y += 2) for (let x = 0; x < 512; x += 2) {
      if (Math.hypot(x - 256, y - 256) <= 512 * 0.4) continue;
      const k = (y * 512 + x) * 4;
      if (Math.abs(d[k] - 0x27) + Math.abs(d[k + 1] - 0x4e) + Math.abs(d[k + 2] - 0x76) > 12) n++;
    }
    return n;
  }, 'data:image/png;base64,' + fs.readFileSync(path.join(sito, 'icona-ritagliabile-512.png')).toString('base64'));
  assert.equal(fuori, 0, 'nessun pixel del disegno fuori dalla zona sicura');
  await page.close();
});

/* docs/2026-11-20-pagina-piu-semplice.md */
test('pagina più semplice: frecce, caselle, sicurezza, prova del lettore', async () => {
  // telefono, prima volta
  let page = await apri(390);
  assert.equal(await page.locator('#btn-aggiungi').count(), 0, 'niente "+ Aggiungi riga"');
  assert.equal(await page.locator('#btn-togli').count(), 0, 'niente "− Elimina ultima riga"');
  assert.equal(await page.locator('#sez-prova').isVisible(), false, 'sul telefono niente Prova del lettore');
  assert.match(await page.locator('#sez-guida h2').innerText(), /^3\s*Guida$/);
  assert.equal((await page.locator('.sicurezza').innerText()).trim(), 'Sicurezza: prima di avviare la tastatura controlla sempre i valori sullo schermo della macchina.');
  assert.match(await page.locator('#sez-guida').innerText(), /non avvia cicli: un valore sbagliato può mandare il tastatore contro l'utensile/);
  assert.doesNotMatch(await page.locator('#sez-dati .nota').first().innerText(), /Tocca una casella/);
  assert.match(await page.locator('#stato-salvataggio').innerText(), /^Salvataggio automatico\.$/);
  // freccia sulle voci apribili, che cambia quando si apre
  const freccia = (sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s), '::before').content, sel);
  const voce = '#sez-guida details:nth-of-type(2) > summary';
  assert.equal(await freccia(voce), '"▶"');
  await page.click(voce);
  assert.equal(await freccia(voce), '"▼"');
  assert.equal(await freccia('#imp-valori > summary'), 'none', 'i riquadri "Cambia" hanno già la loro freccia');
  // sotto la casella solo "In macchina"
  await page.fill('#cella-0-1', '152,5');
  assert.equal(await page.locator('#ant-0-1').innerText(), 'In macchina: 152.5');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();

  // PC, anche con la finestra stretta: la Prova del lettore c'è; la tendina solo con i valori corretti
  for (const l of [1200, 500]) {
    page = await apri(l, { telefono: false });
    assert.equal(await page.locator('#sez-prova').isVisible(), true, 'Prova del lettore sul PC a ' + l);
    assert.match(await page.locator('#sez-guida h2').innerText(), /4\s*Guida/);
    assert.equal(await page.locator('#confronto').isVisible(), false, 'senza valori niente tendina');
    assert.match(await page.locator('#esito-prova').innerText(), /Prima completa e correggi/);
    await page.fill('#cella-0-0', '20');
    await page.fill('#cella-0-1', '15');
    assert.equal(await page.locator('#confronto').isVisible(), true);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  }
});
