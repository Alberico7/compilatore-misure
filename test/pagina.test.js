'use strict';
// Test end-to-end: apre lo strumento nel browser, genera i codici, li fotografa e li decodifica con zxing.
// Il contenuto decodificato deve essere ESATTAMENTE quello atteso (ordine, cifre, separatori CR).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const zxing = require('zxing-wasm/reader');

const PAGINA = pathToFileURL(path.join(__dirname, '..', 'compilatore-misure.html')).href;
const CARTELLA_SCREENSHOT = path.join(__dirname, 'screenshot');

/* ---------- decodifica con zxing (zxing-cpp compilato in WebAssembly, eseguito in locale) ---------- */
zxing.prepareZXingModule({
  overrides: { wasmBinary: fs.readFileSync(path.join(__dirname, '..', 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm')) },
  fireImmediately: true,
});

/* Decodifica l'immagine PNG e restituisce il contenuto ESATTO del codice (byte grezzi, CR compresi). */
async function decodifica(png, formato) {
  const risultati = await zxing.readBarcodes(png, { formats: [formato], tryHarder: true, textMode: 'Plain', maxNumberOfSymbols: 1 });
  const r = risultati.find((x) => x.isValid);
  if (!r) {
    fs.mkdirSync(CARTELLA_SCREENSHOT, { recursive: true });
    const file = path.join(CARTELLA_SCREENSHOT, 'non-decodificato.png');
    fs.writeFileSync(file, png);
    throw new Error('Codice ' + formato + ' non decodificato, immagine salvata in ' + file);
  }
  const contenuto = Buffer.from(r.bytes).toString('latin1');
  assert.equal(r.text, contenuto, 'testo e byte grezzi coincidono');
  return contenuto;
}

const BarcodeFormat = { CODE_128: 'Code128', QR_CODE: 'QRCode' };

/* ---------- dati di prova (generatore deterministico) ---------- */
function casuale(seme) {
  let s = seme;
  return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
}
/* Valori in centesimi -> testo con separatore (virgola o punto) e cifre attese, calcolate in modo indipendente dallo strumento. */
function generaCoppie(n, seme) {
  const r = casuale(seme), coppie = [], attese = [];
  const conSep = (c, sep) => Math.floor(c / 100) + sep + String(c % 100).padStart(2, '0');
  for (let i = 0; i < n; i++) {
    const ang = Math.floor(r() * 36000), alt = Math.floor(r() * 9000) + 1;
    coppie.push([conSep(ang, i % 2 ? ',' : '.'), conSep(alt, i % 3 ? ',' : '.')]);
    attese.push(String(ang), String(alt));
  }
  return { coppie, attese };
}

/* ---------- utilità pagina ---------- */
let browser;
test.before(async () => {
  // sul PC: Microsoft Edge già installato; su GitHub Actions: il Chromium di Playwright
  browser = await chromium.launch(process.env.CI ? {} : { channel: 'msedge' });
  fs.mkdirSync(CARTELLA_SCREENSHOT, { recursive: true });
});
test.after(async () => { await browser.close(); });

/* telefono: viewport 390x844 con tocco, come uno smartphone. */
async function nuovaPagina(larghezza = 1200, { telefono = false } = {}) {
  const ctx = await browser.newContext(telefono
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: larghezza, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(PAGINA);
  page.erroriJs = erroriJs;
  return page;
}

/* Simula l'incolla da Excel (colonne separate da TAB, righe da CRLF) sulla casella Angolo/Altezza indicata. */
async function incollaExcel(page, coppie, riga = 0, col = 0) {
  const testo = coppie.map((c) => c.join('\t')).join('\r\n') + '\r\n';
  await page.evaluate(({ testo, riga, col }) => {
    const el = document.querySelector(`#corpo-tabella input[data-r="${riga}"][data-c="${col}"]`);
    el.focus();
    const dt = new DataTransfer();
    dt.setData('text/plain', testo);
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, { testo, riga, col });
}

async function leggiBarre(page) {
  const celle = page.locator('#uscita-barre .cella-barra');
  const n = await celle.count();
  const letti = [], etichette = [];
  for (let i = 0; i < n; i++) {
    const c = celle.nth(i);
    letti.push(await decodifica(await c.locator('svg').screenshot(), BarcodeFormat.CODE_128));
    etichette.push((await c.locator('.etichetta').innerText()).trim());
  }
  return { letti, etichette };
}

function etichetteAttese(nCoppie) {
  const e = [];
  for (let i = 1; i <= nCoppie; i++) e.push('Angolo ' + i, 'Altezza ' + i);
  return e;
}

/* ---------- test ---------- */
test('20 coppie: un Code 128 per valore, ordine e cifre esatti', async () => {
  const page = await nuovaPagina();
  const { coppie, attese } = generaCoppie(20, 7);
  await incollaExcel(page, coppie);
  const { letti, etichette } = await leggiBarre(page);
  assert.deepEqual(letti, attese);
  assert.deepEqual(etichette, etichetteAttese(20));
  for (const v of letti) assert.match(v, /^\d+$/); // nessun separatore, nessun INVIO nel codice
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('100 coppie: 200 Code 128 decodificati nell\'ordine giusto', async () => {
  const page = await nuovaPagina();
  const { coppie, attese } = generaCoppie(100, 42);
  await incollaExcel(page, coppie);
  assert.equal(await page.locator('#corpo-tabella tr').count(), 100);
  const { letti, etichette } = await leggiBarre(page);
  assert.equal(letti.length, 200);
  assert.deepEqual(letti, attese);
  assert.deepEqual(etichette, etichetteAttese(100));
  await page.context().close();
});

test('QR a blocchi (5/10/20/25 coppie, con e senza INVIO finale): contenuto esatto', async () => {
  const page = await nuovaPagina();
  const { coppie, attese } = generaCoppie(100, 99);
  await incollaExcel(page, coppie);
  await page.click('#tab-qr');
  for (const perBlocco of [5, 10, 20, 25]) {
    for (const invioFinale of [false, true]) {
      await page.selectOption('#coppie-blocco', String(perBlocco));
      await page.setChecked('#invio-finale', invioFinale);
      while (await page.locator('#qr-prec').isEnabled()) await page.click('#qr-prec');
      const nBlocchi = Math.ceil(100 / perBlocco);
      assert.equal(await page.locator('#qr-stato').innerText(), `Blocco 1 di ${nBlocchi}`);
      const tuttiLetti = [];
      for (let b = 0; b < nBlocchi; b++) {
        const testo = await decodifica(await page.locator('#qr-codice svg').screenshot(), BarcodeFormat.QR_CODE);
        const attesoBlocco = attese.slice(b * perBlocco * 2, (b + 1) * perBlocco * 2);
        assert.equal(testo, attesoBlocco.join('\r') + (invioFinale ? '\r' : ''), `blocco ${b + 1}, ${perBlocco} coppie`);
        assert.ok(!testo.includes('\n'), 'nessun LF nel QR');
        assert.match(await page.locator('.info-blocco').innerText(), new RegExp(`campo Angolo ${b * perBlocco + 1}\\.`));
        tuttiLetti.push(...(invioFinale ? testo.slice(0, -1) : testo).split('\r'));
        if (b < nBlocchi - 1) await page.click('#qr-succ');
      }
      assert.ok(await page.locator('#qr-succ').isDisabled());
      assert.deepEqual(tuttiLetti, attese);
    }
  }
  await page.context().close();
});

test('blocco QR incompleto (23 coppie a blocchi da 10)', async () => {
  const page = await nuovaPagina();
  const { coppie, attese } = generaCoppie(23, 5);
  await incollaExcel(page, coppie);
  await page.click('#tab-qr');
  await page.click('#qr-succ');
  await page.click('#qr-succ');
  assert.equal(await page.locator('#qr-stato').innerText(), 'Blocco 3 di 3');
  const testo = await decodifica(await page.locator('#qr-codice svg').screenshot(), BarcodeFormat.QR_CODE);
  assert.equal(testo, attese.slice(40).join('\r'));
  await page.context().close();
});

test('modo "come in macchina", negativi e cifre dispari', async () => {
  const page = await nuovaPagina();
  await page.check('input[name=modo][value=macchina]');
  await incollaExcel(page, [['2000', '1550'], ['-150', '5'], ['123', '0'], ['0050', '99999']]);
  await assert.doesNotReject(page.locator('.messaggio.avviso', { hasText: 'Valori negativi' }).waitFor());
  const { letti } = await leggiBarre(page);
  assert.deepEqual(letti, ['2000', '1550', '-150', '5', '123', '0', '50', '99999']);
  assert.equal(await page.locator('#ant-1-0').innerText(), 'In macchina: -1.50 · negativo!');
  await page.click('#tab-qr');
  const testo = await decodifica(await page.locator('#qr-codice svg').screenshot(), BarcodeFormat.QR_CODE);
  assert.equal(testo, '2000\r1550\r-150\r5\r123\r0\r50\r99999');
  await page.context().close();
});

test('dati non validi: nessun codice, errori segnalati', async () => {
  const page = await nuovaPagina();
  await incollaExcel(page, [['20,00', '15,123'], ['abc', ''], ['10', '5']]);
  assert.equal(await page.locator('#uscita-barre .cella-barra').count(), 0);
  assert.equal(await page.locator('#uscita-barre .vuoto-codici').count(), 1);
  const riep = await page.locator('#riepilogo').innerText();
  assert.match(riep, /3 caselle da correggere/);
  assert.match(riep, /Altezza 1: Troppi decimali/);
  assert.match(riep, /Angolo 2: Valore non numerico/);
  assert.match(riep, /Altezza 2: Casella vuota/);
  // correggo e i codici compaiono
  await page.fill('#corpo-tabella input[data-r="0"][data-c="1"]', '15,12');
  await page.fill('#corpo-tabella input[data-r="1"][data-c="0"]', '7');
  await page.fill('#corpo-tabella input[data-r="1"][data-c="1"]', '7,5');
  const { letti } = await leggiBarre(page);
  assert.deepEqual(letti, ['2000', '1512', '700', '750', '1000', '500']);
  // in modo "come in macchina" i separatori diventano errori, con suggerimento
  await page.check('input[name=modo][value=macchina]');
  assert.match(await page.locator('#riepilogo').innerText(), /scegli "Con separatore"/);
  await page.context().close();
});

test('tastiera: INVIO e frecce come in macchina', async () => {
  const page = await nuovaPagina();
  await page.click('#corpo-tabella input[data-r="0"][data-c="0"]');
  for (const v of ['20,00', '15', '21', '16,5']) {
    await page.keyboard.type(v);
    await page.keyboard.press('Enter');
  }
  const attivo = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  assert.equal(await attivo(), 'Angolo 3');
  await page.keyboard.press('ArrowUp');
  assert.equal(await attivo(), 'Angolo 2');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await attivo(), 'Angolo 4');
  const { letti } = await leggiBarre(page);
  assert.deepEqual(letti, ['2000', '1500', '2100', '1650']);
  // INVIO sull'ultima Altezza aggiunge una riga
  await page.fill('#num-righe', '2');
  await page.dispatchEvent('#num-righe', 'change');
  await page.click('#corpo-tabella input[data-r="1"][data-c="1"]');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 3);
  assert.equal(await attivo(), 'Angolo 3');
  await page.context().close();
});

test('salvataggio automatico e "Svuota tutto" con conferma', async () => {
  const page = await nuovaPagina();
  await page.check('input[name=modo][value=separatore]');
  await page.fill('#dec-alt', '3');
  await page.dispatchEvent('#dec-alt', 'change');
  await incollaExcel(page, [['20,00', '1,234'], ['21,5', '2']]);
  await page.click('#tab-qr');
  await page.reload();
  assert.equal(await page.inputValue('#corpo-tabella input[data-r="0"][data-c="1"]'), '1,234');
  assert.equal(await page.inputValue('#dec-alt'), '3');
  assert.equal(await page.locator('#pannello-qr').isVisible(), true);
  // annullo: resta tutto
  await page.click('#btn-svuota');
  assert.match(await page.locator('#conferma-testo').innerText(), /Cancellare tutti i valori/);
  await page.click('#conferma-no');
  assert.equal(await page.locator('#conferma').isVisible(), false);
  assert.equal(await page.inputValue('#corpo-tabella input[data-r="0"][data-c="0"]'), '20,00');
  // confermo: valori cancellati, impostazioni mantenute
  await page.click('#btn-svuota');
  await page.click('#conferma-si');
  assert.equal(await page.inputValue('#corpo-tabella input[data-r="0"][data-c="0"]'), '');
  await page.reload();
  assert.equal(await page.inputValue('#corpo-tabella input[data-r="0"][data-c="0"]'), '');
  assert.equal(await page.inputValue('#dec-alt'), '3');
  await page.context().close();
});

test('prova del lettore: corretto, INVIO doppio, valori attaccati', async () => {
  const page = await nuovaPagina();
  await incollaExcel(page, [['20,00', '15,50'], ['21,00', '16,00']]);
  const prova = '#prova';
  await page.click(prova);
  await page.keyboard.type('2000\n1550\n2100\n1600\n');
  assert.match(await page.locator('#esito-prova').innerText(), /Tutto corretto: 4 valori su 4/);

  await page.fill(prova, '');
  await page.click(prova);
  await page.keyboard.type('2000\n\n1550\n');
  const t = await page.locator('#esito-prova').innerText();
  assert.match(t, /INVIO doppio dopo il valore n\. 1/);

  await page.fill(prova, '2000155021001600\n');
  assert.match(await page.locator('#esito-prova').innerText(), /Function key emulation/);

  await page.fill(prova, '');
  await page.click(prova);
  await page.keyboard.type('2000');
  await page.keyboard.press('Tab');
  assert.match(await page.locator('#esito-prova').innerText(), /TAB/);
  await page.context().close();
});

test('eliminare righe con valori chiede conferma nella pagina', async () => {
  const page = await nuovaPagina();
  await incollaExcel(page, [['1', '2'], ['3', '4'], ['5', '6']]);
  await page.fill('#num-righe', '1');
  await page.dispatchEvent('#num-righe', 'change');
  assert.match(await page.locator('#conferma-testo').innerText(), /contengono 2 coppie/);
  await page.click('#conferma-no');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 20);
  assert.equal(await page.inputValue('#num-righe'), '20');
  await page.fill('#num-righe', '1');
  await page.dispatchEvent('#num-righe', 'change');
  await page.click('#conferma-si');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 1);
  await page.context().close();
});

/* ---------- tema ---------- */
const tema = (page) => page.evaluate(() => document.documentElement.getAttribute('data-tema'));
const sfondo = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('tema scuro predefinito, cambio tema salvato', async () => {
  const page = await nuovaPagina();
  assert.equal(await tema(page), 'scuro');
  assert.equal(await sfondo(page), 'rgb(20, 23, 28)');
  assert.match(await page.locator('#btn-tema').innerText(), /Tema chiaro/);
  await page.click('#btn-tema');
  assert.equal(await tema(page), 'chiaro');
  assert.equal(await sfondo(page), 'rgb(244, 245, 247)');
  await page.reload();
  assert.equal(await tema(page), 'chiaro');
  await page.click('#btn-tema');
  await page.reload();
  assert.equal(await tema(page), 'scuro');
  // chi ha dati salvati da prima (senza scelta di tema) parte dal tema scuro
  await page.evaluate(() => localStorage.setItem('compilatore-misure-v1', JSON.stringify({ righe: [['20,00', '15,00']], modo: 'separatore' })));
  await page.reload();
  assert.equal(await tema(page), 'scuro');
  assert.equal(await page.inputValue('#cella-0-0'), '20,00');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('codici neri su bianco in entrambi i temi: decodifica esatta', async () => {
  const page = await nuovaPagina();
  const { coppie, attese } = generaCoppie(10, 3);
  await incollaExcel(page, coppie);
  for (const t of ['scuro', 'chiaro']) {
    if ((await tema(page)) !== t) await page.click('#btn-tema');
    const sfondoCornice = await page.locator('.cella-barra .cornice').first().evaluate((e) => getComputedStyle(e).backgroundColor);
    assert.equal(sfondoCornice, 'rgb(255, 255, 255)', 'cornice bianca nel tema ' + t);
    assert.deepEqual((await leggiBarre(page)).letti, attese, 'Code 128 nel tema ' + t);
    await page.click('#tab-qr');
    assert.equal(await decodifica(await page.locator('#qr-codice svg').screenshot(), BarcodeFormat.QR_CODE), attese.join('\r'));
    await page.click('#tab-barre');
  }
  await page.context().close();
});

/* ---------- smartphone ---------- */
async function controllaTelefono(page, nome) {
  const largh = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(largh <= 390, `${nome}: nessuno scorrimento orizzontale (${largh}px)`);
  const piccoli = await page.evaluate(() => [...document.querySelectorAll('button, select, input[type=number], .radio label, summary')]
    .filter((e) => e.offsetParent !== null)
    .map((e) => [e.id || e.textContent.trim().slice(0, 20), e.getBoundingClientRect().height])
    .filter(([, h]) => h < 44));
  assert.deepEqual(piccoli, [], `${nome}: comandi alti almeno 44 px`);
  const font = await page.evaluate(() => Math.min(...[...document.querySelectorAll('#corpo-tabella input, select, textarea, input[type=number]')]
    .map((e) => parseFloat(getComputedStyle(e).fontSize))));
  assert.ok(font >= 16, `${nome}: testo delle caselle almeno 16 px (${font})`);
}

test('smartphone: impaginazione, nessuno scorrimento orizzontale, comandi grandi', async () => {
  const page = await nuovaPagina(390, { telefono: true });
  const { coppie } = generaCoppie(20, 7);
  await incollaExcel(page, coppie);
  await controllaTelefono(page, 'scuro');
  await page.tap('#tab-qr');
  await controllaTelefono(page, 'scuro QR');
  await page.tap('#btn-tema');
  await controllaTelefono(page, 'chiaro QR');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('smartphone: tastierino e barra Indietro / ± / Avanti come INVIO', async () => {
  const page = await nuovaPagina(390, { telefono: true });
  assert.equal(await page.getAttribute('#cella-0-0', 'inputmode'), 'decimal');
  assert.equal(await page.getAttribute('#cella-0-0', 'enterkeyhint'), 'next');
  assert.equal(await page.locator('#barra-mobile').isVisible(), false);
  const attivo = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  await page.tap('#cella-0-0');
  assert.equal(await page.locator('#barra-mobile').isVisible(), true);
  await page.keyboard.type('20,5');
  await page.tap('#mob-avanti');
  assert.equal(await attivo(), 'Altezza 1');
  await page.keyboard.type('3');
  await page.tap('#mob-segno');
  assert.equal(await page.inputValue('#cella-0-1'), '-3');
  assert.equal(await attivo(), 'Altezza 1', 'il ± non toglie il fuoco alla casella');
  await page.tap('#mob-segno');
  assert.equal(await page.inputValue('#cella-0-1'), '3');
  await page.tap('#mob-avanti');
  assert.equal(await attivo(), 'Angolo 2');
  await page.tap('#mob-indietro');
  assert.equal(await attivo(), 'Altezza 1');
  await page.tap('#mob-indietro');
  assert.equal(await attivo(), 'Angolo 1');
  assert.equal(await page.locator('#ant-0-0').innerText(), 'In macchina: 20.50 · cifre: 2050');
  // nel modo "come in macchina" il tastierino è solo numerico
  await page.tap('#modo-macchina');
  assert.equal(await page.getAttribute('#cella-0-0', 'inputmode'), 'numeric');
  assert.equal(await page.locator('#barra-mobile').isVisible(), false, 'barra nascosta fuori dalla tabella');
  await page.context().close();
});

test('smartphone: "Leggi uno alla volta" mostra tutti i codici nell\'ordine giusto', async () => {
  const page = await nuovaPagina(390, { telefono: true });
  const { coppie, attese } = generaCoppie(20, 11);
  await incollaExcel(page, coppie);
  await page.tap('#btn-lettura');
  assert.equal(await page.locator('#lettura').isVisible(), true);
  const etichette = etichetteAttese(20);
  for (let i = 0; i < attese.length; i++) {
    assert.equal(await page.locator('#lettura-avanzamento').innerText(), `${i + 1} di ${attese.length}`);
    assert.equal((await page.locator('#lettura-etichetta').innerText()).trim(), etichette[i]);
    const box = await page.locator('#lettura-codice').boundingBox();
    assert.ok(box.x >= 0 && box.x + box.width <= 390, 'codice dentro lo schermo');
    assert.equal(await decodifica(await page.locator('#lettura-codice svg').screenshot(), BarcodeFormat.CODE_128), attese[i]);
    if (i < attese.length - 1) await page.tap('#lettura-succ');
  }
  assert.equal(await page.locator('#lettura-succ').isDisabled(), true);
  // scorrimento col dito: verso destra torna indietro
  await page.locator('#lettura').evaluate((el) => {
    const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 });
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [t(100)], changedTouches: [t(100)], bubbles: true }));
    el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [t(300)], bubbles: true }));
  });
  assert.equal(await page.locator('#lettura-avanzamento').innerText(), '39 di 40');
  // si riparte da dove si era rimasti
  await page.reload();
  await page.tap('#btn-lettura');
  assert.equal(await page.locator('#lettura-avanzamento').innerText(), '39 di 40');
  await page.tap('#lettura-chiudi');
  assert.equal(await page.locator('#lettura').isVisible(), false);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('smartphone: QR dentro lo schermo e decodifica esatta', async () => {
  const page = await nuovaPagina(390, { telefono: true });
  const { coppie, attese } = generaCoppie(25, 13);
  await incollaExcel(page, coppie);
  await page.tap('#tab-qr');
  await page.selectOption('#coppie-blocco', '25');
  const box = await page.locator('#qr-codice').boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= 390, 'QR dentro lo schermo');
  assert.equal(await decodifica(await page.locator('#qr-codice svg').screenshot(), BarcodeFormat.QR_CODE), attese.join('\r'));
  await page.context().close();
});

