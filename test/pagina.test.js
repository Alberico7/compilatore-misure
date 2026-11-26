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
const { usaDecimali } = require('./aiuti-pagina');

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
    const gra = Math.floor(r() * 36000), dat = Math.floor(r() * 9000) + 1;
    coppie.push([conSep(gra, i % 2 ? ',' : '.'), conSep(dat, i % 3 ? ',' : '.')]);
    attese.push(String(gra), String(dat));
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
/* Questi test riguardano i codici: si parte dalla scheda "Codici a barre" (la predefinita è Chiavetta). */
/* Tastiera finta: la parte visibile dello schermo (visualViewport) si accorcia di 300 px quando "si apre",
   come su Chrome per Android, dove la tastiera copre il fondo della pagina. window.__tastiera(true|false). */
function tastieraFinta() {
  const vv = new EventTarget();
  let alta = 0;
  Object.defineProperties(vv, {
    height: { get: () => window.innerHeight - alta }, width: { get: () => window.innerWidth },
    offsetTop: { get: () => 0 }, offsetLeft: { get: () => 0 }, scale: { get: () => 1 },
  });
  Object.defineProperty(window, 'visualViewport', { get: () => vv, configurable: true });
  window.__tastiera = (aperta) => { alta = aperta ? 300 : 0; vv.dispatchEvent(new Event('resize')); };
}