test('file locale: stampa disponibile, dettatura nascosta (funziona solo dal sito)', async () => {
  const page = await nuovaPagina();
  assert.equal(await page.locator('#btn-stampa').isVisible(), true);
  assert.equal(await page.locator('#voce').isVisible(), false);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('senza localStorage la pagina funziona lo stesso', async () => {
  const page = await nuovaPagina();
  const html = fs.readFileSync(path.join(__dirname, '..', 'compilatore-misure.html'), 'utf8');
  await page.goto('about:blank'); // qui localStorage non è disponibile
  await page.setContent(html);
  assert.equal(await tema(page), 'scuro');
  assert.match(await page.locator('#stato-salvataggio').innerText(), /non disponibile/);
  const { coppie, attese } = generaCoppie(5, 17);
  await incollaExcel(page, coppie);
  assert.deepEqual((await leggiBarre(page)).letti, attese);
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('screenshot della pagina', async () => {
  const { coppie } = generaCoppie(20, 7);
  const page = await nuovaPagina(1200);
  await incollaExcel(page, coppie);
  await incollaExcel(page, [['-1,50']], 19, 0);
  for (const t of ['scuro', 'chiaro']) {
    if ((await tema(page)) !== t) await page.click('#btn-tema');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(CARTELLA_SCREENSHOT, `pc-${t}-1-inizio.png`) });
    await page.locator('#sez-dati').screenshot({ path: path.join(CARTELLA_SCREENSHOT, `pc-${t}-2-valori.png`) });
    await page.click('#tab-barre');
    await page.locator('#sez-codici').screenshot({ path: path.join(CARTELLA_SCREENSHOT, `pc-${t}-3-codici-barre.png`) });
    await page.click('#tab-qr');
    await page.locator('#sez-codici').screenshot({ path: path.join(CARTELLA_SCREENSHOT, `pc-${t}-4-qr.png`) });
  }
  await page.click('#prova');
  await page.keyboard.type('21494\n\n2694\n');
  await page.locator('#sez-prova').screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'pc-chiaro-5-prova-lettore.png') });
  await page.click('#btn-svuota');
  await page.screenshot({ path: path.join(CARTELLA_SCREENSHOT, 'pc-chiaro-6-conferma.png') });
  await page.click('#conferma-no');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();

  const tel = await nuovaPagina(390, { telefono: true });
  await incollaExcel(tel, coppie);
  for (const t of ['scuro', 'chiaro']) {
    if ((await tema(tel)) !== t) await tel.tap('#btn-tema');
    await tel.evaluate(() => window.scrollTo(0, 0));
    await tel.screenshot({ path: path.join(CARTELLA_SCREENSHOT, `tel-${t}-1-inizio.png`) });
    await tel.tap('#cella-2-0');
    await tel.screenshot({ path: path.join(CARTELLA_SCREENSHOT, `tel-${t}-2-inserimento.png`) });
    await tel.tap('#tab-qr');
    await tel.locator('#sez-codici').scrollIntoViewIfNeeded();
    await tel.screenshot({ path: path.join(CARTELLA_SCREENSHOT, `tel-${t}-3-qr.png`) });
    await tel.tap('#tab-barre');
    await tel.tap('#btn-lettura');
    await tel.screenshot({ path: path.join(CARTELLA_SCREENSHOT, `tel-${t}-4-uno-alla-volta.png`) });
    await tel.tap('#lettura-chiudi');
  }
  assert.deepEqual(tel.erroriJs, []);
  await tel.context().close();
});