async function nuovaPagina(larghezza = 1200, { telefono = false, scheda = 'barre', tastiera = false, decimali = [2, 2] } = {}) {
  const ctx = await browser.newContext(telefono
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }
    : { viewport: { width: larghezza, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  if (tastiera) await ctx.addInitScript(tastieraFinta);
  const page = await ctx.newPage();
  const erroriJs = [];
  page.on('pageerror', (e) => erroriJs.push(e.message));
  await page.goto(PAGINA);
  if (decimali) await usaDecimali(page, decimali);
  if (scheda) await page.click('#tab-' + scheda);
  page.erroriJs = erroriJs;
  return page;
}

/* Simula l'incolla da Excel (colonne separate da TAB, righe da CRLF) sulla casella Grado/Dato indicata. */
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

/* Mentre si scrive, la scheda aperta si ridisegna un terzo di secondo dopo l'ultimo tasto
   (docs/2026-11-23-dettatura-non-preparata.md): prima di leggere i codici si aspetta. */
const PAUSA_SEZIONE2 = 450;
async function leggiBarre(page) {
  await page.waitForTimeout(PAUSA_SEZIONE2);
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
  for (let i = 1; i <= nCoppie; i++) e.push('Grado ' + i, 'Dato ' + i);
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
  assert.equal(await page.locator('#corpo-tabella tr').count(), 101, '100 coppie e una riga vuota in fondo');
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
        assert.match(await page.locator('.info-blocco').innerText(), new RegExp(`campo Grado ${b * perBlocco + 1}\\.`));
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
  assert.match(riep, /Dato 1: Troppi decimali/);
  assert.match(riep, /Grado 2: Valore non numerico/);
  assert.match(riep, /Dato 2: Casella vuota/, 'un dato vuoto in mezzo a dati scritti è un errore (docs/2026-11-25-dati-ripetuti.md)');
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

test('cambio dei decimali con i valori scritti: solo la colonna giusta, con messaggio', async () => {
  const page = await nuovaPagina();
  await page.check('input[name=modo][value=separatore]');
  await incollaExcel(page, [['20,55', '15,59'], ['21,5', '16'], ['abc', '17,25']]);
  const cella = (r, c) => page.inputValue(`#corpo-tabella input[data-r="${r}"][data-c="${c}"]`);
  await page.fill('#dec-gra', '1');
  await page.dispatchEvent('#dec-gra', 'change');
  assert.deepEqual([await cella(0, 0), await cella(1, 0), await cella(2, 0)], ['20,5', '21,5', 'abc']);
  assert.deepEqual([await cella(0, 1), await cella(1, 1), await cella(2, 1)], ['15,59', '16', '17,25']);
  assert.match(await page.locator('#riepilogo').innerText(), /Decimali gradi: 1\. Accorciato 1 valore\./);
  // come in macchina: aggiungendo un decimale ai dati si aggiunge lo zero in fondo
  await page.check('input[name=modo][value=macchina]');
  await page.fill('#corpo-tabella input[data-r="0"][data-c="1"]', '1559');
  await page.fill('#corpo-tabella input[data-r="1"][data-c="1"]', '1600');
  await page.fill('#corpo-tabella input[data-r="2"][data-c="1"]', '1725');
  await page.fill('#dec-dat', '3');
  await page.dispatchEvent('#dec-dat', 'change');
  assert.deepEqual([await cella(0, 1), await cella(1, 1), await cella(2, 1)], ['15590', '16000', '17250']);
  assert.match(await page.locator('#riepilogo').innerText(), /Decimali dati: 3\. Aggiunti gli zeri in fondo a 3 valori\./);
  assert.equal(await page.locator('#ant-0-1').innerText(), 'In macchina: 15.590');
  await page.reload();
  assert.equal(await cella(0, 1), '15590');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('pagina più leggera: si disegna solo la scheda aperta, e mentre si scrive dopo una pausa', async () => {
  // docs/2026-11-23-dettatura-non-preparata.md
  const page = await nuovaPagina(1200, { scheda: 'chiavetta' });
  const codici = () => page.locator('#uscita-barre .cella-barra').count();
  await incollaExcel(page, [['20', '15'], ['21', '16']]);
  assert.equal(await codici(), 0, 'scheda Chiavetta aperta: niente codici a barre disegnati');
  assert.equal(await page.locator('#qr-codice svg').count(), 0, 'niente QR disegnato');
  assert.match(await page.locator('#pannello-chiavetta').innerText(), /2 coppie \(4 valori\)/, 'la chiavetta invece sì');
  await page.click('#tab-barre');
  assert.equal(await codici(), 4, 'aperta la scheda: codici subito');
  // un tasto con la scheda aperta: i codici cambiano dopo la pausa, l'anteprima sotto la casella subito
  await page.fill('#cella-0-0', '22');
  assert.match(await page.innerText('#ant-0-0'), /In macchina: 22.00/);
  assert.equal((await leggiBarre(page)).letti[0], '2200');
  // il salvataggio raggruppato si fa subito quando la pagina si nasconde
  await page.fill('#cella-1-0', '23');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const salvato = await page.evaluate(() => JSON.parse(localStorage.getItem('compilatore-misure-v1')).righe[1][0]);
  assert.equal(salvato, '23');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('microfono a linea come Salva e Apri: niente emoji nella pagina', async () => {
  // docs/2026-11-23-simbolo-microfono.md
  const page = await nuovaPagina();
  assert.equal((await page.content()).includes(String.fromCodePoint(0x1F3A4)), false, 'nessuna emoji del microfono');
  for (const id of ['#btn-voce', '#mob-voce']) {
    assert.equal(await page.locator(id + ' svg.icona').count(), 1, id + ' con il disegno');
  }
  assert.equal(await page.getAttribute('#mob-voce', 'aria-label'), 'Detta');
  assert.ok(await page.locator('#sez-guida svg.icona-testo').count() >= 4, 'nella guida il microfono piccolo');
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
  assert.equal(await attivo(), 'Grado 3');
  await page.keyboard.press('ArrowUp');
  assert.equal(await attivo(), 'Grado 2');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await attivo(), 'Grado 4');
  const { letti } = await leggiBarre(page);
  assert.deepEqual(letti, ['2000', '1500', '2100', '1650']);
  // ultima riga completa: sotto ne compare una vuota, e INVIO sull'ultimo Dato ci porta
  for (let r = 2; r < 5; r++) { await page.fill(`#cella-${r}-0`, '1'); await page.fill(`#cella-${r}-1`, '2'); }
  assert.equal(await page.locator('#corpo-tabella tr').count(), 6);
  await page.click('#cella-4-1');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 6);
  assert.equal(await attivo(), 'Grado 6');
  // solo il Dato nell'ultima riga: nessuna riga nuova, INVIO la aggiunge come in macchina
  await page.fill('#cella-5-1', '3');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 6);
  await page.click('#cella-5-1');
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#corpo-tabella tr').count(), 7);
  assert.equal(await attivo(), 'Grado 7');
  await page.context().close();
});

test('salvataggio automatico e "Svuota tutto" con conferma', async () => {
  const page = await nuovaPagina();
  await page.check('input[name=modo][value=separatore]');
  await page.fill('#dec-dat', '3');
  await page.dispatchEvent('#dec-dat', 'change');
  await incollaExcel(page, [['20,00', '1,234'], ['21,5', '2']]);
  await page.click('#tab-qr');
  await page.reload();
  assert.equal(await page.inputValue('#corpo-tabella input[data-r="0"][data-c="1"]'), '1,234');
  assert.equal(await page.inputValue('#dec-dat'), '3');
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
  assert.equal(await page.inputValue('#dec-dat'), '3');
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

test("righe: sempre una vuota in fondo quando l'ultima è completa, fino a 500", async () => {
  // docs/2026-11-23-righe-automatiche.md
  const page = await nuovaPagina();
  const righe = () => page.locator('#corpo-tabella tr').count();
  assert.equal(await page.locator('#num-righe').count(), 0, 'niente casella Righe');
  assert.equal(await righe(), 5);
  // scrivendo a mano: la riga compare al primo tasto del Dato, e il cursore resta nella casella
  await page.click('#cella-4-0');
  await page.keyboard.type('20');
  assert.equal(await righe(), 5, 'solo il Grado: nessuna riga nuova');
  await page.click('#cella-4-1');
  await page.keyboard.type('1');
  assert.equal(await righe(), 6);
  await page.keyboard.type('5,5');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'cella-4-1');
  assert.equal(await page.inputValue('#cella-4-1'), '15,5');
  assert.equal(await page.inputValue('#cella-5-0'), '');
  // incollando: dopo l'ultima coppia resta una riga vuota
  await incollaExcel(page, [['1', '2'], ['3', '4'], ['5', '6'], ['7', '8'], ['9', '10'], ['11', '12'], ['13', '14']]);
  assert.equal(await righe(), 8);
  // Svuota tutto: di nuovo 5 righe vuote
  await page.click('#btn-svuota');
  await page.click('#conferma-si');
  assert.equal(await righe(), 5);
  // al massimo 500 righe
  await incollaExcel(page, Array.from({ length: 500 }, (_, i) => [String(i + 1), '1']));
  assert.equal(await righe(), 500);
  assert.equal(await page.inputValue('#cella-499-0'), '500');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* docs/2026-11-25-dati-ripetuti.md: dei dati si scrive la prima divisione, le caselle vuote la ripetono */
for (const telefono of [false, true]) {
  test('dati ripetuti per divisioni' + (telefono ? ' (telefono)' : ''), async () => {
    const page = await nuovaPagina(1200, { telefono, decimali: [0, 1] });
    await incollaExcel(page, [['0', '12,5'], ['30', '13'], ['60', '14,2'], ['90', ''], ['120', ''], ['150', '']]);
    // il dato riempito: in grigio nella casella vuota e scritto sotto, ↻ dove la divisione ricomincia
    assert.equal(await page.inputValue('#cella-3-1'), '');
    assert.equal(await page.getAttribute('#cella-3-1', 'placeholder'), '12.5');
    assert.equal(await page.innerText('#ant-3-1'), '↻ Divisione 2, 1° dato: 12.5');
    assert.equal(await page.innerText('#ant-4-1'), 'Divisione 2, 2° dato: 13.0');
    assert.equal(await page.getAttribute('#cella-2-1', 'placeholder'), '', 'i dati scritti non hanno il grigio');
    assert.equal(await page.innerText('#ant-2-1'), 'In macchina: 14.2');
    // un dato scritto dopo i vuoti: quelli in mezzo diventano errori, finché non lo si toglie
    await page.fill('#cella-4-1', '9');
    assert.equal(await page.innerText('#ant-3-1'), 'Casella vuota');
    assert.equal(await page.getAttribute('#cella-3-1', 'placeholder'), '');
    await page.fill('#cella-4-1', '');
    assert.equal(await page.innerText('#ant-3-1'), '↻ Divisione 2, 1° dato: 12.5');
    // alla macchina va sempre il valore intero
    assert.deepEqual((await leggiBarre(page)).letti, ['0', '125', '30', '130', '60', '142', '90', '125', '120', '130', '150', '142']);
    assert.match(await page.innerText('#riepilogo-divisioni'), /^2 divisioni da 3 dati: scritta la prima, 3 dati riempiti\.$/);
    // si corregge un dato della prima divisione: cambia in tutte
    await page.fill('#cella-0-1', '11');
    assert.equal(await page.getAttribute('#cella-3-1', 'placeholder'), '11.0');
    assert.equal(await page.innerText('#ant-3-1'), '↻ Divisione 2, 1° dato: 11.0');
    // controllo a spunte: ↻ sui dati riempiti
    await page.click('#btn-verifica');
    assert.equal(await page.locator('#verifica-elenco [data-i="2"] .rip').count(), 0);
    assert.equal(await page.locator('#verifica-elenco [data-i="3"] .rip').count(), 1);
    assert.match(await page.getAttribute('#verifica-elenco [data-i="3"]', 'aria-label'), /dato 11\.0 ripetuto dalla divisione/);
    await page.click('#verifica-chiudi');
    // grado, INVIO, INVIO: si passa al grado dopo e compare la riga nuova; ultima divisione incompleta = errore
    if (!telefono) {
      await page.click('#cella-6-0');
      await page.keyboard.type('180');
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'cella-7-0');
    } else {
      await page.fill('#cella-6-0', '180');
    }
    assert.equal(await page.locator('#corpo-tabella tr').count(), 8);
    assert.match(await page.innerText('#riepilogo'), /1 casella da correggere[\s\S]*Ultima divisione incompleta: 1 dato su 3\. Controlla i gradi e i dati/);
    assert.equal(await page.innerText('#ant-6-1'), 'Ultima divisione incompleta: 1 dato su 3. Controlla i gradi e i dati');
    assert.equal(await page.getAttribute('#cella-6-1', 'placeholder'), '11.0', 'il valore si vede anche con l\'errore');
    await page.waitForTimeout(PAUSA_SEZIONE2);
    assert.equal(await page.locator('#uscita-barre .cella-barra').count(), 0, 'niente codici');
    await page.fill('#cella-7-0', '210');
    assert.match(await page.innerText('#riepilogo'), /2 dati su 3/);
    await page.fill('#cella-8-0', '240');
    const { letti } = await leggiBarre(page);
    assert.equal(letti.length, 18);
    assert.deepEqual(letti.slice(12), ['180', '110', '210', '130', '240', '142']);
    if (telefono) await controllaTelefono(page, 'divisioni');
    // dopo un ricaricamento le caselle restano vuote, con il grigio
    await page.reload();
    assert.equal(await page.inputValue('#cella-5-1'), '');
    assert.equal(await page.getAttribute('#cella-5-1', 'placeholder'), '14.2');
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  });
}

/* ---------- tema ---------- */
const tema = (page) => page.evaluate(() => document.documentElement.getAttribute('data-tema'));
const sfondo = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test('tema scuro predefinito, cambio tema salvato', async () => {
  const page = await nuovaPagina();
  assert.equal(await tema(page), 'scuro');
  assert.equal(await sfondo(page), 'rgb(18, 20, 23)');
  assert.equal(await page.locator('#btn-tema').innerText(), '☀', 'solo l\'icona');
  assert.equal(await page.getAttribute('#btn-tema', 'aria-label'), 'Passa al tema chiaro');
  await page.click('#btn-tema');
  assert.equal(await tema(page), 'chiaro');
  assert.equal(await sfondo(page), 'rgb(236, 235, 229)');
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

test('nome del programma: codice a barre della lista aperta, in cima alla sezione 2', async () => {
  // docs/2026-11-23-codice-da-testo.md
  for (const telefono of [false, true]) {
    const page = await nuovaPagina(1200, { telefono, scheda: telefono ? 'chiavetta' : 'barre' });
    const box = page.locator('#nome-programma');
    const salvaCome = async (nome) => {
      await page.click('#btn-apri');
      await page.click('#lista-salva-come');
      assert.equal(await page.innerText('#nome-lista-testo'), 'Nome del programma (come in macchina)');
      await page.fill('#nome-lista-campo', nome);
      await page.click('#nome-lista-form button[type=submit]');
      await page.click('#btn-apri');
    };
    assert.match(await box.innerText(), /Scrivi il nome del programma sopra la tabella/);
    assert.equal(await box.locator('svg').count(), 0);
    await incollaExcel(page, [['20', '15']]);
    await salvaCome('FRESA-1234');
    assert.equal(await page.locator('#codice-nome svg').count(), 1);
    assert.equal(await decodifica(await page.locator('#codice-nome svg').screenshot(), BarcodeFormat.CODE_128), 'FRESA-1234');
    assert.match(await box.innerText(), /nella pagina del caricatore/);
    assert.match(await box.innerText(), /segni escano giusti/, 'nel nome c\'è il trattino');
    // dentro lo schermo, anche sul telefono
    const b = await page.locator('#codice-nome').boundingBox();
    const largPagina = await page.evaluate(() => document.documentElement.clientWidth);
    assert.ok(b.x >= 0 && b.x + b.width <= largPagina, `codice dentro lo schermo (${Math.round(b.x + b.width)} su ${largPagina})`);
    // si vede con tutte le schede
    for (const s of ['chiavetta', 'qr', 'barre']) {
      await page.click('#tab-' + s);
      assert.equal(await page.locator('#codice-nome').isVisible(), true, 'scheda ' + s);
    }
    // solo lettere e cifre: niente nota sui segni
    await salvaCome('ALBERO7');
    assert.equal(await decodifica(await page.locator('#codice-nome svg').screenshot(), BarcodeFormat.CODE_128), 'ALBERO7');
    assert.doesNotMatch(await box.innerText(), /segni/);
    // lettera accentata: la lista si salva, il codice no
    await salvaCome('Perù 3');
    assert.equal(await page.inputValue('#programma'), 'Perù 3');
    assert.equal(await box.locator('svg').count(), 0);
    assert.match(await box.innerText(), /"ù" non si può mettere in un codice a barre[\s\S]*Cambia il nome sopra la tabella/);
    assert.match(await page.innerText('#avviso-programma'), /"ù" non si può mettere in un codice a barre/);
    // Svuota tutto chiude la lista: il codice sparisce
    await page.click('#btn-svuota');
    await page.click('#conferma-si');
    assert.match(await box.innerText(), /Scrivi il nome del programma/);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  }
});

test('casella Nome del programma e Salva accanto: codice subito, un tocco per salvare', async () => {
  // docs/2026-11-23-casella-nome-programma.md
  const page = await nuovaPagina(1200, { scheda: 'barre' });
  const pulsante = () => page.getAttribute('#btn-salva', 'aria-label');
  const spento = () => page.locator('#btn-salva').isDisabled();
  assert.equal(await page.inputValue('#programma'), '');
  assert.equal(await spento(), true, 'tabella vuota: niente da salvare');
  // il codice compare mentre si scrive, senza salvare
  await page.click('#programma');
  await page.keyboard.type('FRESA-1234');
  assert.equal(await decodifica(await page.locator('#codice-nome svg').screenshot(), BarcodeFormat.CODE_128), 'FRESA-1234');
  await incollaExcel(page, [['20', '15'], ['21', '16']]);
  assert.equal(await pulsante(), 'Salva');
  assert.equal(await spento(), false);
  // un tocco: salvata con il nome della casella, senza domande
  await page.click('#btn-salva');
  assert.equal(await page.locator('#nome-lista').isVisible(), false, 'nessuna domanda');
  assert.equal(await pulsante(), 'Salvata');
  assert.equal(await spento(), true);
  assert.match(await page.innerText('#esito-programma'), /Salvata "FRESA-1234": 2 coppie\./);
  // cambiando un valore o il nome si riaccende
  await page.fill('#cella-0-0', '22');
  assert.equal(await pulsante(), 'Salva');
  await page.click('#btn-salva');
  assert.equal(await pulsante(), 'Salvata');
  await page.fill('#programma', 'FRESA-1235');
  assert.equal(await pulsante(), 'Salva');
  await page.fill('#programma', 'FRESA-1234');
  assert.equal(await pulsante(), 'Salvata', 'di nuovo il nome della lista salvata');
  // un altro nome già usato da un'altra lista: chiede se sostituire
  await page.fill('#programma', 'ALBERO');
  await page.click('#btn-salva');
  assert.equal(await pulsante(), 'Salvata');
  await page.fill('#cella-0-0', '30');
  await page.fill('#programma', 'fresa-1234');
  await page.click('#btn-salva');
  assert.match(await page.locator('#conferma-testo').innerText(), /Esiste già una lista "FRESA-1234"/);
  await page.click('#conferma-no');
  // il nome resta dopo la ricarica
  await page.fill('#programma', 'ALBERO');
  await page.reload();
  assert.equal(await page.inputValue('#programma'), 'ALBERO');
  // casella vuota: Salva chiede il nome, con la casella vuota
  await page.fill('#programma', '');
  await page.click('#btn-salva');
  assert.equal(await page.locator('#nome-lista').isVisible(), true);
  await page.fill('#nome-lista-campo', 'TERZO');
  await page.click('#nome-lista-form button[type=submit]');
  assert.equal(await page.inputValue('#programma'), 'TERZO');
  assert.equal(await pulsante(), 'Salvata');
  // Salva come: propone il nome della casella
  await page.click('#btn-apri');
  await page.click('#lista-salva-come');
  assert.equal(await page.inputValue('#nome-lista-campo'), 'TERZO');
  await page.click('#nome-lista-no');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('affilatura in testa: secondo codice con il nome e ".t"', async () => {
  // docs/2026-11-23-secondo-codice-punto-t.md
  for (const telefono of [false, true]) {
    const page = await nuovaPagina(1200, { telefono, scheda: 'barre' });
    const box = page.locator('#nome-programma');
    const leggi = async (id) => decodifica(await page.locator(id + ' svg').screenshot(), BarcodeFormat.CODE_128);
    await page.fill('#programma', 'FRESA-1234');
    assert.equal(await leggi('#codice-nome'), 'FRESA-1234');
    assert.equal(await leggi('#codice-nome-t'), 'FRESA-1234.t');
    assert.match(await box.innerText(), /Programma[\s\S]*FRESA-1234[\s\S]*Affilatura in testa[\s\S]*FRESA-1234\.t/);
    assert.match(await box.innerText(), /segni escano giusti/, 'il trattino può uscire diverso');
    const largPagina = await page.evaluate(() => document.documentElement.clientWidth);
    for (const id of ['#codice-nome', '#codice-nome-t']) {
      const b = await page.locator(id).boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= largPagina, `${id} dentro lo schermo`);
    }
    // solo lettere, cifre e punto: niente nota sui segni
    await page.fill('#programma', 'ALBERO7');
    assert.equal(await leggi('#codice-nome-t'), 'ALBERO7.t');
    assert.doesNotMatch(await box.innerText(), /segni/);
    // il nome finisce già con ".t": un codice solo
    await page.fill('#programma', 'FRESA.t');
    assert.equal(await leggi('#codice-nome'), 'FRESA.t');
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    // 39 caratteri: il primo c'è, il secondo no
    await page.fill('#programma', 'A'.repeat(39));
    assert.equal(await page.locator('#codice-nome').count(), 1);
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    assert.match(await box.innerText(), /Con "\.t" il nome ha 41 caratteri: nel codice a barre ne stanno al massimo 40\./);
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  }
});

test('affilatura in testa: l\'aggiunta si imposta', async () => {
  // docs/2026-11-24-aggiunta-affilatura-impostabile.md
  for (const telefono of [false, true]) {
    const page = await nuovaPagina(1200, { telefono, scheda: 'barre' });
    const box = page.locator('#nome-programma');
    const leggi = async (id) => decodifica(await page.locator(id + ' svg').screenshot(), BarcodeFormat.CODE_128);
    const aggiunta = async (testo) => {
      if (!await page.locator('#aggiunta-testa').isVisible()) await page.click('#imp-aggiunta > summary');
      await page.fill('#aggiunta-testa', testo);
    };
    // predefinita ".t", riquadro chiuso
    assert.equal(await page.locator('#aggiunta-testa').isVisible(), false);
    assert.match(await page.innerText('#aggiunta-riepilogo'), /affilatura in testa: \.t$/);
    await page.fill('#programma', 'FRESA-1234');
    assert.equal(await leggi('#codice-nome-t'), 'FRESA-1234.t');
    // un'altra aggiunta
    await aggiunta('_T');
    assert.equal(await leggi('#codice-nome-t'), 'FRESA-1234_T');
    assert.match(await page.innerText('#aggiunta-riepilogo'), /: _T$/);
    // il nome finisce già con l'aggiunta (maiuscole o minuscole): un codice solo
    await page.fill('#programma', 'FRESA_t');
    assert.equal(await leggi('#codice-nome'), 'FRESA_t');
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    // vuota: un codice solo, senza messaggi
    await page.fill('#programma', 'ALBERO7');
    await aggiunta('');
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    assert.equal(await box.locator('.messaggio').count(), 0);
    assert.match(await page.innerText('#aggiunta-riepilogo'), /nessuna/);
    assert.match(await box.innerText(), /cursore sul campo del programma, poi leggi il codice\./);
    // carattere non ammesso: avviso sotto la casella, niente secondo codice
    await aggiunta('.è');
    assert.match(await page.innerText('#avviso-aggiunta'), /"è" non si può mettere in un codice a barre/);
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    // un segno nell'aggiunta fa comparire la nota sui segni, anche con un nome di sole lettere e cifre
    await aggiunta('-TESTA');
    assert.equal(await page.innerText('#avviso-aggiunta'), '');
    assert.equal(await leggi('#codice-nome-t'), 'ALBERO7-TESTA');
    assert.match(await box.innerText(), /segni escano giusti/);
    // troppo lungo con l'aggiunta: il primo c'è, al posto del secondo il messaggio
    await page.fill('#programma', 'A'.repeat(36));
    assert.equal(await page.locator('#codice-nome').count(), 1);
    assert.equal(await page.locator('#codice-nome-t').count(), 0);
    assert.match(await box.innerText(), /Con "-TESTA" il nome ha 42 caratteri: nel codice a barre ne stanno al massimo 40\./);
    // dentro lo schermo
    const largPagina = await page.evaluate(() => document.documentElement.clientWidth);
    for (const id of ['#imp-aggiunta', '#aggiunta-testa']) {
      const b = await page.locator(id).boundingBox();
      assert.ok(b.x >= 0 && b.x + b.width <= largPagina, `${id} dentro lo schermo`);
    }
    // resta dopo un ricaricamento
    await page.reload();
    assert.equal(await page.inputValue('#aggiunta-testa'), '-TESTA');
    await page.fill('#programma', 'FRESA');
    assert.equal(await leggi('#codice-nome-t'), 'FRESA-TESTA');
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  }
});

test('affilatura in testa: impostazioni di prima senza aggiunta → ".t"', async () => {
  const page = await nuovaPagina(1200, { scheda: 'barre' });
  await page.evaluate(() => {
    localStorage.setItem('compilatore-misure-v1', JSON.stringify({ righe: [['', '']], modo: 'separatore', decGra: 0, decDat: 1, programma: 'FRESA' }));
  });
  await page.reload();
  assert.equal(await page.inputValue('#aggiunta-testa'), '.t');
  assert.equal(await decodifica(await page.locator('#codice-nome-t svg').screenshot(), BarcodeFormat.CODE_128), 'FRESA.t');
  await page.context().close();
});

test('nome del programma: chi aveva una lista aperta lo trova nella casella', async () => {
  const page = await nuovaPagina(1200, { scheda: 'barre' });
  await page.evaluate(() => {
    localStorage.setItem('compilatore-misure-liste-v1', JSON.stringify([{ nome: 'VECCHIA', righe: [['20', '15']], modo: 'separatore', decGra: 2, decDat: 2, salvata: '2026-11-20T10:00:00.000Z' }]));
    localStorage.setItem('compilatore-misure-v1', JSON.stringify({ righe: [['20', '15'], ['', '']], modo: 'separatore', decGra: 2, decDat: 2, listaNome: 'VECCHIA' }));
  });
  await page.reload();
  assert.equal(await page.inputValue('#programma'), 'VECCHIA');
  assert.equal(await page.getAttribute('#btn-salva', 'aria-label'), 'Salvata');
  assert.equal(await decodifica(await page.locator('#codice-nome svg').screenshot(), BarcodeFormat.CODE_128), 'VECCHIA');
  await page.context().close();
});

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

test('smartphone: un tocco sceglie la casella, due aprono il tastierino; barra Indietro / ± / Avanti come INVIO', async () => {
  const page = await nuovaPagina(390, { telefono: true, tastiera: true });
  const modo = (sel) => page.getAttribute(sel, 'inputmode');
  const fondoBarra = async () => { const b = await page.locator('#barra-mobile').boundingBox(); return Math.round(b.y + b.height); };
  assert.equal(await modo('#cella-0-0'), 'none', 'sul telefono si parte senza tastiera');
  assert.equal(await page.getAttribute('#cella-0-0', 'enterkeyhint'), 'next');
  assert.equal(await page.locator('#barra-mobile').isVisible(), false);
  const attivo = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  // il ± nella barra si accende dalle impostazioni (docs/2026-11-26-tasti-su-giu.md; il riquadro Cambia nei test è aperto)
  await page.tap('#barra-segno');
  // primo tocco: sceglie la casella, la tastiera resta chiusa
  await page.tap('#cella-0-0');
  assert.equal(await attivo(), 'Grado 1');
  assert.equal(await page.locator('#barra-mobile').isVisible(), true);
  assert.equal(await modo('#cella-0-0'), 'none');
  assert.equal(await fondoBarra(), 844);
  // secondo tocco sulla stessa casella: tastiera
  await page.tap('#cella-0-0');
  assert.equal(await modo('#cella-0-0'), 'decimal');
  assert.equal(await attivo(), 'Grado 1');
  await page.evaluate(() => window.__tastiera(true));
  assert.equal(await fondoBarra(), 844 - 300, 'la barra sta sopra la tastiera');
  await page.keyboard.type('20,5');
  await page.tap('#mob-avanti');
  assert.equal(await attivo(), 'Dato 1');
  assert.equal(await modo('#cella-0-1'), 'decimal', 'Avanti lascia la tastiera aperta');
  await page.keyboard.type('3');
  await page.tap('#mob-segno');
  assert.equal(await page.inputValue('#cella-0-1'), '-3');
  assert.equal(await attivo(), 'Dato 1', 'il ± non toglie il fuoco alla casella');
  await page.tap('#mob-segno');
  assert.equal(await page.inputValue('#cella-0-1'), '3');
  await page.tap('#mob-avanti');
  assert.equal(await attivo(), 'Grado 2');
  // tocco su un'altra casella con la tastiera aperta: resta aperta
  await page.tap('#cella-2-1');
  assert.equal(await attivo(), 'Dato 3');
  assert.equal(await modo('#cella-2-1'), 'decimal');
  // tastiera chiusa (tasto Indietro di Android): Avanti e Indietro non la riaprono, la barra torna in fondo
  await page.evaluate(() => window.__tastiera(false));
  assert.equal(await fondoBarra(), 844);
  await page.tap('#mob-indietro');
  assert.equal(await attivo(), 'Grado 3');
  assert.equal(await modo('#cella-2-0'), 'none');
  await page.tap('#mob-indietro');
  assert.equal(await attivo(), 'Dato 2');
  await page.tap('#cella-0-0');
  assert.equal(await attivo(), 'Grado 1');
  assert.equal(await modo('#cella-0-0'), 'none', 'tocco su un\'altra casella con la tastiera chiusa: resta chiusa');
  assert.equal(await page.locator('#ant-0-0').innerText(), 'In macchina: 20.50');
  // nel modo "come in macchina" il tastierino è solo numerico
  await page.tap('#modo-macchina');
  await page.locator('#barra-mobile').waitFor({ state: 'hidden', timeout: 2000 });   // barra nascosta fuori dalla tabella
  await page.tap('#cella-0-0');
  await page.tap('#cella-0-0');
  assert.equal(await modo('#cella-0-0'), 'numeric');
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

/* docs/2026-11-26-tasti-su-giu.md: ▲ ▼ nella barra come le frecce del PC; tutto in una riga, solo frecce. */
test('smartphone: tasti ▲ Su e ▼ Giù nella barra, stessa colonna, tastiera com\'era', async () => {
  const page = await nuovaPagina(390, { telefono: true, tastiera: true });
  const attivo = () => page.evaluate(() => document.activeElement.getAttribute('aria-label'));
  const modo = (sel) => page.getAttribute(sel, 'inputmode');
  await incollaExcel(page, generaCoppie(3, 9).coppie);
  const righe = await page.locator('#corpo-tabella tr').count();
  assert.ok(righe >= 4, 'tre righe scritte più quella vuota in fondo');
  // tastiera chiusa: i tasti non la aprono
  await page.tap('#cella-1-0');
  const nomi = () => page.locator('#barra-mobile button:not([hidden])').evaluateAll((bb) => bb.map((b) => b.getAttribute('aria-label')));
  assert.deepEqual(await nomi(), ['Indietro', 'Su', 'Giù', 'Avanti'], 'di predefinito senza ±');
  assert.equal(await attivo(), 'Grado 2');
  await page.tap('#mob-su');
  assert.equal(await attivo(), 'Grado 1');
  assert.equal(await modo('#cella-0-0'), 'none', 'Su lascia la tastiera chiusa');
  await page.tap('#mob-su');
  assert.equal(await attivo(), 'Grado 1', 'sulla prima riga Su resta lì');
  await page.tap('#mob-giu');
  await page.tap('#mob-giu');
  assert.equal(await attivo(), 'Grado 3');
  assert.equal(await modo('#cella-2-0'), 'none', 'Giù lascia la tastiera chiusa');
  // tastiera aperta: resta aperta; sui dati si resta sui dati
  await page.tap('#cella-2-1');
  await page.tap('#cella-2-1');
  await page.evaluate(() => window.__tastiera(true));
  assert.equal(await modo('#cella-2-1'), 'decimal');
  await page.tap('#mob-su');
  assert.equal(await attivo(), 'Dato 2');
  assert.equal(await modo('#cella-1-1'), 'decimal', 'Su lascia la tastiera aperta');
  // ultima riga: Giù resta lì e non aggiunge righe
  await page.tap('#cella-' + (righe - 1) + '-1');
  await page.tap('#mob-giu');
  assert.equal(await attivo(), 'Dato ' + righe, "sull'ultima riga Giù resta lì");
  assert.equal(await page.locator('#corpo-tabella tr').count(), righe, 'Giù non aggiunge righe');
  // la barra sta nello schermo con e senza microfono e ±, tasti larghi almeno 44 punti; microfono fra ▲ e ▼
  const ordine = { 'false,false': ['Indietro', 'Su', 'Giù', 'Avanti'], 'true,false': ['Indietro', 'Su', 'Detta', 'Giù', 'Avanti'],
    'false,true': ['Cambia segno', 'Indietro', 'Su', 'Giù', 'Avanti'], 'true,true': ['Cambia segno', 'Indietro', 'Su', 'Detta', 'Giù', 'Avanti'] };
  for (const segno of [false, true]) {
    for (const microfono of [false, true]) {
      await page.evaluate(([m, s]) => { document.getElementById('mob-voce').hidden = !m; document.getElementById('mob-segno').hidden = !s; }, [microfono, segno]);
      assert.deepEqual(await nomi(), ordine[microfono + ',' + segno]);
      const scatole = await page.locator('#barra-mobile button:not([hidden])').evaluateAll((bb) => bb.map((b) => b.getBoundingClientRect().toJSON()));
      for (const s of scatole) {
        assert.ok(s.width >= 44, 'tasto largo almeno 44 punti (' + s.width + ')');
        assert.ok(s.left >= 0 && s.right <= 390, 'tasto dentro lo schermo');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, 'nessuno scorrimento orizzontale');
      if (microfono && !segno) {
        const m = scatole[2];
        assert.ok(Math.abs(m.left + m.width / 2 - 195) <= 1, 'microfono al centro della barra');
      }
    }
  }
  assert.deepEqual(page.erroriJs, []);
  await page.context().close();
});

test('smartphone: tasto ± nella barra solo se acceso nelle impostazioni, e si ricorda', async () => {
  const page = await nuovaPagina(390, { telefono: true });
  const segnoVisibile = async () => { await page.tap('#cella-0-0'); return page.locator('#mob-segno').isVisible(); };
  assert.equal(await page.isChecked('#barra-segno'), false);
  assert.equal(await segnoVisibile(), false, 'di predefinito il ± non c\'è');
  await page.tap('#barra-segno');   // il riquadro Cambia nei test è aperto (usaDecimali)
  assert.equal(await segnoVisibile(), true, 'acceso: compare subito');
  await page.reload();
  assert.equal(await page.isChecked('#barra-segno'), true);
  assert.equal(await segnoVisibile(), true, 'dopo un ricaricamento resta');
  // impostazioni di una versione precedente, senza il campo: niente ±
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('compilatore-misure-v1'));
    delete s.barraSegno;
    localStorage.setItem('compilatore-misure-v1', JSON.stringify(s));
  });
  await page.reload();
  assert.equal(await page.isChecked('#barra-segno'), false);
  assert.equal(await segnoVisibile(), false);
  assert.deepEqual(page.erroriJs, []);
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

/* Browser vecchi (docs/2026-11-26-finestre-browser-vecchi.md): Chromium prima dell'87 non conosce "inset",
   e senza le finestre restano in fondo alla pagina. Si usa la forma lunga top/right/bottom/left. */
test('browser vecchi: niente "inset" nel CSS', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'compilatore-misure.html'), 'utf8');
  const css = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('\n');
  assert.ok(css.length > 1000, 'CSS della pagina trovato');
  assert.deepEqual(css.match(/(^|[^-\w])inset\s*:[^;}]*/g) || [], []);
});

for (const telefono of [false, true]) {
  test('finestra di conferma e lettura uno alla volta coprono tutto lo schermo' + (telefono ? ' (telefono)' : ''), async () => {
    const page = await nuovaPagina(1200, { telefono });
    const schermo = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
    const copre = async (sel) => {
      const b = await page.locator(sel).boundingBox();
      assert.deepEqual([b.x, b.y, b.width, b.height], [0, 0, schermo.w, schermo.h], sel + ' copre lo schermo');
    };
    await incollaExcel(page, generaCoppie(3, 5).coppie);
    await page.click('#btn-svuota');
    await copre('#conferma');
    await page.click('#conferma-no');
    await page.click('#btn-lettura');
    await copre('#lettura');
    await page.click('#lettura-chiudi');
    assert.deepEqual(page.erroriJs, []);
    await page.context().close();
  });
}

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
  await usaDecimali(page, [2, 2]);
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
